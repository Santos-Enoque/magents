#!/bin/bash
# Connect existing container to Claude bridge

echo "=== Connecting Container to Claude Bridge ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if container is running
if ! docker ps | grep -q magents-test; then
    echo -e "${RED}✗ Container 'magents-test' is not running${NC}"
    echo "Start it first with: ./quick-test.sh --keep"
    exit 1
fi

# Check if persistent bridge exists
BRIDGE_SOCKET="/tmp/claude-bridge-persistent/claude-bridge.sock"
if [ ! -S "$BRIDGE_SOCKET" ]; then
    echo -e "${RED}✗ Bridge server not running${NC}"
    echo "Start it first with: ./start-bridge-server.sh"
    exit 1
fi

echo -e "${YELLOW}Current container status:${NC}"
docker ps --filter name=magents-test --format "table {{.Names}}\t{{.Status}}"
echo ""

echo -e "${YELLOW}Stopping current container...${NC}"
docker stop magents-test >/dev/null

echo -e "${YELLOW}Starting container with bridge connection...${NC}"
docker run -d \
    --name magents-test-bridge \
    -v "$(pwd)/../../../:/workspace" \
    -v "$BRIDGE_SOCKET:/host/claude-bridge.sock" \
    -e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock \
    magents/agent:test \
    tail -f /dev/null

echo -e "${YELLOW}Fixing socket permissions...${NC}"
docker exec magents-test-bridge sudo chown magents:magents /host/claude-bridge.sock 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Container connected to bridge${NC}"
echo ""
echo -e "${BLUE}Test the connection:${NC}"
echo "  docker exec magents-test-bridge claude --version"
echo ""
echo -e "${BLUE}Enter the container:${NC}"
echo "  docker exec -it magents-test-bridge bash"
echo ""
echo -e "${BLUE}Use Claude interactively:${NC}"
echo "  docker exec -it magents-test-bridge claude"