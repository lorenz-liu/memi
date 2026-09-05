#!/usr/bin/env bash
# Build an Android install package (APK) with EAS, or a Play Store AAB.
#
# Prerequisites:
#   - Expo account: cd ui && pnpm eas login
#   - One-time project link: cd ui && pnpm eas init
#   - ui/.env with production API, e.g. EXPO_PUBLIC_API_URL=https://….run.app
#   - For --play submit: Google Play Console app + service account linked in EAS
#
# Usage:
#   ./release-android.sh           # APK (sideload / internal install)
#   ./release-android.sh --play    # AAB for Google Play
#   ./release-android.sh --play --submit  # AAB + submit to Play
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$ROOT/ui"
MODE="apk"
SUBMIT=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--play] [--submit]

  Default        Build an APK (EAS preview profile) for direct install.
  --play         Build an AAB (EAS production profile) for Google Play.
  --submit       With --play, also submit the latest AAB to Google Play.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --play) MODE="play" ;;
    --submit) SUBMIT=1 ;;
    -h|--help|help) usage; exit 0 ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "${SUBMIT}" -eq 1 && "${MODE}" != "play" ]]; then
  echo "--submit only applies with --play." >&2
  exit 1
fi

eas() {
  "$UI_DIR/node_modules/.bin/eas" "$@"
}

load_ui_env() {
  if [[ -f "$UI_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$UI_DIR/.env"
    set +a
  fi
}

require_api_url() {
  if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
    echo "EXPO_PUBLIC_API_URL is missing. Set it in ui/.env to your Cloud Run HTTPS URL." >&2
    exit 1
  fi
  if [[ "${EXPO_PUBLIC_API_URL}" != https://* ]]; then
    echo "Release builds need an HTTPS API. Got: ${EXPO_PUBLIC_API_URL}" >&2
    echo "Deploy the API first, then set EXPO_PUBLIC_API_URL in ui/.env." >&2
    exit 1
  fi
}

sync_eas_env() {
  local environment="$1"
  echo "Syncing EXPO_PUBLIC_API_URL to EAS environment '${environment}'..."
  eas env:create \
    --name EXPO_PUBLIC_API_URL \
    --value "${EXPO_PUBLIC_API_URL}" \
    --environment "${environment}" \
    --visibility plaintext \
    --type string \
    --force \
    --non-interactive
}

cd "$UI_DIR"

if [[ ! -x node_modules/.bin/eas ]]; then
  echo "Installing ui dependencies (includes eas-cli)..."
  pnpm install
fi

load_ui_env
require_api_url

if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in to Expo. Run: cd ui && pnpm eas login" >&2
  exit 1
fi

if ! grep -q '"projectId"' app.json 2>/dev/null; then
  echo "No EAS project linked yet. Run once:" >&2
  echo "  cd ui && pnpm eas init" >&2
  exit 1
fi

if [[ "${MODE}" == "apk" ]]; then
  sync_eas_env preview
  echo "Building Android APK (preview)..."
  eas build --platform android --profile preview --non-interactive
  echo
  echo "APK build started. Download it from the Expo dashboard or:"
  echo "  cd ui && ./node_modules/.bin/eas build:list --platform android --limit 1"
else
  sync_eas_env production
  echo "Building Android App Bundle (production)..."
  if [[ "${SUBMIT}" -eq 1 ]]; then
    eas build --platform android --profile production --auto-submit --non-interactive
    echo
    echo "AAB build + Google Play submit started."
  else
    eas build --platform android --profile production --non-interactive
    echo
    echo "AAB build started. Submit later with:"
    echo "  cd ui && ./node_modules/.bin/eas submit --platform android --profile production --latest"
  fi
fi
