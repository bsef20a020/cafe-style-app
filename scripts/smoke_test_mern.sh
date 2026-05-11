#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"

read_env_value() {
  local key="$1"
  local line value

  [[ -f "$ENV_FILE" ]] || return 1

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" == "$key="* ]] || continue

    value="${line#*=}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf '%s' "$value"
    return 0
  done < "$ENV_FILE"

  return 1
}

env_or_empty() {
  read_env_value "$1" || true
}

API_URL="${API_URL:-http://127.0.0.1:5000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-$(env_or_empty ADMIN_EMAIL)}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@noffelo.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(env_or_empty ADMIN_PASSWORD)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(env_or_empty NOFFELO_ADMIN_PASSWORD)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"

echo "Checking API health..."
curl -fsS "${API_URL}/health" >/dev/null

echo "Checking public menu..."
curl -fsS "${API_URL}/menu" >/dev/null

echo "Checking admin login..."
curl -fsS \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  "${API_URL}/admin/login" >/dev/null

echo "MERN smoke test passed."
