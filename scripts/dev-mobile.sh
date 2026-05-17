#!/usr/bin/env bash
# Run API + Expo mobile against local API (default :8787).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-8787}"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
# Physical iPhone cannot use 127.0.0.1 — set USE_DEVICE=1 or EXPO_PUBLIC_API_URL yourself.
if [[ -z "${EXPO_PUBLIC_API_URL:-}" && -f artifacts/pos-mobile/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source artifacts/pos-mobile/.env
  set +a
fi
if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
  if [[ "${USE_DEVICE:-}" == "1" && -n "$LAN_IP" ]]; then
    export EXPO_PUBLIC_API_URL="http://${LAN_IP}:${API_PORT}"
  else
    export EXPO_PUBLIC_API_URL="http://127.0.0.1:${API_PORT}"
  fi
fi

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — run: bash scripts/pull-env-from-railway.sh" >&2
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/healthz" >/dev/null 2>&1; then
  echo "API not running on :${API_PORT}. Start in another terminal:"
  echo "  cd $ROOT && pnpm dev"
  echo ""
  echo "Or only the API:"
  echo "  set -a && source .env.local && set +a"
  echo "  PORT=${API_PORT} node --enable-source-maps artifacts/api-server/dist/index.mjs"
  exit 1
fi

echo "==> MioPoS mobile (Expo)"
echo "    API:  ${EXPO_PUBLIC_API_URL}"
echo "    iPhone (Expo Go): scan QR in terminal, or open project in Expo Go app"
echo "    Simulator: press i  |  Web: press w"
if [[ -n "$LAN_IP" && "${EXPO_PUBLIC_API_URL}" == *127.0.0.1* ]]; then
  echo ""
  echo "    iPhone tip: Mac IP is ${LAN_IP} — run with:"
  echo "      USE_DEVICE=1 pnpm dev:mobile"
fi
echo ""

cd artifacts/pos-mobile
exec pnpm run dev:local
