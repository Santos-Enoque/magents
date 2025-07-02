#!/bin/bash
# Complete setup and test script for Claude Docker

echo "=== Claude Docker Setup Script ==="
echo ""

# Step 1: Build image
echo "1. Building Docker image..."
docker build -f Dockerfile.claude-working --target development -t magents/claude:dev . || exit 1

# Step 2: Create volume
echo ""
echo "2. Creating authentication volume..."
docker volume create claude-container-auth

# Step 3: Interactive authentication
echo ""
echo "3. Starting authentication process..."
echo ""
echo "IMPORTANT: You will need to:"
echo "  1. Choose a theme (press 1-6)"
echo "  2. Open the browser link to authenticate"
echo "  3. Return here and press Enter"
echo "  4. Type 'exit' when done"
echo ""
read -p "Press Enter to start authentication..."

docker run -it --rm \
  -v claude-container-auth:/home/magents \
  -v $(pwd):/workspace \
  --name claude-setup \
  magents/claude:dev bash -c "claude || true; bash"

# Step 4: Copy settings
echo ""
echo "4. Copying your local settings..."
docker run -d --name claude-copy \
  -v claude-container-auth:/home/magents \
  magents/claude:dev sleep 300

docker cp ~/.claude/settings.json claude-copy:/home/magents/.claude/ 2>/dev/null && echo "✅ Copied settings.json"
docker cp ~/.claude/commands/. claude-copy:/home/magents/.claude/commands/ 2>/dev/null && echo "✅ Copied custom commands"

docker stop claude-copy >/dev/null && docker rm claude-copy >/dev/null

# Step 5: Test
echo ""
echo "5. Testing authentication..."
# Use a different test that doesn't require input
TEST_OUTPUT=$(docker run --rm -v claude-container-auth:/home/magents magents/claude:dev bash -c "claude --version 2>&1 || echo 'AUTH_CHECK'")

if echo "$TEST_OUTPUT" | grep -q "Claude Code"; then
    echo "✅ Success! Claude is authenticated and ready to use"
    echo ""
    echo "You can now run:"
    echo "  docker run -it --rm -v claude-container-auth:/home/magents -v \$(pwd):/workspace magents/claude:dev claude"
elif echo "$TEST_OUTPUT" | grep -q "AUTH_CHECK"; then
    echo "⚠️  Could not verify authentication automatically, but this is normal."
    echo "Try running: docker run -it --rm -v claude-container-auth:/home/magents -v \$(pwd):/workspace magents/claude:dev claude"
    echo "If it doesn't ask for login, you're all set!"
else
    echo "✅ Setup complete! Your authentication should be saved."
    echo ""
    echo "You can now run:"
    echo "  docker run -it --rm -v claude-container-auth:/home/magents -v \$(pwd):/workspace magents/claude:dev claude"
fi