const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const ADMIN_COOKIE_NAME = "noffelo_admin_session";

function cookieValue(header, name) {
  return (header || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const cookieToken = cookieValue(req.headers.cookie, ADMIN_COOKIE_NAME);
  const token = bearerToken || cookieToken || "";

  if (!token) {
    return res.status(401).json({ ok: false, error: "missing_token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (_error) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }

  const user = await AdminUser.findById(payload.sub).select("-passwordHash");
  if (!user) {
    return res.status(401).json({ ok: false, error: "invalid_session" });
  }

  req.user = user;
  req.auth = payload;
  return next();
});

module.exports = requireAuth;
