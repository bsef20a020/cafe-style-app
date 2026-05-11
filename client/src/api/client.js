const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MENU_CACHE_KEY = "noffelo_menu_cache_v1";
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

function readMenuCache() {
  try {
    const raw = sessionStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.data || cached.expiresAt < Date.now()) return null;
    return cached.data;
  } catch (_error) {
    return null;
  }
}

function writeMenuCache(data) {
  try {
    sessionStorage.setItem(
      MENU_CACHE_KEY,
      JSON.stringify({
        data,
        expiresAt: Date.now() + MENU_CACHE_TTL_MS
      })
    );
  } catch (_error) {
    // Session storage is a progressive enhancement; live API data still works without it.
  }
}

function clearMenuCache() {
  try {
    sessionStorage.removeItem(MENU_CACHE_KEY);
  } catch (_error) {
    // Cache invalidation should never block admin menu mutations.
  }
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.error || "request_failed");
    error.status = response.status;
    error.details = payload.details;

    if (response.status === 401 && typeof window !== "undefined") {
      if (path.startsWith("/admin")) {
        window.dispatchEvent(new CustomEvent("noffelo:unauthorized", { detail: { path } }));
      }
      if (path.startsWith("/account") || path === "/auth/me") {
        window.dispatchEvent(new CustomEvent("noffelo:customer-unauthorized", { detail: { path } }));
      }
    }

    throw error;
  }

  return payload.data ?? payload;
}

async function getMenu() {
  const cached = readMenuCache();
  if (cached) return cached;

  const data = await request("/menu");
  writeMenuCache(data);
  return data;
}

async function requestMenuMutation(path, options) {
  const data = await request(path, options);
  clearMenuCache();
  return data;
}

export const api = {
  baseUrl: API_BASE,
  getMenu,
  createReservation: (body) => request("/reservations", { method: "POST", body }),
  createOrder: (body) => request("/orders", { method: "POST", body }),
  getOrder: (reference) => request(`/orders/${reference}`),
  refreshOrderPayment: (reference) => request(`/orders/${reference}/refresh-payment`, { method: "POST" }),
  updateReservationRequest: (reference, body) => request(`/reservations/${reference}`, { method: "PATCH", body }),
  cancelReservationRequest: (reference, body) => request(`/reservations/${reference}/cancel`, { method: "PATCH", body }),
  trackEvent: (body) => request("/analytics", { method: "POST", body }).catch(() => null),
  customerSignup: (body) => request("/auth/signup", { method: "POST", body }),
  customerLogin: (body) => request("/auth/login", { method: "POST", body }),
  customerLogout: () => request("/auth/logout", { method: "POST" }).catch(() => null),
  getCustomerMe: () => request("/auth/me"),
  forgotCustomerPassword: (body) => request("/auth/forgot-password", { method: "POST", body }),
  resetCustomerPassword: (body) => request("/auth/reset-password", { method: "POST", body }),
  getAccountOrders: () => request("/account/orders"),
  getAccountReservations: () => request("/account/reservations"),
  login: (body) => request("/admin/login", { method: "POST", body }),
  logout: () => request("/admin/logout", { method: "POST" }).catch(() => null),
  getAdminMe: () => request("/admin/me"),
  getAdminReservations: () => request("/admin/reservations"),
  updateReservation: (id, body) => request(`/admin/reservations/${id}`, { method: "PATCH", body }),
  getAdminOrders: () => request("/admin/orders"),
  updateOrder: (id, body) => request(`/admin/orders/${id}`, { method: "PATCH", body }),
  getAnalytics: () => request("/admin/analytics"),
  getAdminMenu: () => request("/admin/menu"),
  createMenuItem: (body) => requestMenuMutation("/admin/menu", { method: "POST", body }),
  updateMenuItem: (id, body) => requestMenuMutation(`/admin/menu/${id}`, { method: "PATCH", body }),
  deleteMenuItem: (id) => requestMenuMutation(`/admin/menu/${id}`, { method: "DELETE" })
};

export function getWhatsAppNumber(fallback) {
  return import.meta.env.VITE_WHATSAPP_NUMBER || fallback || "923085233717";
}
