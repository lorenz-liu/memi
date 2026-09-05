#!/usr/bin/env bash
# Build the iOS app with EAS and submit it to App Store Connect.
#
# Prerequisites:
#   - Expo account: cd ui && pnpm eas login
#   - One-time project link: cd ui && pnpm eas init
#   - Apple Developer + App Store Connect app for bundle id app.memi.mobile
#   - ui/.env with production API, e.g. EXPO_PUBLIC_API_URL=https://….run.app
#
# Usage:
#   ./release-ios.sh              # build + submit
#   ./release-ios.sh --build-only # build only (download IPA from Expo)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$ROOT/ui"
BUILD_ONLY=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--build-only]

  Build memi for iOS (EAS production profile) and submit to App Store Connect.
  --build-only   Skip App Store submit; only run the cloud build.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=1 ;;
    -h|--help|help) usage; exit 0 ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

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
    echo "Store builds need an HTTPS API. Got: ${EXPO_PUBLIC_API_URL}" >&2
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

sync_eas_env production

echo "Building iOS (production)..."
if [[ "${BUILD_ONLY}" -eq 1 ]]; then
  eas build --platform ios --profile production --non-interactive
  echo
  echo "Build started. IPA will appear in the Expo dashboard when finished."
else
  eas build --platform ios --profile production --auto-submit --non-interactive
  echo
  echo "Build + App Store Connect submit started."
  echo "Finish App Review in App Store Connect when processing completes."
fi
