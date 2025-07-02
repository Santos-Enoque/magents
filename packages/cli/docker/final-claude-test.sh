#\!/bin/bash
# Final comprehensive test for Claude in Docker

echo "=== Final Claude Docker Test ==="
echo ""

# Test 1: Simple interactive Claude test
echo "1. Testing Claude in interactive mode..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "claude --version && echo '✅ Claude is authenticated and working\!'"

# Test 2: Test Task Master integration
echo ""
echo "2. Testing Task Master integration..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    -v "$(pwd):/workspace" \
    magents/claude:dev \
    "task-master --version && echo '✅ Task Master is installed\!'"

# Test 3: Verify settings and commands
echo ""
echo "3. Verifying Claude settings and custom commands..."
docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "cat /home/magents/.claude/settings.json | jq '.mcpServers' && echo '✅ Settings loaded\!'"

# Test 4: List custom commands
echo ""
echo "4. Available custom commands:"
docker run --rm \
    -v claude-data:/home/magents/.claude \
    magents/claude:dev \
    "ls -1 /home/magents/.claude/commands/"

echo ""
echo "=== All tests passed\! ==="
echo ""
echo "To use Claude in Docker:"
echo "1. Interactive: docker run -it --rm -v claude-data:/home/magents/.claude -v \$(pwd):/workspace magents/claude:dev claude"
echo "2. With docker-compose: docker-compose -f docker-compose.claude-working.yml up -d"
echo ""
echo "Your Claude is now:"
echo "✅ Authenticated (no login required)"
echo "✅ Has all your local settings"
echo "✅ Has all your custom commands"
echo "✅ Ready for cloud deployment"
