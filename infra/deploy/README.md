# Deploy the API to Google Cloud Run

The FastAPI service in `infra/` is built from `infra/Dockerfile` and deployed with `infra/deploy/deploy.sh`. Notes stay on the device; Cloud Run only hosts title, cloze, and TTS.

## One-time setup

1. Create a GCP project and enable billing (required for Cloud Run; idle usage usually stays in the [free allowance](https://cloud.google.com/run/pricing)).
2. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and log in:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

3. Put `GROQ_API_KEY` in `infra/.env` (same as local dev), then create the Secret Manager secret, enable APIs, and grant the Compute default service account `roles/run.builder` (needed for `gcloud run deploy --source` on new GCP projects):

```bash
./infra/deploy/deploy.sh bootstrap
```

## Deploy

From the repo root:

```bash
./infra/deploy/deploy.sh
```

This uploads `infra/` to Cloud Build, builds the Docker image, and deploys `memi-api` as an unauthenticated HTTPS service. Override region or size via `infra/deploy/config.env` or the environment, for example:

```bash
GOOGLE_CLOUD_REGION=europe-west1 ./infra/deploy/deploy.sh
```

After a successful deploy the script prints the service URL. Point the app at it:

```
EXPO_PUBLIC_API_URL=https://memi-api-xxxxx.run.app
```

in `ui/.env` (see `ui/.env.example`). Rebuild or restart Expo so the public URL is picked up.

## What Cloud Run gets

| Setting | Value | Why |
| --- | --- | --- |
| CPU / memory | 1 / 512Mi | Enough for FastAPI + Groq + TTS on a small instance |
| Timeout | 120s | Cloze generation can wait on the model |
| Max instances | 3 | Caps cost on the free-ish quota |
| Min instances | 0 | Scale to zero when idle |
| `GROQ_API_KEY` | Secret Manager | Never baked into the image |

Health checks use `GET /`, which returns `{ "ok": true }`.
