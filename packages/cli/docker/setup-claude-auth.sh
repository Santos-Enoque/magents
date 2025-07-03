#!/bin/bash
# Setup Claude authentication in Docker with proper persistence

set -e

echo "=== Claude Docker Authentication Setup ==="
echo ""
echo "This script will help you authenticate Claude in Docker."
echo "The authentication will persist across container restarts."
echo ""

# Step 1: Build the image if not exists
if ! docker images | grep -q "magents/claude.*dev"; then
    echo "Building Docker image..."
    docker build -f Dockerfile.claude-working --target development -t magents/claude:dev .
fi

# Step 2: Create volumes
echo "Creating persistent volumes..."
docker volume create claude-data 2>/dev/null || true
docker volume create claude-container-auth 2>/dev/null || true

# Step 3: Run interactive container for authentication
echo ""
echo "Starting Claude for authentication..."
echo "You will need to:"
echo "1. Choose a theme (press a number 1-6)"
echo "2. Open the browser link to authenticate"
echo "3. Return to terminal and press Enter"
echo "4. Type 'exit' to save and exit"
echo ""
read -p "Press Enter to continue..."

# Run Claude interactively for authentication
docker run -it --rm \
    --name claude-auth \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    -e CLAUDE_DISABLE_ANALYTICS=1 \
    magents/claude:dev \
    bash -c "claude || true"

# Step 4: Copy additional local settings
echo ""
echo "Copying your local settings..."

# Start a temporary container
docker run -d --name claude-copy-settings \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    sleep 300

# Copy entire .claude directory structure
if [ -d ~/.claude ]; then
    # Copy settings.json
    if [ -f ~/.claude/settings.json ]; then
        docker cp ~/.claude/settings.json claude-copy-settings:/home/magents/.claude/
        echo "✅ Copied settings.json"
    fi
    
    # Copy commands directory
    if [ -d ~/.claude/commands ]; then
        docker exec claude-copy-settings mkdir -p /home/magents/.claude/commands
        for cmd in ~/.claude/commands/*; do
            if [ -f "$cmd" ]; then
                docker cp "$cmd" claude-copy-settings:/home/magents/.claude/commands/
            fi
        done
        echo "✅ Copied custom commands"
    fi
    
    # Copy any nested .claude directory
    if [ -d ~/.claude/.claude ]; then
        docker exec claude-copy-settings mkdir -p /home/magents/.claude/.claude
        docker cp ~/.claude/.claude/. claude-copy-settings:/home/magents/.claude/.claude/
        echo "✅ Copied nested .claude settings"
    fi
    
    # Copy statsig data (might contain session data)
    if [ -d ~/.claude/statsig ]; then
        docker exec claude-copy-settings mkdir -p /home/magents/.claude/statsig
        docker cp ~/.claude/statsig/. claude-copy-settings:/home/magents/.claude/statsig/
        echo "✅ Copied statsig data"
    fi
fi

# Fix permissions
docker exec claude-copy-settings chown -R magents:magents /home/magents/.claude

# Stop temp container
docker stop claude-copy-settings && docker rm claude-copy-settings

# Step 5: Copy auth to claude-container-auth volume (used by magents)
echo ""
echo "Setting up claude-container-auth volume..."
docker run --rm \
    -v claude-data:/source \
    -v claude-container-auth:/target \
    alpine:latest \
    sh -c "cp -r /source /target/Library && mkdir -p /target/Library/Application\ Support && mv /target/Library /target/Library/Application\ Support/Claude || true"

echo ""
echo "=== Testing Authentication ==="

# Test if Claude works without asking for auth
AUTH_TEST=$(docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    bash -c "timeout 5 claude --version 2>&1 || echo 'NEEDS_AUTH'")

if echo "$AUTH_TEST" | grep -q "Claude Code"; then
    echo "✅ Authentication successful!"
    echo ""
    echo "You can now run Claude without being asked to login:"
    echo "docker run -it --rm -v claude-data:/home/magents/.claude -v \$(pwd):/workspace magents/claude:dev claude"
else
    echo "⚠️  Authentication may not have completed properly."
    echo "Please run the script again and complete the authentication process."
fi