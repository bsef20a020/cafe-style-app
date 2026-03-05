#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail=0

echo "[1/5] Checking admin auth is server-side..."
if rg -n "ADMIN_PASSWORD|__NOFFELO_ADMIN_PASSWORD__" admin.html >/dev/null; then
  echo "ERROR: admin.html still contains client-side admin password references"
  fail=1
fi

echo "[2/5] Checking env file exists..."
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found (copy from .env.example)"
  fail=1
fi
if [[ -f .env ]] && ! rg -n "^NOFFELO_ADMIN_PASSWORD=" .env >/dev/null; then
  echo "ERROR: NOFFELO_ADMIN_PASSWORD missing in .env"
  fail=1
fi

echo "[3/5] Checking domain placeholders..."
if rg -n "https://example.com" robots.txt sitemap.xml >/dev/null; then
  echo "WARN: example.com still present in robots.txt/sitemap.xml (update before go-live)"
fi

echo "[4/5] Checking backend endpoint reference..."
if ! rg -n "__NOFFELO_BACKEND_ENDPOINT__|backendEndpoint" index.html >/dev/null; then
  echo "ERROR: backendEndpoint config missing"
  fail=1
fi

echo "[5/5] Checking Python backend syntax..."
python3 -m py_compile backend/server.py

if [[ "$fail" -ne 0 ]]; then
  echo "\nPreflight failed. Fix errors above."
  exit 1
fi

echo "\nPreflight passed. Ready for deploy workflow."
