const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const Reservation = require("../models/Reservation");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const env = require("../config/env");
const validateBody = require("../middleware/validate");
const { attachCustomerIfPresent } = require("../middleware/customerAuth");
const asyncHandler = require("../utils/asyncHandler");
const generateReservationReference = require("../utils/generateReservationReference");

const router = express.Router();

const reservationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(10, Math.floor(env.RATE_LIMIT_RPM / 3)),
  standardHeaders: true,
  legacyHeaders: false
});

const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 23 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const CAFE_TIMEZONE_OFFSET = "+05:00";
const ACTIVE_SLOT_STATUSES = ["new", "confirmed", "seated"];

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isBusinessSlot(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const minutes = minutesFromTime(value);
  return (
    minutes >= OPEN_MINUTES &&
    minutes < CLOSE_MINUTES &&
    (minutes - OPEN_MINUTES) % SLOT_INTERVAL_MINUTES === 0
  );
}

function reservationDateTime(date, time) {
  return new Date(`${date}T${time}:00${CAFE_TIMEZONE_OFFSET}`);
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function phonesMatch(left, right) {
  return normalizePhone(left) === normalizePhone(right);
}

function slotCapacityError(remainingGuests) {
  const error = new Error("reservation_slot_full");
  error.status = 409;
  error.details = {
    time: [
      remainingGuests > 0
        ? `This slot only has room for ${remainingGuests} more guest${remainingGuests === 1 ? "" : "s"}. Choose another time or reduce guests.`
        : "This slot is fully booked. Choose another time."
    ]
  };
  return error;
}

async function reservedGuestsForSlot({ date, time, excludeReservationId }) {
  const match = {
    date,
    time,
    status: { $in: ACTIVE_SLOT_STATUSES }
  };

  if (excludeReservationId) {
    match._id = { $ne: excludeReservationId };
  }

  const [slot] = await Reservation.aggregate([
    { $match: match },
    { $group: { _id: null, guests: { $sum: "$guests" } } }
  ]);

  return slot?.guests || 0;
}

async function assertSlotHasCapacity({ date, time, guests, excludeReservationId }) {
  const reservedGuests = await reservedGuestsForSlot({ date, time, excludeReservationId });
  const remainingGuests = Math.max(0, env.RESERVATION_SLOT_CAPACITY - reservedGuests);

  if (guests > remainingGuests) {
    throw slotCapacityError(remainingGuests);
  }
}

const reservationSchemaBase = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().email().optional().or(z.literal("")),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Choose a valid time."),
  guests: z.coerce.number().int().min(1).max(20),
  occasion: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.string().trim().max(40).optional(),
  verificationPhone: z.string().trim().min(7).max(24).optional()
});

const reservationAccessSchema = z.object({
  phone: z.string().trim().min(7).max(24)
});

const reservationSchema = reservationSchemaBase.superRefine((value, ctx) => {
  if (!isBusinessSlot(value.time)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["time"],
      message: "Choose a reservation slot between 09:00 and 22:30."
    });
    return;
  }

  const requestedAt = reservationDateTime(value.date, value.time);
  if (Number.isNaN(requestedAt.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date"],
      message: "Choose a valid reservation date."
    });
    return;
  }

  if (requestedAt.getTime() <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date"],
      message: "Choose a future reservation date and time."
    });
  }
});

router.post(
  "/",
  reservationLimiter,
  attachCustomerIfPresent,
  validateBody(reservationSchema),
  asyncHandler(async (req, res) => {
    const { verificationPhone: _verificationPhone, ...reservationBody } = req.body;
    await assertSlotHasCapacity(reservationBody);

    const reservation = await Reservation.create({
      ...reservationBody,
      customerUser: req.customerUser?._id,
      reference: generateReservationReference()
    });

    await AnalyticsEvent.create({
      type: "reservation_created",
      path: "/reserve",
      metadata: {
        reservationId: reservation._id,
        guests: reservation.guests,
        date: reservation.date
      }
    });

    res.status(201).json({
      ok: true,
      data: {
        reservation,
        whatsappNumber: env.WHATSAPP_NUMBER
      }
    });
  })
);

router.patch(
  "/:reference/cancel",
  reservationLimiter,
  validateBody(reservationAccessSchema),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findOne({ reference: req.params.reference, status: { $ne: "cancelled" } });
    if (!reservation) {
      return res.status(404).json({ ok: false, error: "reservation_not_found" });
    }

    if (!phonesMatch(reservation.phone, req.body.phone)) {
      return res.status(403).json({
        ok: false,
        error: "reservation_verification_failed",
        details: {
          phone: ["Phone number does not match this reservation."]
        }
      });
    }

    reservation.status = "cancelled";
    await reservation.save();

    await AnalyticsEvent.create({
      type: "reservation_cancelled",
      path: "/reserve",
      metadata: {
        reservationId: reservation._id,
        reference: reservation.reference
      }
    });

    res.json({
      ok: true,
      data: { reservation }
    });
  })
);

router.patch(
  "/:reference",
  reservationLimiter,
  validateBody(reservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findOne({ reference: req.params.reference, status: { $ne: "cancelled" } });
    if (!reservation) {
      return res.status(404).json({ ok: false, error: "reservation_not_found" });
    }

    const { verificationPhone, ...updateBody } = req.body;
    if (!phonesMatch(reservation.phone, verificationPhone || updateBody.phone)) {
      return res.status(403).json({
        ok: false,
        error: "reservation_verification_failed",
        details: {
          phone: ["Phone number does not match this reservation."]
        }
      });
    }

    await assertSlotHasCapacity({
      ...updateBody,
      excludeReservationId: reservation._id
    });

    Object.assign(reservation, updateBody, { status: "new" });
    await reservation.save();

    await AnalyticsEvent.create({
      type: "reservation_modified",
      path: "/reserve",
      metadata: {
        reservationId: reservation._id,
        reference: reservation.reference,
        guests: reservation.guests,
        date: reservation.date
      }
    });

    res.json({
      ok: true,
      data: {
        reservation,
        whatsappNumber: env.WHATSAPP_NUMBER
      }
    });
  })
);

module.exports = router;
