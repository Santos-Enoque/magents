#!/bin/bash
# Claude Code wrapper script for containers
# Forwards commands to the host via Unix socket

SOCKET_PATH="${CLAUDE_BRIDGE_SOCKET:-/host/claude-bridge.sock}"

# Check if socket exists
if [ ! -S "$SOCKET_PATH" ]; then
    cat >&2 << EOF
Claude Code Bridge Error: Unable to connect to host

To use Claude Code in this container:
1. Ensure claude-bridge service is running on host:
   node /path/to/claude-bridge-server.js

2. Check socket mount at $SOCKET_PATH

3. Verify host has Claude Code installed and authenticated:
   claude --version

Alternative: Use Task Master with API-based models instead:
   task-master models --setup

For more information, see: https://github.com/magents/magents/docs/claude-bridge
EOF
    exit 1
fi

# Prepare request as a single line
ARGS_JSON=$(printf '%s\n' "$@" | jq -R . | jq -s . | tr -d '\n')
REQUEST="{\"command\":\"claude\",\"args\":${ARGS_JSON},\"env\":{},\"cwd\":\"$(pwd)\"}"

# Send request and process response
# Send as a single line with newline terminator
if ! response=$(echo "$REQUEST" | timeout 30 nc -U "$SOCKET_PATH" 2>&1); then
    echo "Error: Failed to connect to Claude bridge at $SOCKET_PATH" >&2
    echo "Details: $response" >&2
    exit 1
fi

echo "$response" | while IFS= read -r line; do
    if [ -z "$line" ]; then
        continue
    fi
    
    response=$(echo "$line" | jq -r 'try . catch empty')
    if [ -z "$response" ]; then
        continue
    fi
    
    type=$(echo "$response" | jq -r '.type // empty')
    
    case "$type" in
        stdout)
            echo "$response" | jq -r '.data // empty'
            ;;
        stderr)
            echo "$response" | jq -r '.data // empty' >&2
            ;;
        exit)
            exit_code=$(echo "$response" | jq -r '.code // 1')
            exit "$exit_code"
            ;;
        error)
            echo "Error: $(echo "$response" | jq -r '.message // "Unknown error"')" >&2
            exit 1
            ;;
        *)
            # Pass through any other output
            echo "$line"
            ;;
    esac
done