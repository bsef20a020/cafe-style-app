const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const runtimeEnv = process.env.NODE_ENV || "development";

dotenv.config({ path: path.resolve(__dirname, `../../../.env.${runtimeEnv}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${runtimeEnv}`) });

const splitList = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

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
  MAX_BODY_BYTES: process.env.MAX_BODY_BYTES || process.env.NOFFELO_MAX_BODY_BYTES || "128kb",
  USE_LOCAL_VECTORS: toBoolean(process.env.USE_LOCAL_VECTORS, runtimeEnv !== "production"),
  VECTOR_STORE:
    process.env.VECTOR_STORE ||
    (toBoolean(process.env.USE_LOCAL_VECTORS, runtimeEnv !== "production") ? "pinecone-local" : "pinecone"),
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || "",
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || "noffelo-cafe",
  PINECONE_HOST: process.env.PINECONE_HOST || "",
  PINECONE_CLOUD: process.env.PINECONE_CLOUD || "aws",
  PINECONE_REGION: process.env.PINECONE_REGION || "us-east-1",
  VECTOR_DIMENSION: Number(process.env.VECTOR_DIMENSION || 384),
  PINECONE_CREATE_INDEX: toBoolean(process.env.PINECONE_CREATE_INDEX, runtimeEnv !== "production"),
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_CUSTOMER_MODEL: process.env.GROQ_CUSTOMER_MODEL || "llama-3.1-8b-instant",
  GROQ_ADMIN_MODEL: process.env.GROQ_ADMIN_MODEL || "llama-3.3-70b-versatile",
  GROQ_CUSTOMER_TEMPERATURE: Number(process.env.GROQ_CUSTOMER_TEMPERATURE || 0.7),
  GROQ_ADMIN_TEMPERATURE: Number(process.env.GROQ_ADMIN_TEMPERATURE || 0.3),
  GROQ_CUSTOMER_MAX_TOKENS: Number(process.env.GROQ_CUSTOMER_MAX_TOKENS || 500),
  GROQ_ADMIN_MAX_TOKENS: Number(process.env.GROQ_ADMIN_MAX_TOKENS || 1000)
};

if (env.NODE_ENV === "production" && env.JWT_SECRET === "change-this-development-jwt-secret") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (env.NODE_ENV === "production" && env.CUSTOMER_JWT_SECRET === "change-this-development-customer-jwt-secret") {
  throw new Error("CUSTOMER_JWT_SECRET must be set in production.");
}

module.exports = env;
