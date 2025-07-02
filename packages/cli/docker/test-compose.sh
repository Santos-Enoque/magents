#!/bin/bash
set -e

echo "=== Testing Magents with Docker Compose ==="
echo ""

# Set environment variables
export PROJECT_PATH="$(cd ../../.. && pwd)"
export MAGENTS_SHARED="${HOME}/.magents/shared"

# Create shared directory if it doesn't exist
mkdir -p "$MAGENTS_SHARED"

echo "1. Environment setup:"
echo "   PROJECT_PATH: $PROJECT_PATH"
echo "   MAGENTS_SHARED: $MAGENTS_SHARED"
echo ""

echo "2. Starting services with docker-compose..."
docker-compose up -d

echo ""
echo "3. Waiting for services to be healthy..."
sleep 10

echo ""
echo "4. Service status:"
docker-compose ps

echo ""
echo "5. Testing Claude bridge in agent-1:"
docker-compose exec agent-1 claude --version || echo "Note: Claude bridge may need host Claude Code running"

echo ""
echo "6. Testing Task Master in agent-1:"
docker-compose exec agent-1 task-master --version

echo ""
echo "7. Checking health endpoints:"
curl -s http://localhost:3999/health | jq '.' || echo "Health check on default port"

echo ""
echo "8. To interact with agents:"
echo "   • Agent 1: docker-compose exec agent-1 bash"
echo "   • Agent 2: docker-compose exec agent-2 bash"
echo ""
echo "9. To view logs:"
echo "   • All services: docker-compose logs -f"
echo "   • Claude bridge: docker-compose logs -f claude-bridge"
echo ""
echo "10. To stop services:"
echo "    • docker-compose down"
echo "    • docker-compose down -v  (also remove volumes)"