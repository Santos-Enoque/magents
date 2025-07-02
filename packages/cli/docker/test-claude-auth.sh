#!/bin/bash
# Test Claude authentication in Docker

echo "=== Testing Claude Authentication in Docker ==="
echo ""

# Create a persistent volume
echo "1. Creating persistent volume for Claude data..."
docker volume create claude-data 2>/dev/null || true

# Test 1: Run Claude with volume mount and check if auth persists
echo ""
echo "2. Testing Claude with persistent volume..."
echo "   This will open Claude for authentication if needed"
echo ""

# Run Claude interactively for first-time setup
docker run -it --rm \
    --name claude-test \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "claude --version || (echo 'Claude needs authentication. Running auth...' && claude auth)"

echo ""
echo "3. Testing if authentication persisted..."

# Test if auth persisted by running non-interactively
AUTH_TEST=$(docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "claude --version 2>&1")

if echo "$AUTH_TEST" | grep -q "Claude Code"; then
    echo "✅ Authentication successful! Claude version: $AUTH_TEST"
else
    echo "❌ Authentication failed"
    echo "Output: $AUTH_TEST"
fi

# Test 2: Copy local Claude settings
echo ""
echo "4. Copying local Claude settings..."

# Start a temporary container
docker run -d --name claude-settings-copy \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "sleep 300"

# Copy settings if they exist
if [ -f ~/.claude/settings.json ]; then
    docker cp ~/.claude/settings.json claude-settings-copy:/home/magents/.claude/
    echo "   ✅ Copied settings.json"
fi

# Copy commands if they exist  
if [ -d ~/.claude/commands ]; then
    docker exec claude-settings-copy mkdir -p /home/magents/.claude/commands
    docker cp ~/.claude/commands/. claude-settings-copy:/home/magents/.claude/commands/
    echo "   ✅ Copied custom commands"
fi

# Stop temp container
docker stop claude-settings-copy && docker rm claude-settings-copy

echo ""
echo "5. Testing Claude with settings..."

# Run Claude to verify settings
docker run -it --rm \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "claude"