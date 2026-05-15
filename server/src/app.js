const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/account");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const reservationRoutes = require("./routes/reservations");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");
const chatRoutes = require("./routes/chat");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.CLIENT_ORIGINS.includes("*") || env.CLIENT_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
};

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: env.MAX_BODY_BYTES }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: env.RATE_LIMIT_RPM,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "noffelo-mern-api",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
