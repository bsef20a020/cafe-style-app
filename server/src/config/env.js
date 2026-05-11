const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const splitList = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || process.env.NOFFELO_PORT || 5000),
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/noffelo",
  JWT_SECRET:
    process.env.JWT_SECRET ||
    process.env.NOFFELO_ADMIN_SESSION_SECRET ||
    "change-this-development-jwt-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  CUSTOMER_JWT_SECRET:
    process.env.CUSTOMER_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "change-this-development-customer-jwt-secret",
  CUSTOMER_JWT_EXPIRES_IN: process.env.CUSTOMER_JWT_EXPIRES_IN || "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@noffelo.local",
  ADMIN_PASSWORD:
    process.env.ADMIN_PASSWORD ||
    process.env.NOFFELO_ADMIN_PASSWORD ||
    "Admin@12345",
  CLIENT_ORIGINS: splitList(
    process.env.CLIENT_ORIGINS || process.env.NOFFELO_CORS_ORIGINS,
    "http://localhost:5173,http://127.0.0.1:5173"
  ),
  WHATSAPP_NUMBER:
    process.env.WHATSAPP_NUMBER ||
    process.env.NOFFELO_WHATSAPP_NUMBER ||
    "923001234567",
  CLIENT_URL:
    process.env.CLIENT_URL ||
    (process.env.CLIENT_ORIGINS || "http://localhost:5173").split(",")[0].trim(),
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: ["true", "1", "yes"].includes(String(process.env.SMTP_SECURE || "").toLowerCase()),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  ORDER_CURRENCY: process.env.ORDER_CURRENCY || "PKR",
  RATE_LIMIT_RPM: Number(process.env.RATE_LIMIT_RPM || process.env.NOFFELO_RATE_LIMIT_RPM || 180),
  MAX_BODY_BYTES: process.env.MAX_BODY_BYTES || process.env.NOFFELO_MAX_BODY_BYTES || "128kb"
};

if (env.NODE_ENV === "production" && env.JWT_SECRET === "change-this-development-jwt-secret") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (env.NODE_ENV === "production" && env.CUSTOMER_JWT_SECRET === "change-this-development-customer-jwt-secret") {
  throw new Error("CUSTOMER_JWT_SECRET must be set in production.");
}

module.exports = env;
