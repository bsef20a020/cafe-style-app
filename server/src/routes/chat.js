const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const env = require("../config/env");
const requireAuth = require("../middleware/auth");
const validateBody = require("../middleware/validate");
const Order = require("../models/Order");
const Reservation = require("../models/Reservation");
const MenuItem = require("../models/MenuItem");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const asyncHandler = require("../utils/asyncHandler");
const { searchSimilar } = require("../services/vectorStore");
const { getCustomerChatResponse, getAdminChatResponse } = require("../services/groq");

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(20, Math.floor(env.RATE_LIMIT_RPM / 2)),
  standardHeaders: true,
  legacyHeaders: false
});

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000)
      })
    )
    .max(12)
    .optional()
});

function findOrderReference(message) {
  const match = String(message || "").match(/\bNOF-ORD-\d{6}-[A-Z0-9]{6}\b/i);
  return match ? match[0].toUpperCase() : "";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

function tomorrowDateString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function menuItemForChat(item) {
  return {
    id: String(item._id || item.id),
    name: item.name,
    category: item.category,
    price: item.price,
    currency: item.currency || env.ORDER_CURRENCY || "PKR",
    description: item.description,
    tags: Array.isArray(item.tags) ? item.tags : [],
    available: Boolean(item.available),
    featured: Boolean(item.featured)
  };
}

async function buildCustomerContext(message) {
  const [menuMatches, liveMenu, order] = await Promise.all([
    searchSimilar(message, 5).catch((error) => ({
      error: error.message
    })),
    MenuItem.find({ available: true })
      .sort({ featured: -1, category: 1, sortOrder: 1, name: 1 })
      .limit(30)
      .select("name category price currency description tags available featured"),
    findOrderReference(message)
      ? Order.findOne({ reference: findOrderReference(message) }).select(
          "reference status paymentStatus total currency fulfillment items createdAt"
        )
      : null
  ]);

  return {
    cafe: {
      name: "NOFFELO",
      hours: {
        mondayToSaturday: "8am-11pm",
        sunday: "10am-10pm"
      },
      deliveryRadius: "5km",
      phone: env.WHATSAPP_NUMBER,
      policies: {
        reservations: "Guests can cancel or modify a reservation with their reference number and matching phone.",
        refunds: "Refunds are reviewed by staff based on order/payment status.",
        capacity: `Reservations support 1 to 20 guests per request, with up to ${env.RESERVATION_SLOT_CAPACITY} guests per 30-minute slot.`
      }
    },
    menuMatches: Array.isArray(menuMatches) ? menuMatches : [],
    availableMenu: liveMenu.map(menuItemForChat),
    menuSearchError: Array.isArray(menuMatches) ? "" : menuMatches.error,
    menuGuidance:
      Array.isArray(menuMatches) && menuMatches.length
        ? "Use menuMatches first, then availableMenu for extra real options."
        : "Vector menu search returned no matches. Use availableMenu only; do not invent menu items or prices.",
    order:
      order && {
        reference: order.reference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        currency: order.currency,
        fulfillment: order.fulfillment,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        })),
        createdAt: order.createdAt
      },
    reservationHelp: {
      requiredFields: ["date", "time", "guests", "name", "phone"],
      bookingEndpoint: "POST /api/reservations",
      note: "If the guest wants to book, collect missing fields and guide them to submit the reservation."
    }
  };
}

async function buildAdminContext() {
  const today = startOfToday();
  const week = startOfWeek();
  const tomorrow = tomorrowDateString();

  const [
    todayOrders,
    todayRevenue,
    weekRevenue,
    pendingOrders,
    tomorrowReservations,
    popularItems,
    availableMenuItems,
    recentEvents
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: week } } }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
    Order.find({ status: { $in: ["new", "accepted", "preparing"] } })
      .sort({ createdAt: 1 })
      .limit(10)
      .select("reference status total currency createdAt items"),
    Reservation.find({ date: tomorrow }).sort({ time: 1 }).limit(50).select("reference name time guests status"),
    Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]),
    MenuItem.countDocuments({ available: true }),
    AnalyticsEvent.find().sort({ createdAt: -1 }).limit(8).select("type path metadata createdAt")
  ]);

  return {
    generatedAt: new Date().toISOString(),
    today: {
      orders: todayOrders,
      revenue: todayRevenue[0]?.revenue || 0
    },
    thisWeek: {
      revenue: weekRevenue[0]?.revenue || 0
    },
    pendingOrders: pendingOrders.map((order) => ({
      reference: order.reference,
      status: order.status,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity }))
    })),
    tomorrowReservations,
    popularItems,
    availableMenuItems,
    recentEvents
  };
}

router.post(
  "/customer",
  chatLimiter,
  validateBody(messageSchema),
  asyncHandler(async (req, res) => {
    const context = await buildCustomerContext(req.body.message);
    const response = await getCustomerChatResponse({
      message: req.body.message,
      history: req.body.history || [],
      context
    });

    res.json({
      ok: true,
      data: {
        reply: response.content,
        model: response.model,
        configured: response.configured,
        context: {
          menuMatches: context.menuMatches,
          availableMenu: context.availableMenu,
          order: context.order || null
        }
      }
    });
  })
);

router.post(
  "/admin",
  chatLimiter,
  requireAuth,
  validateBody(messageSchema),
  asyncHandler(async (req, res) => {
    const context = await buildAdminContext();
    const response = await getAdminChatResponse({
      message: req.body.message,
      history: req.body.history || [],
      context
    });

    res.json({
      ok: true,
      data: {
        reply: response.content,
        model: response.model,
        configured: response.configured,
        context
      }
    });
  })
);

module.exports = router;
