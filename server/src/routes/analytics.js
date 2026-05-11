const express = require("express");
const { z } = require("zod");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const validateBody = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const eventSchema = z.object({
  type: z.string().trim().min(2).max(80),
  path: z.string().trim().max(200).optional(),
  metadata: z.record(z.any()).optional()
});

router.post(
  "/",
  validateBody(eventSchema),
  asyncHandler(async (req, res) => {
    await AnalyticsEvent.create(req.body);
    res.status(201).json({ ok: true });
  })
);

module.exports = router;
