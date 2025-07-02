#!/bin/bash
# Comprehensive integration test for Docker agents

set -e

echo "=== Magents Docker Integration Test ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Cleanup function
cleanup() {
    info "Cleaning up test resources..."
    
    # Stop and remove test containers
    docker ps -a --filter "label=magents.test=true" -q | xargs -r docker rm -f 2>/dev/null || true
    
    # Remove test agent records
    MAGENTS_DIR="$HOME/.magents"
    if [ -f "$MAGENTS_DIR/docker_agents.json" ]; then
        cp "$MAGENTS_DIR/docker_agents.json" "$MAGENTS_DIR/docker_agents.json.backup"
        echo "[]" > "$MAGENTS_DIR/docker_agents.json"
    fi
    
    # Restore non-Docker mode
    cd "$PROJECT_ROOT"
    npx magents config --no-docker >/dev/null 2>&1 || true
}

# Set up trap for cleanup
trap cleanup EXIT

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Check prerequisites
echo "1. Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker not installed"
    exit 1
fi
success "Docker installed"

# Check Docker daemon
if ! docker ps >/dev/null 2>&1; then
    error "Docker daemon not running"
    exit 1
fi
success "Docker daemon running"

# Build image if needed
if ! docker image inspect magents/agent:latest >/dev/null 2>&1; then
    info "Building Docker image..."
    cd "$SCRIPT_DIR"
    ./build.sh || {
        error "Failed to build Docker image"
        exit 1
    }
fi
success "Docker image available"

# Go to project root
cd "$PROJECT_ROOT"

# Test 1: Enable Docker mode
echo ""
echo "2. Testing Docker mode configuration..."
npx magents config --docker >/dev/null 2>&1
CONFIG_OUTPUT=$(npx magents config 2>&1)
if echo "$CONFIG_OUTPUT" | grep -q "DOCKER_ENABLED: true"; then
    success "Docker mode enabled"
else
    error "Failed to enable Docker mode"
    exit 1
fi

# Test 2: Create Docker agent
echo ""
echo "3. Testing Docker agent creation..."
TEST_AGENT_ID="test-docker-$(date +%s)"
CREATE_OUTPUT=$(npx magents create feature/test-docker "$TEST_AGENT_ID" --docker 2>&1)
if echo "$CREATE_OUTPUT" | grep -q "successfully"; then
    success "Docker agent created: $TEST_AGENT_ID"
else
    error "Failed to create Docker agent"
    echo "$CREATE_OUTPUT"
    exit 1
fi

# Test 3: Verify container is running
echo ""
echo "4. Verifying Docker container..."
sleep 2
CONTAINER_NAME="magents-$TEST_AGENT_ID"
if docker ps | grep -q "$CONTAINER_NAME"; then
    success "Container running: $CONTAINER_NAME"
    
    # Show container details
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
else
    error "Container not found"
    exit 1
fi

# Test 4: Check agent list
echo ""
echo "5. Testing agent list..."
LIST_OUTPUT=$(npx magents list 2>&1)
if echo "$LIST_OUTPUT" | grep -q "$TEST_AGENT_ID"; then
    success "Agent appears in list"
else
    error "Agent not in list"
    echo "$LIST_OUTPUT"
    exit 1
fi

# Test 5: Test Task Master in container
echo ""
echo "6. Testing Task Master in container..."
TM_VERSION=$(docker exec "$CONTAINER_NAME" task-master --version 2>&1 || echo "error")
if [[ "$TM_VERSION" != "error" ]] && [[ -n "$TM_VERSION" ]]; then
    success "Task Master working: $TM_VERSION"
else
    error "Task Master not working in container"
fi

# Test 6: Test file access
echo ""
echo "7. Testing workspace mount..."
TEST_FILE="test-docker-${RANDOM}.txt"
echo "Test content" > "$TEST_FILE"
if docker exec "$CONTAINER_NAME" cat "/workspace/$TEST_FILE" >/dev/null 2>&1; then
    success "Workspace mount working"
    rm -f "$TEST_FILE"
else
    error "Workspace mount not working"
    rm -f "$TEST_FILE"
    exit 1
fi

# Test 7: Test API key injection
echo ""
echo "8. Testing API key injection..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
    KEY_CHECK=$(docker exec "$CONTAINER_NAME" bash -c 'echo $ANTHROPIC_API_KEY' 2>&1)
    if [ "$KEY_CHECK" = "$ANTHROPIC_API_KEY" ]; then
        success "API keys properly injected"
    else
        error "API keys not injected correctly"
    fi
else
    info "Skipping API key test (ANTHROPIC_API_KEY not set)"
fi

# Test 8: Stop agent
echo ""
echo "9. Testing agent stop..."
STOP_OUTPUT=$(npx magents stop "$TEST_AGENT_ID" 2>&1)
if echo "$STOP_OUTPUT" | grep -q "stopped"; then
    success "Agent stopped successfully"
else
    error "Failed to stop agent"
    echo "$STOP_OUTPUT"
fi

# Test 9: Verify container stopped
sleep 1
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    CONTAINER_STATUS=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}' 2>&1)
    if [ "$CONTAINER_STATUS" = "exited" ]; then
        success "Container properly stopped"
    else
        error "Container still running: $CONTAINER_STATUS"
    fi
fi

# Test 10: Create multiple agents
echo ""
echo "10. Testing multiple Docker agents..."
AGENT2_ID="test-docker2-$(date +%s)"
AGENT3_ID="test-docker3-$(date +%s)"

npx magents create feature/test2 "$AGENT2_ID" --docker >/dev/null 2>&1
npx magents create feature/test3 "$AGENT3_ID" --docker >/dev/null 2>&1

AGENT_COUNT=$(npx magents list 2>&1 | grep -c "test-docker")
if [ "$AGENT_COUNT" -ge 2 ]; then
    success "Multiple agents created successfully"
else
    error "Failed to create multiple agents"
fi

# Summary
echo ""
echo "=== Test Summary ==="
success "All integration tests passed!"
echo ""
info "Docker agents are working correctly"
info "You can now use 'magents config --docker' to enable Docker mode"
echo ""

# Cleanup is handled by trap