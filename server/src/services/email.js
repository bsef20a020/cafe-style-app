const nodemailer = require("nodemailer");
const env = require("../config/env");

function smtpConfigured() {
  return Boolean(env.SMTP_HOST && env.MAIL_FROM);
}

function createTransport() {
  const options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE
  };

  if (env.SMTP_USER || env.SMTP_PASS) {
    options.auth = {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    };
  }

  return nodemailer.createTransport(options);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendPasswordResetEmail(user, resetUrl) {
  if (!smtpConfigured()) {
    if (env.NODE_ENV !== "production") {
      console.log(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
    } else {
      console.error("SMTP is not configured; password reset email was not sent.");
    }
    return { sent: false };
  }

  const transporter = createTransport();
  const safeName = escapeHtml(user.name);
  const safeResetUrl = escapeHtml(resetUrl);
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: user.email,
    subject: "Reset your NOFFELO password",
    text: [
      `Hi ${user.name},`,
      "",
      "Use this link to reset your NOFFELO password. It expires in 15 minutes:",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <p>Hi ${safeName},</p>
      <p>Use this link to reset your NOFFELO password. It expires in 15 minutes:</p>
      <p><a href="${safeResetUrl}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  });

  return { sent: true };
}

module.exports = {
  sendPasswordResetEmail
};
