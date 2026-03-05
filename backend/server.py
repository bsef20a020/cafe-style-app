import json
import os
import sqlite3
import threading
import time
import hmac
import hashlib
import base64
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

DB_PATH = os.environ.get("NOFFELO_DB", "/data/noffelo.db")
ADMIN_KEY = os.environ.get("NOFFELO_ADMIN_KEY", "change-me")
ADMIN_PASSWORD = os.environ.get("NOFFELO_ADMIN_PASSWORD", "")
ADMIN_SESSION_SECRET = os.environ.get("NOFFELO_ADMIN_SESSION_SECRET", ADMIN_KEY)
ADMIN_SESSION_TTL_SEC = int(os.environ.get("NOFFELO_ADMIN_SESSION_TTL_SEC", "43200"))
INGEST_TOKEN = os.environ.get("NOFFELO_INGEST_TOKEN", "")
HOST = os.environ.get("NOFFELO_HOST", "0.0.0.0")
PORT = int(os.environ.get("NOFFELO_PORT", "8787"))
RATE_LIMIT_RPM = int(os.environ.get("NOFFELO_RATE_LIMIT_RPM", "180"))
MAX_BODY_BYTES = int(os.environ.get("NOFFELO_MAX_BODY_BYTES", "65536"))

_raw_origins = os.environ.get("NOFFELO_CORS_ORIGINS", "*").strip()
CORS_ALLOW_ALL = _raw_origins == "*"
CORS_ORIGINS = {o.strip() for o in _raw_origins.split(",") if o.strip()} if not CORS_ALLOW_ALL else set()

_RATE_WINDOW_SEC = 60
_rate_lock = threading.Lock()
_rate_bucket = {}


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            event TEXT,
            page TEXT,
            payload TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            bookingRef TEXT,
            name TEXT,
            phone TEXT,
            venue TEXT,
            guests INTEGER,
            date TEXT,
            time TEXT,
            occasion TEXT,
            payload TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def request_ip(handler: BaseHTTPRequestHandler) -> str:
    xff = handler.headers.get("X-Forwarded-For", "").strip()
    if xff:
        return xff.split(",")[0].strip()
    return handler.client_address[0] if handler.client_address else "unknown"


def token_valid(handler: BaseHTTPRequestHandler) -> bool:
    if not INGEST_TOKEN:
        return True
    auth = (handler.headers.get("Authorization", "") or "").strip()
    if auth.startswith("Bearer ") and auth[len("Bearer "):].strip() == INGEST_TOKEN:
        return True
    xkey = (handler.headers.get("X-API-Key", "") or "").strip()
    return xkey == INGEST_TOKEN


def b64u_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def b64u_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("utf-8"))


