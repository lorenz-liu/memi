#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_PID=""

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi
  echo "Releasing port ${port} (pid ${pids})"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.4
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

free_port 8000
free_port 8081

(cd "$ROOT/infra" && uv run python main.py) &
API_PID="$!"

echo
echo "API   http://127.0.0.1:8000"
echo "Expo  http://localhost:8081"
echo "Press i = iOS simulator, a = Android emulator, or scan the QR with Expo Go."
echo

cd "$ROOT/ui"
pnpm exec expo start --port 8081
