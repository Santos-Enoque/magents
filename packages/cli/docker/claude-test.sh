#!/bin/bash
# Test Claude bridge functionality

echo "=== Claude Bridge Test ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if container is running
if ! docker ps | grep -q magents-test; then
    echo -e "${RED}✗ Container 'magents-test' is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Checking Claude on host machine:${NC}"
# Check if claude is installed on host
if command -v claude &> /dev/null; then
    HOST_CLAUDE_VERSION=$(claude --version 2>&1 || echo "Error getting version")
    echo -e "${GREEN}✓ Claude installed on host${NC}"
    echo "   Version: $HOST_CLAUDE_VERSION"
else
    echo -e "${RED}✗ Claude NOT installed on host${NC}"
    echo ""
    echo "   Claude must be installed on your host machine for the bridge to work."
    echo "   Install with one of:"
    echo "     • npm install -g @anthropic-ai/claude-cli"
    echo "     • brew install claude"
    echo ""
    echo "   Without Claude on the host, the container can only use Task Master"
    echo "   with API-based models (not the Claude Code bridge)."
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Checking bridge socket in container:${NC}"
# Check socket in container
SOCKET_INFO=$(docker exec magents-test ls -la /host/claude-bridge.sock 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Socket exists${NC}"
    echo "   $SOCKET_INFO"
else
    echo -e "${RED}✗ Socket not found${NC}"
    echo "   The bridge server may not be running"
fi

echo ""
echo -e "${YELLOW}3. Testing Claude command in container:${NC}"
echo "   Running: docker exec magents-test claude --version"
echo "   (This may take a moment...)"

# Test claude with timeout
if timeout 5 docker exec magents-test claude --version &>/dev/null; then
    VERSION=$(docker exec magents-test claude --version 2>&1)
    echo -e "${GREEN}✓ Claude bridge working!${NC}"
    echo "   Response: $VERSION"
else
    echo -e "${RED}✗ Claude bridge not responding${NC}"
    echo ""
    echo "   This usually means:"
    echo "   1. The bridge server on the host has stopped"
    echo "   2. Claude is not installed on the host"
    echo "   3. Socket permissions need to be fixed"
    echo ""
    echo "   To use Claude in the container, you need to:"
    echo "   1. Start a fresh environment: ./start-test-environment.sh"
    echo "   2. Keep the bridge server running (don't close the terminal)"
    echo "   3. In a new terminal, use: docker exec -it magents-test claude"
fi

echo ""
echo -e "${YELLOW}4. Alternative: Use Task Master with API keys${NC}"
echo "   If you don't need Claude Code bridge, you can use Task Master directly:"
echo ""
echo "   docker exec -it magents-test bash"
echo "   export ANTHROPIC_API_KEY='your-key'"
echo "   task-master --help"