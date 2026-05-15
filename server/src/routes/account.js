const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");
const Reservation = require("../models/Reservation");
const CustomerUser = require("../models/CustomerUser");
const asyncHandler = require("../utils/asyncHandler");
const { requireCustomerAuth } = require("../middleware/customerAuth");
const validateBody = require("../middleware/validate");

const router = express.Router();

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(24),
  profileImage: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
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
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Profile photo must start with http:// or https://." });
      }
    })
});

function customerResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage || ""
  };
}

router.use(requireCustomerAuth);

router.patch(
  "/profile",
  validateBody(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await CustomerUser.findByIdAndUpdate(
      req.customerUser._id,
      {
        name: req.body.name,
        phone: req.body.phone,
        profileImage: req.body.profileImage || ""
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ ok: false, error: "customer_not_found" });
    }

    res.json({ ok: true, data: { user: customerResponse(user) } });
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ customerUser: req.customerUser._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, data: { orders } });
  })
);

router.get(
  "/reservations",
  asyncHandler(async (req, res) => {
    const reservations = await Reservation.find({ customerUser: req.customerUser._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, data: { reservations } });
  })
);

module.exports = router;
