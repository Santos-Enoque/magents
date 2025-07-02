#\!/bin/bash
# Comprehensive test for Claude persistence in Docker

echo "=== Testing Claude Persistence in Docker ==="
echo ""

# Ensure volume exists
docker volume create claude-data 2>/dev/null || true

# Test 1: Run Claude and check version (non-interactive)
echo "1. Testing Claude version access..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "claude --version"

# Test 2: Check if settings were copied
echo ""
echo "2. Checking settings persistence..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "ls -la /home/magents/.claude/"

# Test 3: Verify custom commands
echo ""
echo "3. Checking custom commands..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "ls -la /home/magents/.claude/commands/ 2>/dev/null || echo 'No custom commands found'"

# Test 4: Run Claude in background with tmux
echo ""
echo "4. Starting Claude agent in background..."
docker run -d --name claude-test-agent \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "tmux new-session -d -s claude 'cd /workspace && claude' && tail -f /dev/null"

sleep 3

# Check if tmux session is running
echo ""
echo "5. Checking tmux session..."
docker exec claude-test-agent tmux list-sessions

# Clean up
echo ""
echo "6. Cleaning up test container..."
docker stop claude-test-agent && docker rm claude-test-agent

echo ""
echo "=== Test Complete ==="
