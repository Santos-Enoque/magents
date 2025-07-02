#!/bin/bash
# Magents Claude Bridge - Shell implementation for agents

SOCKET_PATH="${SOCKET_PATH:-/tmp/claude-bridge-persistent/claude-bridge.sock}"
CLAUDE_PATH="/Users/santossafrao/.npm-global/bin/claude"

echo "Starting Magents Claude Bridge (Shell)"
echo "Socket: $SOCKET_PATH"
echo "Claude: $CLAUDE_PATH"

# Test claude
if [ ! -x "$CLAUDE_PATH" ]; then
    echo "ERROR: Claude not found at $CLAUDE_PATH"
    exit 1
fi

# Clean up old socket
rm -f "$SOCKET_PATH"
mkdir -p "$(dirname "$SOCKET_PATH")"

# Simple bridge using socat or nc
while true; do
    # Read JSON request from socket
    REQUEST=$(nc -l -U "$SOCKET_PATH" | head -1)
    
    if [ -z "$REQUEST" ]; then
        continue
    fi
    
    echo "Agent request: $REQUEST"
    
    # Extract args using jq
    ARGS=$(echo "$REQUEST" | jq -r '.args[]' 2>/dev/null | tr '\n' ' ')
    
    if [ -z "$ARGS" ]; then
        echo '{"type":"error","message":"Invalid request"}' | nc -U "$SOCKET_PATH"
        continue
    fi
    
    # Execute claude
    OUTPUT=$($CLAUDE_PATH $ARGS 2>&1)
    EXIT_CODE=$?
    
    # Send response
    if [ $EXIT_CODE -eq 0 ]; then
        echo "{\"type\":\"stdout\",\"data\":$(echo "$OUTPUT" | jq -Rs .)}" | nc -U "$SOCKET_PATH"
        echo "{\"type\":\"exit\",\"code\":0}" | nc -U "$SOCKET_PATH"
    else
        echo "{\"type\":\"stderr\",\"data\":$(echo "$OUTPUT" | jq -Rs .)}" | nc -U "$SOCKET_PATH"
        echo "{\"type\":\"exit\",\"code\":$EXIT_CODE}" | nc -U "$SOCKET_PATH"
    fi
done