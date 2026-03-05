#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8787}"
INGEST_TOKEN="${NOFFELO_INGEST_TOKEN:-}"
ADMIN_KEY="${NOFFELO_ADMIN_KEY:-}"

if [[ ( -z "$INGEST_TOKEN" || -z "$ADMIN_KEY" ) && -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  INGEST_TOKEN="${NOFFELO_INGEST_TOKEN:-$INGEST_TOKEN}"
  ADMIN_KEY="${NOFFELO_ADMIN_KEY:-$ADMIN_KEY}"
fi

if [[ -z "$INGEST_TOKEN" ]]; then
  echo "ERROR: NOFFELO_INGEST_TOKEN env var required"
  exit 1
fi
if [[ -z "$ADMIN_KEY" ]]; then
  echo "ERROR: NOFFELO_ADMIN_KEY env var required"
  exit 1
fi

echo "Health check..."
curl -fsS "$BASE_URL/health" | cat

echo "\nIngest check..."
curl -fsS -X POST "$BASE_URL/ingest" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -d '{"type":"analytics_event","data":{"event":"smoke_test","page":"/","ts":"2026-03-05T00:00:00Z"}}' | cat

echo "\nAdmin list check..."
curl -fsS "$BASE_URL/admin/list?key=$ADMIN_KEY" | head -c 500

echo "\n\nBackend smoke test passed."
