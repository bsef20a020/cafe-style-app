const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR", trim: true },
    tags: [{ type: String, trim: true }],
    image: { type: String, trim: true },
    alt: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1, sortOrder: 1 });

module.exports = mongoose.model("MenuItem", menuItemSchema);
