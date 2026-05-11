const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const env = require("../config/env");
const validateBody = require("../middleware/validate");
const { attachCustomerIfPresent } = require("../middleware/customerAuth");
const asyncHandler = require("../utils/asyncHandler");
const generateOrderReference = require("../utils/generateOrderReference");
const stripeCheckout = require("../services/stripeCheckout");

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(8, Math.floor(env.RATE_LIMIT_RPM / 4)),
  standardHeaders: true,
  legacyHeaders: false
});

const orderItemSchema = z.object({
  menuItemId: z.string().trim().regex(/^[a-f\d]{24}$/i, "Choose a valid menu item."),
  quantity: z.coerce.number().int().min(1).max(20),
  note: z.string().trim().max(160).optional().or(z.literal(""))
});

const orderSchema = z
  .object({
    customer: z.object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().trim().min(7).max(24),
      email: z.string().trim().email().optional().or(z.literal(""))
    }),
    fulfillment: z.object({
      type: z.enum(["pickup", "delivery"]),
      address: z.string().trim().max(220).optional().or(z.literal("")),
      requestedDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      requestedTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
      instructions: z.string().trim().max(360).optional().or(z.literal(""))
    }),
    paymentMethod: z.enum(["cod", "card"]),
    items: z.array(orderItemSchema).min(1).max(40),
    source: z.string().trim().max(40).optional()
  })
  .superRefine((value, ctx) => {
    if (value.fulfillment.type === "delivery" && !value.fulfillment.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillment", "address"],
        message: "Delivery address is required."
      });
    }

    if (value.paymentMethod === "card" && !value.customer.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer", "email"],
        message: "Email is required for online card payment."
      });
    }
  });

function mergeRequestedItems(items) {
  const merged = new Map();

  items.forEach((item) => {
    const existing = merged.get(item.menuItemId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.note = [existing.note, item.note].filter(Boolean).join("; ").slice(0, 160);
      return;
    }
    merged.set(item.menuItemId, { ...item });
  });

  return Array.from(merged.values());
}

async function buildOrderItems(requestedItems) {
  const merged = mergeRequestedItems(requestedItems);
  const ids = merged.map((item) => item.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: ids }, available: true });
  const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));

  if (menuItems.length !== ids.length) {
    const error = new Error("Some items are unavailable. Please refresh the menu and try again.");
    error.status = 400;
    error.details = { items: ["Some items are unavailable. Please refresh the menu and try again."] };
    throw error;
  }

  return merged.map((requested) => {
    const menuItem = menuById.get(requested.menuItemId);
    const unitPrice = Number(menuItem.price || 0);
    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      category: menuItem.category,
      quantity: requested.quantity,
      unitPrice,
      lineTotal: unitPrice * requested.quantity,
      currency: menuItem.currency || env.ORDER_CURRENCY,
      note: requested.note || ""
    };
  });
}

function orderPaymentPayload(order, checkoutSession, stripeConfigured) {
  return {
    method: order.paymentMethod,
    status: order.paymentStatus,
    provider: order.paymentProvider,
    configured: order.paymentMethod === "card" ? stripeConfigured : true,
    checkoutUrl: checkoutSession?.url || "",
    message:
      order.paymentMethod === "card" && !checkoutSession?.url
        ? "Online card gateway is not configured yet. The order is saved as card payment pending."
        : ""
  };
}

router.post(
  "/",
  orderLimiter,
  attachCustomerIfPresent,
  validateBody(orderSchema),
  asyncHandler(async (req, res) => {
    const items = await buildOrderItems(req.body.items);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const deliveryFee = 0;
    const paymentMethod = req.body.paymentMethod;
    const order = await Order.create({
      reference: generateOrderReference(),
      customerUser: req.customerUser?._id,
      customer: req.body.customer,
      fulfillment: req.body.fulfillment,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: env.ORDER_CURRENCY,
      paymentMethod,
      paymentProvider: paymentMethod === "card" ? "stripe" : "none",
      paymentStatus: paymentMethod === "card" ? "pending" : "unpaid",
      source: req.body.source || "website"
    });

    let checkoutSession = null;
    if (paymentMethod === "card" && stripeCheckout.isConfigured()) {
      checkoutSession = await stripeCheckout.createCheckoutSession(order);
      order.paymentReference = checkoutSession.id;
      await order.save();
    }

    await AnalyticsEvent.create({
      type: "order_created",
      path: "/menu",
      metadata: {
        orderId: order._id,
        reference: order.reference,
        total: order.total,
        paymentMethod: order.paymentMethod
      }
    });

    res.status(201).json({
      ok: true,
      data: {
        order,
        payment: orderPaymentPayload(order, checkoutSession, stripeCheckout.isConfigured())
      }
    });
  })
);

router.get(
  "/:reference",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }

    res.json({ ok: true, data: { order } });
  })
);

router.post(
  "/:reference/refresh-payment",
  orderLimiter,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }

    if (order.paymentProvider === "stripe" && order.paymentReference && stripeCheckout.isConfigured()) {
      const session = await stripeCheckout.retrieveCheckoutSession(order.paymentReference);
      if (session?.payment_status === "paid") {
        order.paymentStatus = "paid";
      } else if (session?.status === "expired") {
        order.paymentStatus = "failed";
      }
      await order.save();
    }

    res.json({ ok: true, data: { order } });
  })
);

module.exports = router;
