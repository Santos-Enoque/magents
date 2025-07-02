#!/bin/bash

# Install magents globally with the fixed version

echo "🚀 Installing fixed magents command globally..."

# Get the directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MAGENTS_BIN="$CLI_DIR/dist/bin/magents.js"

# Check if the built file exists
if [ ! -f "$MAGENTS_BIN" ]; then
    echo "❌ Error: Built magents.js not found at $MAGENTS_BIN"
    echo "Run ./build-cli.sh first"
    exit 1
fi

# Create global bin directory if it doesn't exist
mkdir -p "$HOME/bin"

# Create a wrapper script in ~/bin
cat > "$HOME/bin/magents" << EOF
#!/bin/bash
# Magents CLI wrapper with fixes
exec "$MAGENTS_BIN" "\$@"
EOF

# Make it executable
chmod +x "$HOME/bin/magents"

echo "✅ Installed magents to $HOME/bin/magents"

# Check if ~/bin is in PATH
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo ""
    echo "⚠️  $HOME/bin is not in your PATH"
    echo ""
    echo "Add this to your ~/.zshrc or ~/.bashrc:"
    echo 'export PATH="$HOME/bin:$PATH"'
    echo ""
    echo "Then run: source ~/.zshrc"
else
    echo "✅ $HOME/bin is already in PATH"
    echo ""
    echo "🎉 You can now use 'magents' from anywhere!"
    echo ""
    echo "Try: magents ls"
fi