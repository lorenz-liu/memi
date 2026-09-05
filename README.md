# memi

Cloze flashcards from your notes. The app lives in `ui/` (Expo). The API lives in `infra/` (FastAPI): titles, cloze generation, and TTS.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.14+)
- [pnpm](https://pnpm.io/) 11.x
- [Expo Go](https://expo.dev/go) on a phone, or Xcode / Android Studio for a simulator
- A [Groq](https://console.groq.com/) API key (used for titles and cloze cards)

## Setup

```bash
git clone https://github.com/lorenz-liu/memi.git
cd memi
```

### API

```bash
cp infra/.env.example infra/.env
```

Put your Groq key in `infra/.env`:

```
GROQ_API_KEY=gsk_...
```

`uv` will install Python dependencies the first time you start the API.

### App

```bash
cd ui
pnpm install
cd ..
```

Optional: copy `ui/.env.example` to `ui/.env` if the app cannot reach the API at the default URL.

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

On a physical phone, use your computer’s LAN address instead, for example `http://192.168.0.10:8000`. The iOS simulator can use `127.0.0.1`. The Android emulator uses `10.0.2.2` automatically when this variable is unset.

## Start development

From the repo root:

```bash
./dev.sh
```

This starts:

- API at http://127.0.0.1:8000
- Expo at http://localhost:8081

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with Expo Go.

Stop with Ctrl+C.

## Useful commands

```bash
# API only
cd infra && uv run python main.py

# App only (API must already be running)
cd ui && pnpm start

# API tests
cd infra && uv run pytest
```

## Deploy the API (Google Cloud Run)

The app talks to the API over HTTPS. Build and deploy from `infra/`:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
./infra/deploy/deploy.sh bootstrap
./infra/deploy/deploy.sh
```

Then set `EXPO_PUBLIC_API_URL` in `ui/.env` to the printed `https://*.run.app` URL. Details: [infra/deploy/README.md](infra/deploy/README.md).

## Release the app (EAS)

Store / install builds use [EAS Build](https://docs.expo.dev/build/introduction/) from the repo root. One-time setup:

```bash
cd ui
pnpm install
pnpm eas login
pnpm eas init   # writes extra.eas.projectId into app.json
cd ..
```

Ensure `ui/.env` points at the production API (HTTPS), for example:

```
EXPO_PUBLIC_API_URL=https://memi-api-xxxxx.run.app
```

Bundle ID / package (change before first store listing if you want a different id): `app.memi.mobile`.

```bash
# App Store (build + submit to App Store Connect)
./release-ios.sh

# iOS build only
./release-ios.sh --build-only

# Android APK (direct install)
./release-android.sh

# Google Play AAB (optional submit)
./release-android.sh --play
./release-android.sh --play --submit
```

First iOS/Android build will prompt for Apple / Play credentials (or let EAS manage certificates). App Store and Play listings must already exist for the chosen bundle id / package name before submit succeeds.

Non-interactive store submit also needs:

- iOS: `submit.production.ios.ascAppId` in `ui/eas.json` (App Store Connect → App Information → Apple ID)
- Android: a Google Play service account key uploaded to EAS (`cd ui && pnpm eas credentials --platform android`)
