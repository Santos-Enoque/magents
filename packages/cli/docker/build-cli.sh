#!/bin/bash
# Build the Magents CLI with Docker mode support

echo "Building Magents CLI with Docker mode support..."

# Save current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHARED_DIR="$(cd "$CLI_DIR/../shared" && pwd)"

# Build shared package first
echo "1. Building @magents/shared..."
cd "$SHARED_DIR"
npm run build 2>/dev/null || npx tsc

# Build CLI package
echo "2. Building @magents/cli..."
cd "$CLI_DIR"
npm run build

# Check if build succeeded
if [ -f "$CLI_DIR/dist/bin/magents.js" ]; then
    echo "✅ Build successful!"
    echo ""
    echo "To use the updated CLI:"
    echo "  npx magents config --docker    # Enable Docker mode"
    echo "  npx magents config --no-docker # Disable Docker mode"
    echo "  npx magents doctor             # Check Docker setup"
else
    echo "❌ Build failed!"
    exit 1
fi