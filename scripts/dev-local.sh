#!/usr/bin/env bash
# Run MioPoS locally: API on :8787, Vite UI on :5173 (proxies /api to API)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
[[ -f "$HOME/.railway/env" ]] && source "$HOME/.railway/env"
export PATH="/usr/local/opt/libpq/bin:${PATH:-}"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  echo "  cp .env.local.example .env.local"
  echo "  bash scripts/pull-env-from-railway.sh   # or edit .env.local manually"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

API_PORT="${API_PORT:-8787}"
VITE_PORT="${VITE_PORT:-5173}"
export PORT="$API_PORT"
export NODE_ENV="${NODE_ENV:-development}"
export BASE_PATH="${BASE_PATH:-/}"

echo "==> MioPoS local dev"
echo "    API:  http://127.0.0.1:${API_PORT}"
echo "    UI:   http://localhost:${VITE_PORT}"
echo "    DB:   ${DATABASE_URL%%@*}@…"
echo ""

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Run: bash scripts/setup-mac-dev.sh" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "==> pnpm install (first time)..."
  pnpm install
fi

echo "==> Building API..."
pnpm --filter @workspace/api-server run build

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Starting API on port ${API_PORT}..."
node --enable-source-maps artifacts/api-server/dist/index.mjs &
API_PID=$!
sleep 2

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/healthz" >/dev/null; then
  echo "API failed to start. Check DATABASE_URL in .env.local" >&2
  wait "$API_PID" 2>/dev/null || true
  exit 1
fi
echo "    API health OK"

echo "==> Starting Vite on port ${VITE_PORT} (Ctrl+C to stop both)..."
export PORT="$VITE_PORT"
cd artifacts/restaurant-pos
exec pnpm run dev
