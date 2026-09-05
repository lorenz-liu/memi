#!/usr/bin/env bash
# Bootstrap GCP APIs / Secret Manager, then build and deploy infra/ to Cloud Run.
#
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID
#   ./infra/deploy/deploy.sh bootstrap
#   ./infra/deploy/deploy.sh
#
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
# shellcheck disable=SC1091
source "$DEPLOY_DIR/config.env"

PROJECT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${GOOGLE_CLOUD_REGION}"
SERVICE="${CLOUD_RUN_SERVICE}"
SECRET="${CLOUD_RUN_SECRET}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [bootstrap|deploy]

  bootstrap   Enable APIs, create/update the ${SECRET} secret, grant Cloud Run access
  deploy      Build infra/ with Cloud Build and deploy ${SERVICE} (default)

Requires: gcloud, a GCP project with billing, and GROQ_API_KEY (env or infra/.env).
EOF
}

require_project() {
  if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
    echo "Set a project: gcloud config set project YOUR_PROJECT_ID" >&2
    echo "Or: GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID $0" >&2
    exit 1
  fi
}

load_local_key() {
  if [[ -n "${GROQ_API_KEY:-}" ]]; then
    return
  fi
  if [[ -f "$INFRA_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$INFRA_DIR/.env"
    set +a
  fi
}

bootstrap() {
  require_project
  echo "Enabling APIs on ${PROJECT}..."
  gcloud services enable \
    --project "${PROJECT}" \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com

  load_local_key
  if [[ -z "${GROQ_API_KEY:-}" ]]; then
    echo "GROQ_API_KEY is missing. Put it in infra/.env or export it." >&2
    exit 1
  fi

  if gcloud secrets describe "${SECRET}" --project "${PROJECT}" >/dev/null 2>&1; then
    echo "Adding a new version of secret ${SECRET}..."
    printf '%s' "${GROQ_API_KEY}" | gcloud secrets versions add "${SECRET}" \
      --project "${PROJECT}" \
      --data-file=-
  else
    echo "Creating secret ${SECRET}..."
    printf '%s' "${GROQ_API_KEY}" | gcloud secrets create "${SECRET}" \
      --project "${PROJECT}" \
      --data-file=-
  fi

  local project_number
  project_number="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
  local runtime_sa="${project_number}-compute@developer.gserviceaccount.com"

  echo "Granting ${runtime_sa} access to ${SECRET}..."
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --project "${PROJECT}" \
    --member "serviceAccount:${runtime_sa}" \
    --role roles/secretmanager.secretAccessor \
    --quiet >/dev/null

  echo "Bootstrap done."
}

deploy() {
  require_project
  echo "Deploying ${SERVICE} from ${INFRA_DIR} to ${REGION}..."
  gcloud run deploy "${SERVICE}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --source "${INFRA_DIR}" \
    --allow-unauthenticated \
    --set-secrets "${SECRET}=${SECRET}:latest" \
    --memory "${CLOUD_RUN_MEMORY}" \
    --cpu "${CLOUD_RUN_CPU}" \
    --timeout "${CLOUD_RUN_TIMEOUT}" \
    --max-instances "${CLOUD_RUN_MAX_INSTANCES}" \
    --concurrency "${CLOUD_RUN_CONCURRENCY}" \
    --cpu-boost \
    --quiet

  local url
  url="$(gcloud run services describe "${SERVICE}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --format='value(status.url)')"
  echo
  echo "API  ${url}"
  echo "Set ui/.env to:"
  echo "EXPO_PUBLIC_API_URL=${url}"
}

cmd="${1:-deploy}"
case "${cmd}" in
  bootstrap) bootstrap ;;
  deploy) deploy ;;
  -h|--help|help) usage ;;
  *)
    usage >&2
    exit 1
    ;;
esac
