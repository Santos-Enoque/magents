#!/bin/bash

# Install the fixed magents CLI globally

echo "🚀 Installing fixed magents CLI globally..."

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MONOREPO_ROOT="$(cd "$CLI_DIR/../.." && pwd)"

echo "📦 Building packages..."

# Build shared package first
echo "1. Building @magents/shared..."
cd "$MONOREPO_ROOT/packages/shared"
npm run build || { echo "❌ Failed to build shared package"; exit 1; }

# Build CLI package
echo "2. Building @magents/cli..."
cd "$CLI_DIR"
npm run build || { echo "❌ Failed to build CLI package"; exit 1; }

# Uninstall any existing global version
echo "3. Removing old global installation..."
npm uninstall -g @magents/cli 2>/dev/null || true

# Install the fixed version globally
echo "4. Installing fixed version globally..."
cd "$MONOREPO_ROOT"
npm install -g ./packages/cli --force || { echo "❌ Failed to install globally"; exit 1; }

# Verify installation
echo ""
echo "✅ Installation complete!"
echo ""
echo "🔍 Verifying installation..."
which magents && echo "✅ magents command found at: $(which magents)"

# Test the command
echo ""
echo "🧪 Testing the installation..."
magents --version 2>/dev/null || magents --help | head -5

echo ""
echo "🎉 Success! You can now use 'magents' from anywhere with all the fixes:"
echo ""
echo "  magents create auth-system"
echo "  magents create dashboard --mode standard"
echo "  magents create api --mode advanced --dry-run"
echo "  magents ls"
echo ""
echo "All instant creation features from Task 24.1 are now available globally!"