const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const CustomerUser = require("../models/CustomerUser");
const env = require("../config/env");
const validateBody = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { CUSTOMER_COOKIE_NAME, requireCustomerAuth } = require("../middleware/customerAuth");
const { sendPasswordResetEmail } = require("../services/email");

const router = express.Router();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const GENERIC_RESET_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(8, Math.floor(env.RATE_LIMIT_RPM / 5)),
  standardHeaders: true,
  legacyHeaders: false
});

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(120);

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: z.string().trim().min(7).max(24),
  password: passwordSchema
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(120)
});

const forgotPasswordSchema = z.object({
  email: emailSchema
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: passwordSchema
});

function customerResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone
  };
}

function signCustomerToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: "customer" }, env.CUSTOMER_JWT_SECRET, {
    expiresIn: env.CUSTOMER_JWT_EXPIRES_IN
  });
}

function tokenExpiry(token) {
  const decoded = jwt.decode(token);
  return decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
}

function setCustomerCookie(res, token) {
  const expiresAt = tokenExpiry(token);
  res.cookie(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api",
    expires: new Date(expiresAt)
  });
  return expiresAt;
}

function clearCustomerCookie(res) {
  res.clearCookie(CUSTOMER_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api"
  });
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resetUrlFor(token) {
  return `${env.CLIENT_URL.replace(/\/$/, "")}/reset-password/${token}`;
}

router.post(
  "/signup",
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const existing = await CustomerUser.findOne({ email: req.body.email });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "email_already_registered",
        details: { email: ["An account with this email already exists."] }
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await CustomerUser.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      passwordHash,
      lastLoginAt: new Date()
    });

    const token = signCustomerToken(user);
    const expiresAt = setCustomerCookie(res, token);

    res.status(201).json({
      ok: true,
      data: { user: customerResponse(user), expiresAt }
    });
  })
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await CustomerUser.findOne({ email: req.body.email }).select("+passwordHash");
    const valid = user ? await bcrypt.compare(req.body.password, user.passwordHash) : false;

    if (!valid) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signCustomerToken(user);
    const expiresAt = setCustomerCookie(res, token);

    res.json({
      ok: true,
      data: { user: customerResponse(user), expiresAt }
    });
  })
);

router.post("/logout", (_req, res) => {
  clearCustomerCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireCustomerAuth, (req, res) => {
  res.json({
    ok: true,
    data: {
      user: customerResponse(req.customerUser),
      expiresAt: req.customerAuth?.exp ? req.customerAuth.exp * 1000 : null
    }
  });
});

router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await CustomerUser.findOne({ email: req.body.email }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = hashResetToken(token);
      user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      try {
        await sendPasswordResetEmail(user, resetUrlFor(token));
      } catch (error) {
        console.error("Password reset email failed", error);
      }
    }

    res.json({
      ok: true,
      data: { message: GENERIC_RESET_MESSAGE }
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const tokenHash = hashResetToken(req.body.token);
    const user = await CustomerUser.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() }
    }).select("+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt");

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "invalid_or_expired_token",
        details: { token: ["Reset link is invalid or expired. Request a new link."] }
      });
    }

    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signCustomerToken(user);
    const expiresAt = setCustomerCookie(res, token);

    res.json({
      ok: true,
      data: { user: customerResponse(user), expiresAt }
    });
  })
);

module.exports = router;
