const USER_KEY = "noffelo_admin_user";
const EXPIRY_KEY = "noffelo_admin_expires_at";
const LEGACY_TOKEN_KEY = "noffelo_admin_token";
const EXPIRY_SKEW_MS = 30 * 1000;

function safeStorage(storage) {
  try {
    storage.setItem("__noffelo_probe", "1");
    storage.removeItem("__noffelo_probe");
    return storage;
  } catch (_error) {
    return null;
  }
}

function parseStoredUser(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

export function clearAdminSession() {
  const session = safeStorage(window.sessionStorage);
  const legacy = safeStorage(window.localStorage);

  session?.removeItem(USER_KEY);
  session?.removeItem(EXPIRY_KEY);
  session?.removeItem(LEGACY_TOKEN_KEY);
  legacy?.removeItem(USER_KEY);
  legacy?.removeItem(EXPIRY_KEY);
  legacy?.removeItem(LEGACY_TOKEN_KEY);
}

export function saveAdminSession(user, expiresAt) {
  const session = safeStorage(window.sessionStorage);
  if (!session) return;

  session.setItem(USER_KEY, JSON.stringify(user || null));
  session.setItem(EXPIRY_KEY, String(expiresAt || Date.now()));

  safeStorage(window.localStorage)?.removeItem(USER_KEY);
  safeStorage(window.localStorage)?.removeItem(EXPIRY_KEY);
  safeStorage(window.localStorage)?.removeItem(LEGACY_TOKEN_KEY);
}

export function readAdminSession() {
  const session = safeStorage(window.sessionStorage);
  const user = parseStoredUser(session?.getItem(USER_KEY));
  const expiresAt = Number(session?.getItem(EXPIRY_KEY) || 0);

  if (!user || !expiresAt || Date.now() + EXPIRY_SKEW_MS >= expiresAt) {
    clearAdminSession();
    return null;
  }

  return { user, expiresAt };
}
