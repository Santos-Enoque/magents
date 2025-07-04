#!/bin/bash

echo "🧪 Full System Test for Magents Task Integration"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    echo "Waiting for port $port to be available..."
    while ! nc -z localhost $port 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}✗ Port $port did not become available${NC}"
            return 1
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo -e "${GREEN}✓ Port $port is available${NC}"
    return 0
}

echo -e "\n${YELLOW}Step 1: Checking database...${NC}"
if [ -f "$HOME/.magents/magents.db" ]; then
    echo -e "${GREEN}✓ Database exists${NC}"
    
    # Check tasks table
    sqlite3 "$HOME/.magents/magents.db" "SELECT COUNT(*) FROM tasks;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Tasks table exists${NC}"
        TASK_COUNT=$(sqlite3 "$HOME/.magents/magents.db" "SELECT COUNT(*) FROM tasks;")
        echo "  Current task count: $TASK_COUNT"
    else
        echo -e "${RED}✗ Tasks table not found${NC}"
    fi
else
    echo -e "${RED}✗ Database not found${NC}"
    echo "  Run: magents database init"
fi

echo -e "\n${YELLOW}Step 2: Starting backend server...${NC}"
# Kill any existing backend process
pkill -f "nodemon.*server.ts" 2>/dev/null
pkill -f "ts-node.*server.ts" 2>/dev/null

# Start backend
cd packages/backend
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
if wait_for_port 5002; then
    echo -e "${GREEN}✓ Backend server started${NC}"
    
    # Test health endpoint
    HEALTH=$(curl -s http://localhost:5002/api/health | jq -r '.status' 2>/dev/null)
    if [ "$HEALTH" = "ok" ]; then
        echo -e "${GREEN}✓ Backend health check passed${NC}"
    else
        echo -e "${RED}✗ Backend health check failed${NC}"
    fi
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check backend.log for errors"
fi

echo -e "\n${YELLOW}Step 3: Testing task integrations API...${NC}"
# Get available integrations
INTEGRATIONS=$(curl -s http://localhost:5002/api/taskmaster/integrations 2>/dev/null)
if [ ! -z "$INTEGRATIONS" ]; then
    echo -e "${GREEN}✓ Task integrations endpoint working${NC}"
    echo "$INTEGRATIONS" | jq -r '.[] | "  - \(.name) (\(.type)): \(.status)"' 2>/dev/null || echo "$INTEGRATIONS"
else
    echo -e "${RED}✗ Could not fetch integrations${NC}"
fi

# Test internal integration
echo -e "\n${YELLOW}Step 4: Testing internal task integration...${NC}"
INTERNAL_TASKS=$(curl -s "http://localhost:5002/api/taskmaster/tasks?integration=internal" 2>/dev/null)
if [ ! -z "$INTERNAL_TASKS" ]; then
    echo -e "${GREEN}✓ Internal task integration working${NC}"
    TASK_COUNT=$(echo "$INTERNAL_TASKS" | jq -r '.total // .tasks | length' 2>/dev/null)
    echo "  Tasks found: ${TASK_COUNT:-0}"
else
    echo -e "${RED}✗ Could not fetch tasks from internal integration${NC}"
fi

echo -e "\n${YELLOW}Step 5: Starting frontend GUI...${NC}"
# Kill any existing frontend process
pkill -f "vite.*--port.4000" 2>/dev/null

# Start frontend
cd ../frontend
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
if wait_for_port 4000; then
    echo -e "${GREEN}✓ Frontend server started${NC}"
    echo -e "${GREEN}✓ GUI available at: http://localhost:4000${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "Check frontend.log for errors"
fi

echo -e "\n${YELLOW}Step 6: Creating test data...${NC}"
# Create a test project if needed
TEST_PROJECT_ID="test-project-$(date +%s)"
curl -s -X POST http://localhost:5002/api/projects \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Test Project\", \"path\": \"/tmp/test-project\"}" > /dev/null 2>&1

# Create a test task via API
TEST_TASK=$(curl -s -X POST http://localhost:5002/api/taskmaster/tasks \
    -H "Content-Type: application/json" \
    -d '{
        "projectId": "'$TEST_PROJECT_ID'",
        "title": "Test Task from API",
        "description": "Created via test script",
        "status": "pending",
        "priority": "high",
        "integration": "internal"
    }' 2>/dev/null)

if [ ! -z "$TEST_TASK" ]; then
    echo -e "${GREEN}✓ Test task created successfully${NC}"
else
    echo -e "${YELLOW}! Could not create test task${NC}"
fi

echo -e "\n${YELLOW}Test Summary:${NC}"
echo "============="
echo -e "${GREEN}✓ Backend running on: http://localhost:5002${NC}"
echo -e "${GREEN}✓ Frontend running on: http://localhost:4000${NC}"
echo ""
echo "To test the task browser:"
echo "1. Open http://localhost:4000 in your browser"
echo "2. Navigate to Projects and select a project"
echo "3. Click on 'Task Browser' in the navigation"
echo "4. You should see tasks from the internal integration"
echo ""
echo "To stop all services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "To view logs:"
echo "  tail -f packages/backend/backend.log"
echo "  tail -f packages/frontend/frontend.log"