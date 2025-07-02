#!/bin/bash
set -e

echo "=== Magents Container Verification ==="
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
    echo "Start the container first with: ./start-test-environment.sh"
    exit 1
fi

echo -e "${GREEN}✓ Container 'magents-test' is running${NC}"
echo ""

echo -e "${YELLOW}Testing Core Functionality:${NC}"

# Test health endpoint
echo -n "  Health endpoint: "
if health_status=$(docker exec magents-test curl -sf http://localhost:3999/health 2>/dev/null); then
    status=$(echo "$health_status" | jq -r '.status' 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ $status${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test Task Master
echo -n "  Task Master: "
if version=$(docker exec magents-test task-master --version 2>/dev/null); then
    echo -e "${GREEN}✓ v$version${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test workspace access
echo -n "  Workspace access: "
if docker exec magents-test test -w /workspace 2>/dev/null; then
    file_count=$(docker exec magents-test bash -c 'find /workspace -maxdepth 1 -type f 2>/dev/null | wc -l' || echo "0")
    echo -e "${GREEN}✓ Writable ($file_count files)${NC}"
else
    echo -e "${RED}✗ Not accessible${NC}"
fi

# Test git
echo -n "  Git: "
if git_version=$(docker exec magents-test git --version 2>/dev/null); then
    echo -e "${GREEN}✓ $git_version${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test tmux
echo -n "  Tmux: "
if tmux_version=$(docker exec magents-test tmux -V 2>/dev/null); then
    echo -e "${GREEN}✓ $tmux_version${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test python
echo -n "  Python: "
if python_version=$(docker exec magents-test python3 --version 2>/dev/null); then
    echo -e "${GREEN}✓ $python_version${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test node/npm
echo -n "  Node.js: "
if node_version=$(docker exec magents-test node --version 2>/dev/null); then
    echo -e "${GREEN}✓ $node_version${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo ""
echo -e "${YELLOW}Claude Bridge Status:${NC}"

# Test Claude bridge socket
echo -n "  Socket exists: "
if docker exec magents-test test -S /host/claude-bridge.sock 2>/dev/null; then
    perms=$(docker exec magents-test ls -la /host/claude-bridge.sock | awk '{print $1, $3, $4}')
    echo -e "${GREEN}✓ $perms${NC}"
    
    # Test socket permissions
    echo -n "  Socket access: "
    if docker exec magents-test test -r /host/claude-bridge.sock -a -w /host/claude-bridge.sock 2>/dev/null; then
        echo -e "${GREEN}✓ Read/Write${NC}"
    else
        echo -e "${RED}✗ Permission denied${NC}"
        echo "    Fix with: docker exec magents-test sudo chown magents:magents /host/claude-bridge.sock"
    fi
else
    echo -e "${RED}✗ Socket not found${NC}"
    echo "    Start bridge with: ./start-test-environment.sh"
fi

echo ""
echo -e "${BLUE}Interactive Commands:${NC}"
echo "  Enter container:      docker exec -it magents-test bash"
echo "  Start tmux:           docker exec -it magents-test tmux"
echo "  Check health:         docker exec magents-test curl -s localhost:3999/health | jq"
echo "  Run Task Master:      docker exec magents-test task-master list"
echo ""
echo -e "${BLUE}Cleanup:${NC}"
echo "  Stop container:       docker rm -f magents-test"
echo ""

# Show container info
echo -e "${YELLOW}Container Info:${NC}"
docker ps --filter name=magents-test --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"