#!/bin/bash
set -e

echo "=== Testing Docker Image Variants ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_command() {
    local container=$1
    local command=$2
    local expected=$3
    
    if docker exec "$container" bash -c "$command" &>/dev/null; then
        echo -e "${GREEN}✓${NC} $expected"
        return 0
    else
        echo -e "${RED}✗${NC} $expected"
        return 1
    fi
}

# Build both variants
echo "1. Building image variants..."
echo "   Building production image..."
docker build --build-arg BUILD_TARGET=production -f Dockerfile.multi-stage -t magents/agent:test-prod . >/dev/null 2>&1
echo "   Building development image..."
docker build --build-arg BUILD_TARGET=development -f Dockerfile.multi-stage -t magents/agent:test-dev . >/dev/null 2>&1
echo ""

# Test production image
echo "2. Testing PRODUCTION image..."
PROD_CONTAINER=$(docker run -d --name test-prod-container magents/agent:test-prod sleep 300)

# Common tools (should exist in both)
test_command test-prod-container "which git" "Git installed"
test_command test-prod-container "which tmux" "Tmux installed"
test_command test-prod-container "which task-master" "Task Master installed"
test_command test-prod-container "which claude" "Claude wrapper installed"
test_command test-prod-container "which node" "Node.js installed"
test_command test-prod-container "curl -f http://localhost:3999/health" "Health check endpoint"

# Dev tools (should NOT exist in production)
echo "   Verifying dev tools are NOT installed:"
if ! docker exec test-prod-container which vim &>/dev/null; then
    echo -e "${GREEN}✓${NC} vim not installed (expected)"
else
    echo -e "${RED}✗${NC} vim found (should not be in production)"
fi

if ! docker exec test-prod-container which htop &>/dev/null; then
    echo -e "${GREEN}✓${NC} htop not installed (expected)"
else
    echo -e "${RED}✗${NC} htop found (should not be in production)"
fi

# Check environment
ENV_CHECK=$(docker exec test-prod-container printenv NODE_ENV)
if [ "$ENV_CHECK" = "production" ]; then
    echo -e "${GREEN}✓${NC} NODE_ENV=production"
else
    echo -e "${RED}✗${NC} NODE_ENV incorrect: $ENV_CHECK"
fi

docker stop test-prod-container >/dev/null
docker rm test-prod-container >/dev/null
echo ""

# Test development image
echo "3. Testing DEVELOPMENT image..."
DEV_CONTAINER=$(docker run -d --name test-dev-container magents/agent:test-dev sleep 300)

# Common tools (should exist in both)
test_command test-dev-container "which git" "Git installed"
test_command test-dev-container "which tmux" "Tmux installed"
test_command test-dev-container "which task-master" "Task Master installed"
test_command test-dev-container "which claude" "Claude wrapper installed"
test_command test-dev-container "which node" "Node.js installed"

# Dev tools (SHOULD exist in development)
echo "   Verifying dev tools ARE installed:"
test_command test-dev-container "which vim" "vim installed"
test_command test-dev-container "which htop" "htop installed"
test_command test-dev-container "which strace" "strace installed"
test_command test-dev-container "which tcpdump" "tcpdump installed"
test_command test-dev-container "which lsof" "lsof installed"
test_command test-dev-container "which nodemon" "nodemon installed"

# Check environment
ENV_CHECK=$(docker exec test-dev-container printenv NODE_ENV)
if [ "$ENV_CHECK" = "development" ]; then
    echo -e "${GREEN}✓${NC} NODE_ENV=development"
else
    echo -e "${RED}✗${NC} NODE_ENV incorrect: $ENV_CHECK"
fi

DEBUG_CHECK=$(docker exec test-dev-container printenv DEBUG)
if [ "$DEBUG_CHECK" = "true" ]; then
    echo -e "${GREEN}✓${NC} DEBUG=true"
else
    echo -e "${RED}✗${NC} DEBUG not set"
fi

docker stop test-dev-container >/dev/null
docker rm test-dev-container >/dev/null
echo ""

# Compare image sizes
echo "4. Image size comparison:"
echo "   Production: $(docker images magents/agent:test-prod --format '{{.Size}}')"
echo "   Development: $(docker images magents/agent:test-dev --format '{{.Size}}')"
echo ""

# Cleanup
docker rmi magents/agent:test-prod magents/agent:test-dev >/dev/null 2>&1

echo "=== All variant tests completed! ==="