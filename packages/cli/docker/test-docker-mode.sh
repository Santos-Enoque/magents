#!/bin/bash
# Test Docker mode integration

echo "=== Testing Magents Docker Mode Integration ==="
echo ""

# Save current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Check if Docker image exists
if ! docker image inspect magents/agent:test >/dev/null 2>&1; then
    echo "❌ Docker image 'magents/agent:test' not found"
    echo "   Please build it first with: cd $SCRIPT_DIR && ./build.sh"
    exit 1
fi

echo "✅ Docker image found"

# Go to project root
cd "$PROJECT_ROOT"

# Enable Docker mode
echo ""
echo "1. Enabling Docker mode..."
npx magents config --docker

# Check configuration
echo ""
echo "2. Checking configuration..."
npx magents config | grep -E "(Docker mode|Docker image)"

# Create a test agent
echo ""
echo "3. Creating Docker agent..."
AGENT_ID="docker-test-$(date +%s)"
npx magents create feature/docker-test "$AGENT_ID" --docker

# List agents
echo ""
echo "4. Listing agents..."
npx magents list

# Check Docker container
echo ""
echo "5. Checking Docker container..."
docker ps --filter "name=magents-$AGENT_ID" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# Show agent logs
echo ""
echo "6. Agent logs:"
docker logs "magents-$AGENT_ID" 2>&1 | head -20

# Test Task Master in container
echo ""
echo "7. Testing Task Master in container..."
docker exec "magents-$AGENT_ID" task-master --version || echo "Task Master not available"

# Clean up
echo ""
echo "8. Cleaning up..."
read -p "Remove test agent? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx magents stop "$AGENT_ID" --remove-worktree
    docker rm -f "magents-$AGENT_ID" 2>/dev/null || true
fi

# Restore non-Docker mode
echo ""
echo "9. Restoring non-Docker mode..."
npx magents config --no-docker

echo ""
echo "=== Docker mode test complete ==="