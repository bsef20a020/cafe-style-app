const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const env = require("../config/env");
const AdminUser = require("../models/AdminUser");
const MenuItem = require("../models/MenuItem");
const defaultMenu = require("../data/defaultMenu");
const slugify = require("../utils/slugify");

const rootMenuPath = path.resolve(__dirname, "../../../menu-data.json");

function priceToNumber(price) {
  const value = String(price || "").replace(/[^\d.]/g, "");
  return Number(value || 0);
}

function inferCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes("matcha")) return "Matcha";
  if (lower.includes("tea")) return "Tea";
  if (lower.includes("croissant")) return "Bakery";
  if (lower.includes("cake")) return "Dessert";
  return "Coffee";
}

function loadMenuItems() {
  const raw = fs.existsSync(rootMenuPath)
    ? JSON.parse(fs.readFileSync(rootMenuPath, "utf8")).items
    : defaultMenu;

  const existingItems = raw.map((item, index) => ({
    name: item.name,
    slug: slugify(item.name),
    category: inferCategory(item.name),
    description: item.desc,
    price: priceToNumber(item.price),
    currency: "PKR",
    tags: item.desc.split("•").map((tag) => tag.trim()).filter(Boolean),
    image: item.image,
    alt: item.alt,
    featured: index < 3,
    available: true,
    sortOrder: index + 1
  }));

  const additions = [
    {
      name: "Saffron Cream Cold Brew",
      category: "Signature",
      description: "slow steeped coffee, saffron cream, citrus finish",
      price: 890,
      tags: ["cold brew", "signature", "premium"],
      image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1600&q=80",
      alt: "Cold brew coffee with cream",
      featured: true,
      available: true,
      sortOrder: 7
    },
    {
      name: "Pistachio Rose Affogato",
      category: "Dessert",
      description: "espresso, vanilla gelato, pistachio crumb, rose",
      price: 940,
      tags: ["dessert", "espresso", "lounge"],
      image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1600&q=80",
      alt: "Affogato dessert",
      featured: true,
      available: true,
      sortOrder: 8
    },
    {
      name: "Truffle Mushroom Toast",
      category: "All Day",
      description: "sourdough, herbed mushrooms, labneh, truffle oil",
      price: 1250,
      tags: ["savory", "brunch", "vegetarian"],
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=80",
      alt: "Toast topped with mushrooms",
      featured: false,
      available: true,
      sortOrder: 9
    }
  ].map((item) => ({
    ...item,
    slug: slugify(item.name),
    currency: "PKR"
  }));

  return [...existingItems, ...additions];
}

async function seed() {
  await connectDB();

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await AdminUser.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    {
      name: "NOFFELO Admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: "owner"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const existingMenuItems = await MenuItem.countDocuments();
  if (!existingMenuItems) {
    await MenuItem.insertMany(loadMenuItems());
  }

  console.log("Seed complete");
  console.log(`Admin email: ${env.ADMIN_EMAIL}`);
  console.log("Admin password: use ADMIN_PASSWORD from your environment");

  await mongoose.connection.close();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
