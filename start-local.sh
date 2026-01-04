#!/bin/bash
# But First Fire - Local Development Startup Script

echo "🔥 Starting But First Fire Local Development..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Check if .env exists in backend
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}❌ Missing backend/.env file${NC}"
    echo "   Copy .env.example to .env and add your API keys"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found backend/.env"

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo ""
echo -e "${YELLOW}Starting backend...${NC}"
cd "$BACKEND_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start backend in background
python app.py &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend starting on http://localhost:5001 (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 2

# Start frontend
echo ""
echo -e "${YELLOW}Starting frontend...${NC}"
cd "$FRONTEND_DIR"
python dev-server.py &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Frontend starting on http://localhost:3000 (PID: $FRONTEND_PID)"

# Wait for frontend to start
sleep 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}🔥 But First Fire is running!${NC}"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5001"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait
</CodeContent>
<parameter name="Complexity">3
