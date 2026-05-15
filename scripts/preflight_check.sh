#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail=0

echo "[1/5] Checking required project folders..."
for path in client server server/src client/src; do
  if [[ ! -d "$path" ]]; then
    echo "ERROR: missing $path"
    fail=1
  fi
done

echo "[2/5] Checking environment examples..."
for path in .env.example server/.env.example client/.env.example; do
  if [[ ! -f "$path" ]]; then
    echo "ERROR: missing $path"
    fail=1
  fi
done

echo "[3/5] Checking Docker Compose services..."
for service in "server:" "client:" "mongo:" "pinecone-local:"; do
  if ! rg -n "^  ${service}" docker-compose.yml >/dev/null; then
    echo "ERROR: docker-compose.yml missing ${service%:} service"
    fail=1
  fi
done

echo "[4/5] Checking frontend build..."
npm --prefix client run build >/dev/null

echo "[5/5] Checking server route syntax..."
node -c server/src/app.js
node -c server/src/routes/chat.js
node -c server/src/routes/admin.js
node -c server/src/routes/auth.js

if [[ "$fail" -ne 0 ]]; then
  echo
  echo "Preflight failed. Fix errors above."
  exit 1
fi

echo
echo "Preflight passed. Current MERN app is ready."
