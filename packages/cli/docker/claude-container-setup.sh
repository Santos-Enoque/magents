#!/bin/bash
# Proper setup for Claude Code in Docker containers

set -e

echo "=== Setting up Claude Code in Docker ==="
echo ""

# Step 1: Build the image
echo "1. Building Docker image..."
docker build -f Dockerfile.claude-working --target development -t magents/claude:dev .

# Step 2: Create a persistent volume for Claude data
echo ""
echo "2. Creating persistent volume for Claude data..."
docker volume create claude-data 2>/dev/null || true

# Step 3: Initial authentication setup
echo ""
echo "3. Setting up authentication..."
echo "   This will open Claude for initial login"
echo ""

# Run Claude with mounted volumes for first-time auth
docker run -it --rm \
    --name claude-auth-setup \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "echo 'Please authenticate with Claude:' && claude auth"

echo ""
echo "✅ Authentication complete!"

# Step 4: Copy your local Claude settings
echo ""
echo "4. Copying local Claude settings..."

# Create a temporary container to copy files
docker run -d --name claude-temp \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "sleep 300"

# Copy settings if they exist
if [ -f ~/.claude/settings.json ]; then
    docker cp ~/.claude/settings.json claude-temp:/home/magents/.claude/
    echo "   ✅ Copied settings.json"
fi

# Copy commands if they exist
if [ -d ~/.claude/commands ]; then
    docker cp ~/.claude/commands claude-temp:/home/magents/.claude/
    echo "   ✅ Copied custom commands"
fi

# Copy any project-specific settings
if [ -d .claude ]; then
    docker exec claude-temp mkdir -p /workspace/.claude
    docker cp .claude/. claude-temp:/workspace/.claude/
    echo "   ✅ Copied project settings"
fi

# Clean up temp container
docker stop claude-temp && docker rm claude-temp

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To run Claude agents:"
echo ""
echo "1. Interactive mode:"
echo "   docker run -it --rm \\"
echo "     -v claude-data:/home/magents/.claude \\"
echo "     -v \$(pwd):/workspace \\"
echo "     magents/claude:dev claude"
echo ""
echo "2. Background agent with tmux:"
echo "   docker run -d --name my-agent \\"
echo "     -v claude-data:/home/magents/.claude \\"
echo "     -v \$(pwd):/workspace \\"
echo "     magents/claude:dev \\"
echo "     'tmux new-session -d -s claude claude && tail -f /dev/null'"
echo ""
echo "3. Attach to agent:"
echo "   docker exec -it my-agent tmux attach -t claude"
echo ""