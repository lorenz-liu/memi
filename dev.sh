#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  trap - EXIT INT TERM
  for pid in "${PIDS[@]-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(cd "$ROOT/infra" && exec uv run python main.py) &
PIDS+=("$!")

(cd "$ROOT/ui" && exec pnpm start) &
PIDS+=("$!")

wait
