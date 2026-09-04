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