def sign_value(value: str) -> str:
    digest = hmac.new(
        ADMIN_SESSION_SECRET.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return b64u_encode(digest)


def issue_admin_token() -> str:
    iat = int(time.time())
    exp = iat + max(300, ADMIN_SESSION_TTL_SEC)
    payload = json.dumps({"iat": iat, "exp": exp}, separators=(",", ":"))
    payload_b64 = b64u_encode(payload.encode("utf-8"))
    sig_b64 = sign_value(payload_b64)
    return f"{payload_b64}.{sig_b64}"


def admin_token_valid(handler: BaseHTTPRequestHandler) -> bool:
    auth = (handler.headers.get("Authorization", "") or "").strip()
    if not auth.startswith("Bearer "):
        return False
    raw = auth[len("Bearer "):].strip()
    if "." not in raw:
        return False
    payload_b64, sig_b64 = raw.split(".", 1)
    expected_sig = sign_value(payload_b64)
    if not hmac.compare_digest(sig_b64, expected_sig):
        return False
    try:
        payload = json.loads(b64u_decode(payload_b64).decode("utf-8"))
        exp = int(payload.get("exp", 0))
    except Exception:
        return False
    return int(time.time()) < exp


def under_rate_limit(ip: str) -> bool:
    if RATE_LIMIT_RPM <= 0:
        return True
    now = time.time()
    with _rate_lock:
        slots = _rate_bucket.get(ip, [])
        slots = [t for t in slots if now - t < _RATE_WINDOW_SEC]
        if len(slots) >= RATE_LIMIT_RPM:
            _rate_bucket[ip] = slots
            return False
        slots.append(now)
        _rate_bucket[ip] = slots
    return True


def cors_origin(handler: BaseHTTPRequestHandler):
    req_origin = (handler.headers.get("Origin", "") or "").strip()
    if CORS_ALLOW_ALL:
        return "*"
    if req_origin and req_origin in CORS_ORIGINS:
        return req_origin
    return None


def send_common_headers(handler: BaseHTTPRequestHandler, code: int, content_type: str, content_length: int = 0):
    handler.send_response(code)
    handler.send_header("Content-Type", content_type)
    if content_length:
        handler.send_header("Content-Length", str(content_length))

    origin = cors_origin(handler)
    if origin:
        handler.send_header("Access-Control-Allow-Origin", origin)
        handler.send_header("Vary", "Origin")

    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key")


def json_response(handler: BaseHTTPRequestHandler, code: int, data: dict) -> None:
    body = json.dumps(data).encode("utf-8")
    send_common_headers(handler, code, "application/json", len(body))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Reject preflight for disallowed origins when allowlist is configured.
        if not CORS_ALLOW_ALL and not cors_origin(self):
            return json_response(self, 403, {"ok": False, "error": "origin_not_allowed"})
        send_common_headers(self, 204, "application/json")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return json_response(self, 200, {"ok": True, "service": "noffelo-backend", "ts": now_iso()})

        if parsed.path == "/admin/list":
            if not CORS_ALLOW_ALL and (self.headers.get("Origin") or "").strip() and not cors_origin(self):
                return json_response(self, 403, {"ok": False, "error": "origin_not_allowed"})
            if not admin_token_valid(self):
                return json_response(self, 401, {"ok": False, "error": "invalid_admin_token"})

            conn = get_conn()
            events_rows = conn.execute(
                "SELECT ts, event, page, payload FROM analytics_events ORDER BY id DESC LIMIT 500"
            ).fetchall()
            reservations_rows = conn.execute(
                "SELECT ts, bookingRef, name, phone, venue, guests, date, time, occasion, payload FROM reservations ORDER BY id DESC LIMIT 500"
            ).fetchall()
            conn.close()

            events = []
            for row in events_rows:
                payload = {}
                try:
                    payload = json.loads(row["payload"])
                except Exception:
                    payload = {"raw": row["payload"]}
                events.append({"ts": row["ts"], "event": row["event"], "page": row["page"], **payload})

            reservations = []
            for row in reservations_rows:
                payload = {}
                try:
                    payload = json.loads(row["payload"])
                except Exception:
                    payload = {"raw": row["payload"]}
                reservations.append({
                    "ts": row["ts"],
                    "bookingRef": row["bookingRef"],
                    "name": row["name"],
                    "phone": row["phone"],
                    "venue": row["venue"],
                    "guests": row["guests"],
                    "date": row["date"],
                    "time": row["time"],
                    "occasion": row["occasion"],
                    **payload,
                })

            return json_response(self, 200, {"ok": True, "events": events, "reservations": reservations})

        return json_response(self, 404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/admin/login":
            if not CORS_ALLOW_ALL and (self.headers.get("Origin") or "").strip() and not cors_origin(self):
                return json_response(self, 403, {"ok": False, "error": "origin_not_allowed"})
            ip = request_ip(self)
            if not under_rate_limit(ip):
                return json_response(self, 429, {"ok": False, "error": "rate_limited"})
            if not ADMIN_PASSWORD:
                return json_response(self, 503, {"ok": False, "error": "admin_password_not_configured"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > MAX_BODY_BYTES:
                    return json_response(self, 413, {"ok": False, "error": "invalid_body_size"})
                raw = self.rfile.read(length)
                payload = json.loads(raw.decode("utf-8") or "{}")
            except Exception:
                return json_response(self, 400, {"ok": False, "error": "invalid_json"})

            password = str(payload.get("password", "")).strip()
            if not hmac.compare_digest(password, ADMIN_PASSWORD):
                return json_response(self, 401, {"ok": False, "error": "invalid_credentials"})

            return json_response(
                self,
                200,
                {
                    "ok": True,
                    "token": issue_admin_token(),
                    "expiresInSec": max(300, ADMIN_SESSION_TTL_SEC),
                },
            )

        if parsed.path != "/ingest":
            return json_response(self, 404, {"ok": False, "error": "not_found"})

        if not CORS_ALLOW_ALL and not cors_origin(self):
            return json_response(self, 403, {"ok": False, "error": "origin_not_allowed"})

        ip = request_ip(self)
        if not under_rate_limit(ip):
            return json_response(self, 429, {"ok": False, "error": "rate_limited"})

        if not token_valid(self):
            return json_response(self, 401, {"ok": False, "error": "invalid_ingest_token"})

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                return json_response(self, 413, {"ok": False, "error": "invalid_body_size"})
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return json_response(self, 400, {"ok": False, "error": "invalid_json"})

        ptype = (payload.get("type") or "").strip()
        data = payload.get("data") or {}
        ts = data.get("ts") or now_iso()

        conn = get_conn()
        cur = conn.cursor()

        if ptype == "analytics_event":
            cur.execute(
                "INSERT INTO analytics_events(ts, event, page, payload) VALUES(?,?,?,?)",
                (ts, data.get("event", ""), data.get("page", ""), json.dumps(data, ensure_ascii=False)),
            )
        elif ptype == "reservation_request":
            cur.execute(
                """
                INSERT INTO reservations(ts, bookingRef, name, phone, venue, guests, date, time, occasion, payload)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    ts,
                    data.get("bookingRef", ""),
                    data.get("name", ""),
                    data.get("phone", ""),
                    data.get("venue", ""),
                    data.get("guests", None),
                    data.get("date", ""),
                    data.get("time", ""),
                    data.get("occasion", ""),
                    json.dumps(data, ensure_ascii=False),
                ),
            )
        else:
            conn.close()
            return json_response(self, 400, {"ok": False, "error": "unknown_type"})

        conn.commit()
        conn.close()
        return json_response(self, 200, {"ok": True})

    def log_message(self, format: str, *args):
        return


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"NOFFELO backend listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
