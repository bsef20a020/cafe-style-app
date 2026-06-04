const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR", trim: true },
    note: { type: String, trim: true }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    field: { type: String, enum: ["status", "paymentStatus"], required: true },
    from: { type: String, trim: true },
    to: { type: String, required: true, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    changedByName: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerUser" },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true }
    },
    fulfillment: {
      type: { type: String, enum: ["pickup", "delivery"], default: "pickup" },
      address: { type: String, trim: true },
      requestedDate: { type: String, trim: true },
      requestedTime: { type: String, trim: true },
      instructions: { type: String, trim: true }
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR", trim: true },
    status: {
      type: String,
      enum: ["new", "accepted", "preparing", "ready", "completed", "cancelled"],
      default: "new"
    },
    paymentMethod: { type: String, enum: ["cod", "card"], required: true },
    paymentProvider: { type: String, enum: ["none", "stripe"], default: "none" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid"
    },
    paymentReference: { type: String, trim: true },
    statusHistory: [statusHistorySchema],
    source: { type: String, default: "website", trim: true }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ customerUser: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
