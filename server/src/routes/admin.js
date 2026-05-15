const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const AdminUser = require("../models/AdminUser");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const Reservation = require("../models/Reservation");
const env = require("../config/env");
const validateBody = require("../middleware/validate");
const requireAuth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const slugify = require("../utils/slugify");
const { syncFromMongoDB } = require("../services/vectorStore");

const router = express.Router();
const ADMIN_COOKIE_NAME = "noffelo_admin_session";
const ADMIN_COOKIE_PATH = "/api";

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(120)
});

const statusSchema = z.object({
  status: z.enum(["new", "confirmed", "seated", "completed", "cancelled"])
});

const orderUpdateSchema = z.object({
  status: z.enum(["new", "accepted", "preparing", "ready", "completed", "cancelled"]).optional(),
  paymentStatus: z.enum(["unpaid", "pending", "paid", "failed", "refunded"]).optional()
});

function isUnsplashPageUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return (hostname === "unsplash.com" || hostname === "www.unsplash.com") && parsed.pathname.startsWith("/photos/");
  } catch (_error) {
    return false;
  }
}

const imageUrlSchema = z
  .string()
  .trim()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;

    let parsed;
    try {
      parsed = new URL(value);
    } catch (_error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid image URL." });
      return;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image URL must start with http:// or https://." });
      return;
    }

    if (isUnsplashPageUrl(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a direct image URL such as images.unsplash.com, not an Unsplash photo page."
      });
    }
  });

const menuSchema = z.object({
  name: z.string().trim().min(2).max(90),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().min(4).max(240),
  price: z.coerce.number().min(0),
  currency: z.string().trim().min(2).max(8).optional(),
  tags: z.array(z.string().trim().max(24)).optional(),
  image: imageUrlSchema,
  alt: z.string().trim().max(120).optional().or(z.literal("")),
  featured: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional()
});

function signAdminToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

function tokenExpiry(token) {
  const decoded = jwt.decode(token);
  return decoded?.exp ? decoded.exp * 1000 : Date.now() + 12 * 60 * 60 * 1000;
}

function setAdminCookie(res, token) {
  const expiresAt = tokenExpiry(token);
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    expires: new Date(expiresAt)
  });
  return expiresAt;
}

function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH
  });
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/admin"
  });
}

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await AdminUser.findOne({ email: req.body.email.toLowerCase() });
    const valid = user ? await bcrypt.compare(req.body.password, user.passwordHash) : false;

    if (!valid) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    await AnalyticsEvent.create({
      type: "admin_login",
      path: "/admin/login",
      metadata: { adminId: user._id }
    });

    const token = signAdminToken(user);
    const expiresAt = setAdminCookie(res, token);

    res.json({
      ok: true,
      data: {
        expiresAt,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  })
);

router.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.use(requireAuth);

router.get("/me", (req, res) => {
  res.json({
    ok: true,
    data: {
      user: req.user,
      expiresAt: req.auth?.exp ? req.auth.exp * 1000 : null
    }
  });
});

router.post(
  "/sync-vectors",
  asyncHandler(async (_req, res) => {
    const result = await syncFromMongoDB();
    res.json({
      synced: result.synced,
      message: result.message
    });
  })
);

router.get(
  "/reservations",
  asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    const reservations = await Reservation.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, data: { reservations } });
  })
);

router.patch(
  "/reservations/:id",
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({ ok: false, error: "reservation_not_found" });
    }

    res.json({ ok: true, data: { reservation } });
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, data: { orders } });
  })
);

router.patch(
  "/orders/:id",
  validateBody(orderUpdateSchema),
  asyncHandler(async (req, res) => {
    if (!req.body.status && !req.body.paymentStatus) {
      return res.status(400).json({
        ok: false,
        error: "validation_error",
        details: { status: ["Choose an order or payment status to update."] }
      });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!order) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }

    res.json({ ok: true, data: { order } });
  })
);

router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const [reservationCount, menuCount, availableMenuCount, statusGroups, recentEvents] =
      await Promise.all([
        Reservation.countDocuments(),
        MenuItem.countDocuments(),
        MenuItem.countDocuments({ available: true }),
        Reservation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        AnalyticsEvent.find().sort({ createdAt: -1 }).limit(12)
      ]);

    const reservationsByStatus = statusGroups.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      ok: true,
      data: {
        totals: {
          reservations: reservationCount,
          menuItems: menuCount,
          availableMenuItems: availableMenuCount,
          pendingReservations: reservationsByStatus.new || 0
        },
        reservationsByStatus,
        recentEvents
      }
    });
  })
);

router.get(
  "/menu",
  asyncHandler(async (_req, res) => {
    const items = await MenuItem.find().sort({ category: 1, sortOrder: 1, name: 1 });
    res.json({ ok: true, data: { items } });
  })
);

router.post(
  "/menu",
  validateBody(menuSchema),
  asyncHandler(async (req, res) => {
    const item = await MenuItem.create({
      ...req.body,
      currency: req.body.currency || "PKR",
      slug: slugify(req.body.name)
    });
    res.status(201).json({ ok: true, data: { item } });
  })
);

router.patch(
  "/menu/:id",
  validateBody(menuSchema.partial()),
  asyncHandler(async (req, res) => {
    const update = { ...req.body };
    if (update.name) {
      update.slug = slugify(update.name);
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!item) {
      return res.status(404).json({ ok: false, error: "menu_item_not_found" });
    }

    res.json({ ok: true, data: { item } });
  })
);

router.delete(
  "/menu/:id",
  asyncHandler(async (req, res) => {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, error: "menu_item_not_found" });
    }

    res.json({ ok: true, data: { item } });
  })
);

module.exports = router;
