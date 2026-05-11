const express = require("express");
const Order = require("../models/Order");
const Reservation = require("../models/Reservation");
const asyncHandler = require("../utils/asyncHandler");
const { requireCustomerAuth } = require("../middleware/customerAuth");

const router = express.Router();

router.use(requireCustomerAuth);

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
