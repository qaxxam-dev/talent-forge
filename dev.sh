#!/usr/bin/env bash
set -e

# TalentForge Local Development Runner
# Starts both FastAPI Backend (port 8000) and Vite Frontend (port 5173)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Cleanup background processes on exit (Ctrl+C)
cleanup() {
  echo ""
  echo "🛑 Shutting down TalentForge development servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "=================================================="
echo "⚡ Starting TalentForge MVP Development Servers"
echo "=================================================="

# Ensure port 8001 and 5173 are free
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# 1. Start FastAPI Backend
echo "🚀 [1/2] Launching Backend on http://127.0.0.1:8001..."
(cd "$BACKEND_DIR" && uv run python main.py) &
BACKEND_PID=$!

# Wait for backend port
sleep 1.5

# 2. Start Vite Frontend
echo "✨ [2/2] Launching Frontend on http://127.0.0.1:5173..."
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers running!"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:8001 (API Docs: http://localhost:8001/docs)"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
