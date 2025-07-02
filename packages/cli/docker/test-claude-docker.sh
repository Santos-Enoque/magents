#!/bin/bash
# Test Claude in Docker

echo "=== Testing Claude in Docker ==="

# Build the image
echo "1. Building Docker image..."
docker build -f Dockerfile.claude --target development -t magents/claude-agent:dev . || exit 1

# Test with proper auth mount
echo ""
echo "2. Testing Claude with mounted auth..."
CLAUDE_AUTH_DIR="$HOME/Library/Application Support/Claude"

if [ ! -f "$CLAUDE_AUTH_DIR/config.json" ]; then
    echo "❌ Claude auth not found at: $CLAUDE_AUTH_DIR"
    echo "   Please run Claude desktop app and sign in first"
    exit 1
fi

echo "✅ Found Claude auth at: $CLAUDE_AUTH_DIR"

# Run Claude version test
echo ""
echo "3. Testing claude --version..."
docker run --rm \
    -v "$CLAUDE_AUTH_DIR:/auth:ro" \
    magents/claude-agent:dev \
    claude --version

# Run interactive test
echo ""
echo "4. Testing interactive Claude..."
echo "   Type 'exit' to quit"
echo ""
docker run -it --rm \
    -v "$CLAUDE_AUTH_DIR:/auth:ro" \
    -v "$(pwd):/workspace" \
    magents/claude-agent:dev \
    bash -c "claude-setup.sh && echo '✅ Claude is working!' && claude"