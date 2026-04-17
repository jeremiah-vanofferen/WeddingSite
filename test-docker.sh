#!/bin/bash
# Runs all tests inside Docker — no local Node.js required.
# Usage: ./test-docker.sh [frontend|backend|all]
# Default: all

set -e

# On Git Bash / Windows, pwd -W returns a Windows-style path that Docker can mount.
# On Linux/Mac, pwd -W is not available so we fall back to plain pwd.
ROOT_WIN=$(pwd -W 2>/dev/null || pwd)
BACKEND_WIN="${ROOT_WIN}/backend"

TARGET="${1:-all}"

run_frontend() {
  echo "=============================="
  echo "  Frontend Tests (Vitest)"
  echo "=============================="
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "${ROOT_WIN}:/app" \
    -w /app \
    node:24-alpine \
    sh -c "npm install --silent && npx vitest run"
}

run_backend() {
  echo "=============================="
  echo "  Backend Tests (Jest)"
  echo "=============================="
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "${BACKEND_WIN}:/app" \
    -w /app \
    node:24-alpine \
    sh -c "npm install --silent && npm test"
}

case "$TARGET" in
  frontend) run_frontend ;;
  backend)  run_backend ;;
  all)
    run_frontend
    echo ""
    run_backend
    ;;
  *)
    echo "Usage: $0 [frontend|backend|all]"
    exit 1
    ;;
esac
