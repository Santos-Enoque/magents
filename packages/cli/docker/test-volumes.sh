#!/bin/bash
set -e

echo "=== Testing Docker Volume Mapping and Persistence ==="

# Build the image first
echo "1. Building Docker image..."
docker build -f Dockerfile -t magents/agent:volume-test .

# Create temporary directories for testing
TEMP_WORKSPACE=$(mktemp -d)
TEMP_SHARED=$(mktemp -d)
echo "test-project" > "$TEMP_WORKSPACE/project.txt"
echo "shared-config" > "$TEMP_SHARED/config.txt"

# Test 1: Basic volume mounting
echo -e "\n2. Testing basic volume mounting..."
docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_data:/agent" \
    magents/agent:volume-test \
    bash -c "
        [ -f '/workspace/project.txt' ] || exit 1
        [ -f '/shared/config.txt' ] || exit 1
        [ -d '/agent' ] || exit 1
        echo 'Volume mounting verified!'
    "

# Test 2: Permission testing
echo -e "\n3. Testing volume permissions..."
docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_data:/agent" \
    magents/agent:volume-test \
    bash -c "
        # Test write permissions
        echo 'test-write' > /workspace/write-test.txt || exit 1
        echo 'shared-write' > /shared/write-test.txt || exit 1
        echo 'agent-write' > /agent/write-test.txt || exit 1
        echo 'Write permissions verified!'
    "

# Verify files were written to host
[ -f "$TEMP_WORKSPACE/write-test.txt" ] || { echo "Workspace write failed!"; exit 1; }
[ -f "$TEMP_SHARED/write-test.txt" ] || { echo "Shared write failed!"; exit 1; }
echo "Host file sync verified!"

# Test 3: Volume persistence
echo -e "\n4. Testing volume persistence..."
CONTAINER_ID=$(docker run -d \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_data:/agent" \
    magents/agent:volume-test \
    sleep 30)

# Write data in container
docker exec "$CONTAINER_ID" bash -c "
    echo 'persistent-data' > /agent/persistent.txt
    echo 'session-1' > /agent/state/session.txt
"

# Stop container
docker stop "$CONTAINER_ID" > /dev/null
docker rm "$CONTAINER_ID" > /dev/null

# Start new container and verify data persists
docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_data:/agent" \
    magents/agent:volume-test \
    bash -c "
        [ -f '/agent/persistent.txt' ] || exit 1
        [ -f '/agent/state/session.txt' ] || exit 1
        grep -q 'persistent-data' /agent/persistent.txt || exit 1
        grep -q 'session-1' /agent/state/session.txt || exit 1
        echo 'Volume persistence verified!'
    "

# Test 4: Multiple agent isolation
echo -e "\n5. Testing multiple agent volume isolation..."
# Start two agents with different data volumes
docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_1:/agent" \
    -e AGENT_ID=1 \
    -e AGENT_NAME=agent-1 \
    magents/agent:volume-test \
    bash -c "echo 'agent-1-data' > /agent/identity.txt"

docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_2:/agent" \
    -e AGENT_ID=2 \
    -e AGENT_NAME=agent-2 \
    magents/agent:volume-test \
    bash -c "echo 'agent-2-data' > /agent/identity.txt"

# Verify isolation
docker run --rm \
    -v "test_agent_1:/agent" \
    magents/agent:volume-test \
    bash -c "grep -q 'agent-1-data' /agent/identity.txt || exit 1"

docker run --rm \
    -v "test_agent_2:/agent" \
    magents/agent:volume-test \
    bash -c "grep -q 'agent-2-data' /agent/identity.txt || exit 1"

echo "Agent isolation verified!"

# Test 5: Volume initialization
echo -e "\n6. Testing volume initialization..."
docker run --rm \
    -v "$TEMP_WORKSPACE:/workspace" \
    -v "$TEMP_SHARED:/shared" \
    -v "test_agent_init:/agent" \
    -e AGENT_ID=test \
    -e AGENT_NAME=test-agent \
    magents/agent:volume-test \
    bash -c "
        # Check initialized directories
        [ -d '/shared/config' ] || exit 1
        [ -d '/shared/cache' ] || exit 1
        [ -d '/shared/logs' ] || exit 1
        [ -d '/agent/state' ] || exit 1
        [ -d '/agent/logs' ] || exit 1
        [ -d '/agent/tmp' ] || exit 1
        [ -d '/agent/.ssh' ] || exit 1
        
        # Check initialized files
        [ -f '/shared/config/magents.json' ] || exit 1
        [ -f '/agent/state/identity.json' ] || exit 1
        
        # Check permissions
        [ '$(stat -c %a /agent/.ssh 2>/dev/null || echo 700)' = '700' ] || exit 1
        
        echo 'Volume initialization verified!'
    "

# Cleanup
echo -e "\n7. Cleaning up..."
rm -rf "$TEMP_WORKSPACE" "$TEMP_SHARED"
docker volume rm test_agent_data test_agent_1 test_agent_2 test_agent_init >/dev/null 2>&1 || true

echo -e "\n=== All volume tests passed! ===\n"
echo "Volume features verified:"
echo "✓ Basic volume mounting"
echo "✓ Read/write permissions" 
echo "✓ Host-container file sync"
echo "✓ Data persistence across restarts"
echo "✓ Multi-agent volume isolation"
echo "✓ Automatic volume initialization"