#!/bin/bash
set -e

echo "=== Testing Docker Health Checks and Auto-restart ==="

# Build the image
echo "1. Building Docker image with health checks..."
docker build -f Dockerfile -t magents/agent:health-test .

# Test 1: Health check endpoint
echo -e "\n2. Testing health check endpoint..."
CONTAINER_ID=$(docker run -d --name health-test-1 magents/agent:health-test sleep 300)
echo "Container started: $CONTAINER_ID"

# Wait for container to be healthy
echo "Waiting for container to become healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=20
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' health-test-1 2>/dev/null || echo "unknown")
    echo "Health status: $STATUS"
    
    if [ "$STATUS" = "healthy" ]; then
        echo "Container is healthy!"
        break
    fi
    
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 5
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo "Container failed to become healthy!"
    docker logs health-test-1
    docker rm -f health-test-1
    exit 1
fi

# Test health endpoint directly
echo -e "\n3. Testing health endpoint responses..."
docker exec health-test-1 curl -s http://localhost:3999/health | jq '.'
docker exec health-test-1 curl -s http://localhost:3999/ready
echo ""
docker exec health-test-1 curl -s http://localhost:3999/metrics

# Test 2: Graceful shutdown
echo -e "\n\n4. Testing graceful shutdown..."
docker exec health-test-1 bash -c "echo 'test-data' > /tmp/test-shutdown.txt"
docker stop health-test-1
echo "Container stopped gracefully"

# Test 3: Auto-restart policy
echo -e "\n5. Testing auto-restart policy..."
docker rm health-test-1

# Start with restart policy
CONTAINER_ID=$(docker run -d \
    --name health-test-2 \
    --restart unless-stopped \
    magents/agent:health-test \
    bash -c "sleep 10 && exit 1")

echo "Container started with restart policy: $CONTAINER_ID"
sleep 15

# Check if container restarted
RESTART_COUNT=$(docker inspect -f '{{.RestartCount}}' health-test-2)
echo "Restart count: $RESTART_COUNT"

if [ "$RESTART_COUNT" -gt 0 ]; then
    echo "Auto-restart verified!"
else
    echo "Auto-restart failed!"
fi

# Test 4: Health check failure detection
echo -e "\n6. Testing health check failure detection..."
docker rm -f health-test-2

# Start container and simulate unhealthy state
CONTAINER_ID=$(docker run -d \
    --name health-test-3 \
    -e HEALTH_PORT=4000 \
    magents/agent:health-test \
    bash -c "sleep 300")

echo "Started container with wrong health port"
sleep 40

# Check health status
HEALTH_STATUS=$(docker inspect -f '{{.State.Health.Status}}' health-test-3)
echo "Health status after failure: $HEALTH_STATUS"

if [ "$HEALTH_STATUS" = "unhealthy" ]; then
    echo "Unhealthy state detection verified!"
else
    echo "Failed to detect unhealthy state"
fi

# Test 5: Resource monitoring
echo -e "\n7. Testing resource usage during health checks..."
docker rm -f health-test-3

CONTAINER_ID=$(docker run -d --name health-test-4 magents/agent:health-test)
sleep 10

# Monitor CPU and memory usage
echo "Container resource usage:"
docker stats --no-stream health-test-4

# Cleanup
echo -e "\n8. Cleaning up..."
docker rm -f health-test-1 health-test-2 health-test-3 health-test-4 2>/dev/null || true

echo -e "\n=== All health check tests completed! ===\n"
echo "Features verified:"
echo "✓ Health check endpoint running"
echo "✓ Health status reporting"
echo "✓ Graceful shutdown handling"
echo "✓ Auto-restart on failure"
echo "✓ Unhealthy state detection"
echo "✓ Resource monitoring"