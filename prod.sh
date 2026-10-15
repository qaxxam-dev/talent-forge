#!/usr/bin/env bash
set -e

# TalentForge Production Runner
# Builds frontend and launches both Backend (:8000) and Frontend (:3000)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

cleanup() {
  echo ""
  echo "🛑 Shutting down TalentForge production servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "=================================================="
echo "🚀 Starting TalentForge Production Servers"
echo "=================================================="

# Ensure ports 8001 and 3000 are free from zombie processes
fuser -k 8001/tcp 2>/dev/null || lsof -ti:8001 | xargs kill -9 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 1. Install dependencies & build frontend if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install --production=false)
fi

if [ ! -d "$FRONTEND_DIR/build" ]; then
  echo "📦 Building frontend production bundle..."
  (cd "$FRONTEND_DIR" && npm run build)
fi

# 2. Launch FastAPI Backend on port 8001
echo "⚡ Starting Backend on http://127.0.0.1:8001..."
(cd "$BACKEND_DIR" && BACKEND_PORT=8001 ENVIRONMENT=production uv run python main.py) &
BACKEND_PID=$!

sleep 1.5

# 3. Launch Frontend SSR on port 3000
echo "✨ Starting Frontend SSR on http://127.0.0.1:3000..."
(cd "$FRONTEND_DIR" && PORT=3000 npm run start) &
FRONTEND_PID=$!

echo ""
echo "✅ Both services running in production mode!"
echo "   • Frontend: http://127.0.0.1:3000"
echo "   • Backend:  http://127.0.0.1:8001"
echo ""
echo "Reverse proxy (Nginx/Caddy) should point:"
echo "   • /v1/*  -> http://127.0.0.1:8001"
echo "   • /*     -> http://127.0.0.1:3000"
echo ""

wait
