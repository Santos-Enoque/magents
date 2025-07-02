#!/bin/bash
set -e

echo "=== Testing Base Docker Image ==="

# Build the image
echo "1. Building Docker image..."
docker build -f Dockerfile -t magents/agent:base-test .

# Test 1: Verify tools are installed
echo -e "\n2. Testing installed tools..."
docker run --rm magents/agent:base-test bash -c "
    set -e
    echo 'Checking Node.js...'
    node --version || exit 1
    
    echo 'Checking npm...'
    npm --version || exit 1
    
    echo 'Checking yarn...'
    yarn --version || exit 1
    
    echo 'Checking pnpm...'
    pnpm --version || exit 1
    
    echo 'Checking git...'
    git --version || exit 1
    
    echo 'Checking tmux...'
    tmux -V || exit 1
    
    echo 'Checking Python...'
    python3 --version || exit 1
    
    echo 'Checking make...'
    make --version | head -1 || exit 1
    
    echo 'Checking g++...'
    g++ --version | head -1 || exit 1
    
    echo 'Checking netcat...'
    nc -h 2>&1 | head -1 || exit 1
    
    echo 'All tools verified!'
"

# Test 2: Verify non-root user
echo -e "\n3. Testing non-root user..."
docker run --rm magents/agent:base-test bash -c '
    echo "Current user: $(whoami)"
    echo "User ID: $(id -u)"
    echo "Group ID: $(id -g)"
    [ "$(whoami)" = "magents" ] || exit 1
    [ "$(id -u)" = "1001" ] || exit 1
    echo "Non-root user verified!"
'

# Test 3: Verify volumes
echo -e "\n4. Testing volume mount points..."
docker run --rm magents/agent:base-test bash -c "
    [ -d '/workspace' ] || exit 1
    [ -d '/shared' ] || exit 1
    [ -d '/agent' ] || exit 1
    echo 'Volume mount points verified!'
"

# Test 4: Test volume persistence
echo -e "\n5. Testing volume persistence..."
TEMP_VOL=$(mktemp -d)
echo "test data" > "$TEMP_VOL/test.txt"
docker run --rm -v "$TEMP_VOL:/workspace" magents/agent:base-test bash -c "
    [ -f '/workspace/test.txt' ] || exit 1
    cat /workspace/test.txt | grep 'test data' || exit 1
    echo 'new data' > /workspace/new.txt
"
[ -f "$TEMP_VOL/new.txt" ] || exit 1
rm -rf "$TEMP_VOL"
echo "Volume persistence verified!"

# Test 5: Test signal handling
echo -e "\n6. Testing signal handling..."
CONTAINER_ID=$(docker run -d magents/agent:base-test sleep 30)
sleep 2
docker kill -s TERM "$CONTAINER_ID"
sleep 2
if docker ps -q | grep -q "$CONTAINER_ID"; then
    echo "Container didn't shutdown gracefully!"
    docker kill "$CONTAINER_ID"
    exit 1
fi
echo "Signal handling verified!"

echo -e "\n=== All tests passed! ==="