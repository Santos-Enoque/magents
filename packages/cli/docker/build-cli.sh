#!/bin/bash
# Build the Magents CLI with tmux session creation fixes

echo "🔨 Building Magents CLI with tmux session creation fixes..."

# Save current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHARED_DIR="$(cd "$CLI_DIR/../shared" && pwd)"

# Build shared package first
echo "1. Building @magents/shared..."
cd "$SHARED_DIR"
npm run build 2>/dev/null || npx tsc

# Build CLI package
echo "2. Building @magents/cli with tmux fixes..."
cd "$CLI_DIR"
npm run build

# Check if build succeeded
if [ -f "$CLI_DIR/dist/bin/magents.js" ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🔧 Fixed Issues:"
    echo "   - Tmux session creation with named first window"
    echo "   - Improved error handling and cleanup"
    echo "   - Added session existence verification"
    echo ""
    echo "🚀 Ready to test:"
    echo "   magents create auth-system"
    echo "   magents create user-dashboard --mode standard"
    echo "   magents create api-refactor --mode advanced --dry-run"
else
    echo "❌ Build failed!"
    exit 1
fi