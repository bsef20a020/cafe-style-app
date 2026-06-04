const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    field: { type: String, enum: ["status"], default: "status" },
    from: { type: String, trim: true },
    to: { type: String, required: true, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    changedByName: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerUser" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    guests: { type: Number, required: true, min: 1, max: 20 },
    occasion: { type: String, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "confirmed", "seated", "completed", "cancelled"],
      default: "new"
    },
    statusHistory: [statusHistorySchema],
    source: { type: String, default: "website", trim: true }
  },
  { timestamps: true }
);

reservationSchema.index({ status: 1, createdAt: -1 });
reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ customerUser: 1, createdAt: -1 });

module.exports = mongoose.model("Reservation", reservationSchema);
