const Groq = require("groq-sdk");
const env = require("../config/env");

const CUSTOMER_SYSTEM_PROMPT = `You are NOFFELO cafe assistant. You help customers with menu recommendations, order tracking, table reservations, and cafe information.
Be friendly, helpful, and concise.
Always answer in the same language the user writes in.
If user writes in Urdu or Roman Urdu, reply in Urdu or Roman Urdu naturally.
If user writes in English, reply in English.
Only answer cafe-related questions.
Use the provided menu, order, reservation, and cafe context. Do not invent prices, statuses, or policies.
For menu questions, recommend only items present in menuMatches or availableMenu. If those lists do not contain a matching item, say that the current menu does not show that exact item and suggest the closest real alternatives.
All menu prices are in PKR. In English say "PKR"; in Urdu or Roman Urdu say "rupees" or "rupay". Never use other currencies.
If you cannot help, say: Contact us at the provided cafe number.`;

const ADMIN_SYSTEM_PROMPT = `You are NOFFELO admin assistant. You help cafe staff with sales analytics, order management, reservation overview, and menu insights.
Be precise with numbers and data.
Always show actual figures from the database when figures are provided.
Do not invent revenue, order counts, menu changes, or customer insights.
Suggest actions when you see operational problems.`;

const CUSTOMER_FALLBACK =
  "AI chat is not configured yet. Add GROQ_API_KEY on the server, then restart the API. Contact us at the cafe number for help.";

const ADMIN_FALLBACK =
  "AI admin chat is not configured yet. Add GROQ_API_KEY on the server, then restart the API.";

let groqClient = null;

function isGroqConfigured() {
  const key = String(env.GROQ_API_KEY || "").trim();
  return Boolean(key && key !== "your_groq_key_here" && key !== "real_key_here");
}

function getGroqClient() {
  if (!isGroqConfigured()) return null;

  if (!groqClient) {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  return groqClient;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((message) => ["user", "assistant"].includes(message?.role) && message?.content)
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: String(message.content).slice(0, 1000)
    }));
}

function buildContextMessage(context) {
  return {
    role: "system",
    content: `Use this live NOFFELO context for the next answer:\n${JSON.stringify(context, null, 2)}`
  };
}

async function createChatCompletion({ systemPrompt, context, history, message, model, temperature, maxTokens }) {
  const client = getGroqClient();

  if (!client) {
    return {
      configured: false,
      content: systemPrompt === ADMIN_SYSTEM_PROMPT ? ADMIN_FALLBACK : CUSTOMER_FALLBACK,
      model: null
    };
  }

  const completion = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      buildContextMessage(context),
      ...normalizeHistory(history),
      { role: "user", content: String(message || "").slice(0, 2000) }
    ]
  });

  return {
    configured: true,
    content: completion.choices?.[0]?.message?.content || "",
    model
  };
}

async function getCustomerChatResponse({ message, history, context }) {
  return createChatCompletion({
    systemPrompt: CUSTOMER_SYSTEM_PROMPT,
    context,
    history,
    message,
    model: env.GROQ_CUSTOMER_MODEL,
    temperature: env.GROQ_CUSTOMER_TEMPERATURE,
    maxTokens: env.GROQ_CUSTOMER_MAX_TOKENS
  });
}

async function getAdminChatResponse({ message, history, context }) {
  return createChatCompletion({
    systemPrompt: ADMIN_SYSTEM_PROMPT,
    context,
    history,
    message,
    model: env.GROQ_ADMIN_MODEL,
    temperature: env.GROQ_ADMIN_TEMPERATURE,
    maxTokens: env.GROQ_ADMIN_MAX_TOKENS
  });
}

module.exports = {
  CUSTOMER_SYSTEM_PROMPT,
  ADMIN_SYSTEM_PROMPT,
  isGroqConfigured,
  getCustomerChatResponse,
  getAdminChatResponse
};
