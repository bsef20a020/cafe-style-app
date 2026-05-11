const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    path: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
