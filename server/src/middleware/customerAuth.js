const jwt = require("jsonwebtoken");
const CustomerUser = require("../models/CustomerUser");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const CUSTOMER_COOKIE_NAME = "noffelo_customer_session";

function cookieValue(header, name) {
  return (header || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function customerToken(req) {
  return cookieValue(req.headers.cookie, CUSTOMER_COOKIE_NAME) || "";
}

async function customerFromToken(token) {
  if (!token) return null;

  const payload = jwt.verify(token, env.CUSTOMER_JWT_SECRET);
  if (payload.type !== "customer") return null;

  const user = await CustomerUser.findById(payload.sub).select("-passwordHash -resetPasswordTokenHash -resetPasswordExpiresAt");
  if (!user) return null;

  return { user, payload };
}

const requireCustomerAuth = asyncHandler(async (req, res, next) => {
  let session;
  try {
    session = await customerFromToken(customerToken(req));
  } catch (_error) {
    return res.status(401).json({ ok: false, error: "invalid_customer_session" });
  }

  if (!session) {
    return res.status(401).json({ ok: false, error: "missing_customer_session" });
  }

  req.customerUser = session.user;
  req.customerAuth = session.payload;
  return next();
});

const attachCustomerIfPresent = asyncHandler(async (req, _res, next) => {
  const token = customerToken(req);
  if (!token) return next();

  try {
    const session = await customerFromToken(token);
    if (session) {
      req.customerUser = session.user;
      req.customerAuth = session.payload;
    }
  } catch (_error) {
    // Public order and reservation flows should keep working as guest flows.
  }

  return next();
});

module.exports = {
  CUSTOMER_COOKIE_NAME,
  requireCustomerAuth,
  attachCustomerIfPresent
};
