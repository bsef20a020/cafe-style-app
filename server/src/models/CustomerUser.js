const mongoose = require("mongoose");

const customerUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profileImage: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

customerUserSchema.index({ resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 });

module.exports = mongoose.model("CustomerUser", customerUserSchema);
