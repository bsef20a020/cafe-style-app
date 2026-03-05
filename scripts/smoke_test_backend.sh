#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8787}"
INGEST_TOKEN="${NOFFELO_INGEST_TOKEN:-}"
ADMIN_PASSWORD="${NOFFELO_ADMIN_PASSWORD:-}"

if [[ ( -z "$INGEST_TOKEN" || -z "$ADMIN_KEY" ) && -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  INGEST_TOKEN="${NOFFELO_INGEST_TOKEN:-$INGEST_TOKEN}"
  ADMIN_PASSWORD="${NOFFELO_ADMIN_PASSWORD:-$ADMIN_PASSWORD}"
fi

if [[ -z "$INGEST_TOKEN" ]]; then
  echo "ERROR: NOFFELO_INGEST_TOKEN env var required"
  exit 1
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ERROR: NOFFELO_ADMIN_PASSWORD env var required"
  exit 1
fi

echo "Health check..."
curl -fsS "$BASE_URL/health" | cat

echo "\nIngest check..."
curl -fsS -X POST "$BASE_URL/ingest" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -d '{"type":"analytics_event","data":{"event":"smoke_test","page":"/","ts":"2026-03-05T00:00:00Z"}}' | cat

echo "\nAdmin login check..."
ADMIN_TOKEN="$(curl -fsS -X POST "$BASE_URL/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))')"

if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "ERROR: admin login failed"
  exit 1
fi

echo "Admin list check..."
curl -fsS "$BASE_URL/admin/list" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | head -c 500

echo "\n\nBackend smoke test passed."
