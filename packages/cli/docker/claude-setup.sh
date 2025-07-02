#!/bin/bash
# Setup Claude authentication in container

set -e

echo "=== Claude Code Container Setup ==="

# Check if already authenticated (Claude stores auth in Application Support)
if [ -f "/home/magents/Library/Application Support/Claude/config.json" ]; then
    echo "✅ Claude already authenticated"
else
    echo "⚠️  Claude authentication required"
    
    # Option 1: Use mounted auth from host
    if [ -d "/auth" ] && [ -f "/auth/config.json" ]; then
        echo "📋 Copying authentication from host..."
        mkdir -p "/home/magents/Library/Application Support/Claude"
        cp -r /auth/* "/home/magents/Library/Application Support/Claude/"
        # Also symlink for compatibility
        mkdir -p /home/magents/.config
        ln -sf "/home/magents/Library/Application Support/Claude" /home/magents/.config/claude
        echo "✅ Authentication copied"
    
    # Option 2: Use environment variable
    elif [ -n "$CLAUDE_AUTH_TOKEN" ]; then
        echo "🔑 Setting up authentication from environment..."
        mkdir -p /home/magents/.config/claude
        echo "{\"token\": \"$CLAUDE_AUTH_TOKEN\"}" > /home/magents/.config/claude/config.json
        echo "✅ Authentication configured"
    
    # Option 3: Interactive setup (development only)
    elif [ -t 0 ]; then
        echo "🔐 Starting interactive authentication..."
        claude auth
    else
        echo "❌ No authentication method available"
        echo "   Mount auth directory or set CLAUDE_AUTH_TOKEN"
        exit 1
    fi
fi

# Verify Claude is working
echo "🔍 Verifying Claude installation..."
claude --version || exit 1

# Execute the main command
echo "🚀 Starting Claude Code..."
exec "$@"