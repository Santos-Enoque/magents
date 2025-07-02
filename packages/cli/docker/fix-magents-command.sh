#!/bin/bash

echo "🔧 Fixing magents command..."

# Remove any existing magents alias from .zshrc
echo "1. Removing broken magents alias from ~/.zshrc..."
sed -i.bak '/alias magents=/d' ~/.zshrc
echo "   ✓ Removed magents alias lines"

# Check if npm global bin is in PATH
NPM_GLOBAL_BIN=$(npm config get prefix)/bin
echo ""
echo "2. Checking if npm global bin is in PATH..."
if [[ ":$PATH:" == *":$NPM_GLOBAL_BIN:"* ]]; then
    echo "   ✓ $NPM_GLOBAL_BIN is in PATH"
else
    echo "   ⚠ Adding npm global bin to PATH..."
    echo "export PATH=\"$NPM_GLOBAL_BIN:\$PATH\"" >> ~/.zshrc
    echo "   ✓ Added to ~/.zshrc"
fi

# Verify global magents exists
echo ""
echo "3. Verifying global magents installation..."
if [ -f "$NPM_GLOBAL_BIN/magents" ]; then
    echo "   ✓ Found magents at $NPM_GLOBAL_BIN/magents"
    echo "   Version: $($NPM_GLOBAL_BIN/magents --version 2>/dev/null || echo 'unknown')"
else
    echo "   ❌ magents not found in npm global bin"
    echo "   Run: npm install -g /path/to/magents/packages/cli"
fi

echo ""
echo "4. Testing the command..."
echo "   Running: $NPM_GLOBAL_BIN/magents --version"
$NPM_GLOBAL_BIN/magents --version

echo ""
echo "✅ Fix applied!"
echo ""
echo "Now run these commands:"
echo "   source ~/.zshrc"
echo "   magents --version"
echo ""
echo "If it still opens Node.js REPL, run:"
echo "   unalias magents"
echo "   hash -r"
echo "   magents --version"