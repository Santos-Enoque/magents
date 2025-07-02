#!/bin/bash
# Run a Claude agent in Docker with tmux

AGENT_NAME="${1:-claude-agent-1}"
CLAUDE_AUTH_DIR="$HOME/Library/Application Support/Claude"

echo "Starting Claude agent: $AGENT_NAME"

# Check auth
if [ ! -f "$CLAUDE_AUTH_DIR/config.json" ]; then
    echo "❌ Claude auth not found"
    exit 1
fi

# Remove existing container if any
docker rm -f "$AGENT_NAME" 2>/dev/null || true

# Run agent with Claude in tmux
docker run -d \
    --name "$AGENT_NAME" \
    -v "$CLAUDE_AUTH_DIR:/auth:ro" \
    -v "$(pwd):/workspace" \
    -e AGENT_ID="$AGENT_NAME" \
    magents/claude-agent:dev \
    bash -c "claude-setup.sh && tmux new-session -d -s claude 'claude' && tail -f /dev/null"

# Wait for container to start
sleep 2

# Check if running
if docker ps | grep -q "$AGENT_NAME"; then
    echo "✅ Agent started successfully"
    echo ""
    echo "Commands:"
    echo "  Attach to Claude:  docker exec -it $AGENT_NAME tmux attach -t claude"
    echo "  View logs:         docker logs $AGENT_NAME"
    echo "  Stop agent:        docker stop $AGENT_NAME"
else
    echo "❌ Failed to start agent"
    docker logs "$AGENT_NAME"
fi