#!/bin/bash
# Quick script to verify Claude authentication is working

echo "=== Verifying Claude Docker Authentication ==="
echo ""

# Check if volume exists
if docker volume ls | grep -q claude-container-auth; then
    echo "✅ Authentication volume exists"
else
    echo "❌ Authentication volume not found. Run setup-and-test-claude.sh first"
    exit 1
fi

# Test running Claude
echo ""
echo "Testing Claude access (this should NOT ask for login)..."
echo ""

docker run -it --rm \
    -v claude-container-auth:/home/magents \
    -v $(pwd):/workspace \
    magents/claude:dev \
    claude -p "Say 'Hello from Docker!' and nothing else"

echo ""
echo "If you saw 'Hello from Docker!' without being asked to login, everything is working!"