const env = require("../config/env");

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF"
]);

function isConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function toMinorUnit(amount, currency) {
  const normalized = String(currency || "PKR").toUpperCase();
  return Math.round(Number(amount || 0) * (ZERO_DECIMAL_CURRENCIES.has(normalized) ? 1 : 100));
}

function appendLineItem(body, item, index, currency) {
  body.append(`line_items[${index}][quantity]`, String(item.quantity));
  body.append(`line_items[${index}][price_data][currency]`, currency.toLowerCase());
  body.append(`line_items[${index}][price_data][unit_amount]`, String(toMinorUnit(item.unitPrice, currency)));
  body.append(`line_items[${index}][price_data][product_data][name]`, item.name);
}

async function stripeRequest(path, options = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error?.message || "stripe_request_failed");
    error.status = 502;
    throw error;
  }

  return payload;
}

async function createCheckoutSession(order) {
  if (!isConfigured()) {
    return null;
  }

  const body = new URLSearchParams();
  const currency = order.currency || env.ORDER_CURRENCY || "PKR";

  body.append("mode", "payment");
  body.append("client_reference_id", order.reference);
  body.append("success_url", `${env.CLIENT_URL}/orders/${order.reference}?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  body.append("cancel_url", `${env.CLIENT_URL}/orders/${order.reference}?payment=cancelled`);
  body.append("customer_email", order.customer.email || "");
  body.append("metadata[order_id]", order._id.toString());
  body.append("metadata[order_reference]", order.reference);

  order.items.forEach((item, index) => appendLineItem(body, item, index, currency));

  return stripeRequest("/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

async function retrieveCheckoutSession(sessionId) {
  if (!isConfigured() || !sessionId) {
    return null;
  }

  return stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

module.exports = {
  createCheckoutSession,
  isConfigured,
  retrieveCheckoutSession
};
