#!/bin/bash
# Fix Claude authentication for Docker

echo "=== Fixing Claude Docker Authentication ==="
echo ""

# First, let's find where Claude CLI actually stores its auth
echo "1. Checking Claude CLI authentication locations..."

# Check various possible locations
AUTH_LOCATIONS=(
    "$HOME/.claude"
    "$HOME/.config/claude"
    "$HOME/Library/Application Support/claude-cli"
    "$HOME/.local/share/claude"
    "$HOME/.anthropic"
)

CLAUDE_AUTH_DIR=""
for loc in "${AUTH_LOCATIONS[@]}"; do
    if [ -d "$loc" ]; then
        echo "   Found: $loc"
        # Check if this directory has actual auth data
        if find "$loc" -name "*.json" -o -name "*.db" -o -name "*session*" -o -name "*token*" 2>/dev/null | grep -q .; then
            CLAUDE_AUTH_DIR="$loc"
            echo "   ✅ Contains data files"
        fi
    fi
done

# Also check where the npm global package stores data
echo ""
echo "2. Checking npm global Claude installation..."
NPM_CLAUDE=$(npm list -g @anthropic-ai/claude-code 2>/dev/null | grep claude-code || true)
if [ -n "$NPM_CLAUDE" ]; then
    echo "   Found: $NPM_CLAUDE"
fi

# The real issue: Claude CLI likely stores auth in a system keychain or encrypted store
echo ""
echo "3. Creating a workaround solution..."

# Create a new Dockerfile that properly handles authentication
cat > Dockerfile.claude-auth << 'EOF'
FROM node:20-slim

# Install dependencies including keychain tools
RUN apt-get update && apt-get install -y \
    git curl tmux sudo python3 python3-pip jq build-essential \
    ca-certificates gnupg \
    # Add tools for handling secrets
    libsecret-1-0 libsecret-tools \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -s /bin/bash magents && \
    echo "magents ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/magents

# Install Claude and Task Master
RUN npm install -g @anthropic-ai/claude-code task-master-ai

# Create auth wrapper script
RUN cat > /usr/local/bin/claude-wrapper << 'SCRIPT'
#!/bin/bash
# Wrapper to handle Claude authentication

# Check if we need to authenticate
if ! claude --version 2>/dev/null | grep -q "Claude Code"; then
    echo "Claude needs authentication. Starting setup..."
    claude
else
    # Run Claude with arguments
    claude "$@"
fi
SCRIPT

RUN chmod +x /usr/local/bin/claude-wrapper

USER magents
WORKDIR /home/magents

# Create directories
RUN mkdir -p ~/.claude ~/.config ~/.local/share

# Set up environment
ENV CLAUDE_DISABLE_ANALYTICS=1
ENV NODE_ENV=production

ENTRYPOINT ["/usr/local/bin/claude-wrapper"]
EOF

echo "   ✅ Created new Dockerfile with auth handling"

# Build the new image
echo ""
echo "4. Building new image..."
docker build -f Dockerfile.claude-auth -t magents/claude:auth .

# Create the volume
docker volume create claude-auth-data 2>/dev/null || true

echo ""
echo "=== Instructions ==="
echo ""
echo "Since Claude CLI uses system-level authentication (likely keychain/secret storage),"
echo "we need to authenticate inside the container. Run:"
echo ""
echo "1. Start interactive container:"
echo "   docker run -it --rm -v claude-auth-data:/home/magents -v \$(pwd):/workspace magents/claude:auth bash"
echo ""
echo "2. Inside the container, run:"
echo "   claude"
echo ""
echo "3. Complete the authentication process"
echo ""
echo "4. Exit the container (the auth should persist in the volume)"
echo ""
echo "5. Test with:"
echo "   docker run -it --rm -v claude-auth-data:/home/magents -v \$(pwd):/workspace magents/claude:auth"
echo ""

# Alternative approach: Use environment variable if available
echo "=== Alternative: Environment Variable Authentication ==="
echo ""
echo "If you have a Claude API key, you can set:"
echo "export ANTHROPIC_API_KEY='your-key-here'"
echo ""
echo "Then run containers with:"
echo "docker run -it --rm -e ANTHROPIC_API_KEY -v \$(pwd):/workspace magents/claude:auth"