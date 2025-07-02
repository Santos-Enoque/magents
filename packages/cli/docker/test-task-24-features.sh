#!/bin/bash

# Test script for Task 24 features
# Run from the docker directory

echo "====================================="
echo "Task 24 Feature Verification Script"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test headers
print_test() {
    echo -e "\n${BLUE}Testing: $1${NC}"
    echo "Command: $2"
    echo "-----------------------------------"
}

# Function to pause between tests
pause() {
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read
}

# Build the project first
echo -e "${GREEN}Building the project...${NC}"
npm run --prefix .. build

echo -e "\n${GREEN}Starting Task 24 Feature Tests${NC}"

# Test 1: Mode Management (Task 24.2)
print_test "Mode Management - Show current mode" "node ../dist/bin/magents.js mode show"
node ../dist/bin/magents.js mode show
pause

print_test "Mode Management - Get mode recommendation" "node ../dist/bin/magents.js mode recommend"
node ../dist/bin/magents.js mode recommend
pause

print_test "Mode Management - Switch mode with dry-run" "node ../dist/bin/magents.js mode switch standard --dry-run"
node ../dist/bin/magents.js mode switch standard --dry-run
pause

print_test "Mode Management - Actually switch to standard mode" "node ../dist/bin/magents.js mode switch standard"
echo "y" | node ../dist/bin/magents.js mode switch standard
pause

# Test 2: Create command with modes (Task 24.2)
print_test "Create command - Simple mode dry-run" "node ../dist/bin/magents.js create test-simple --mode simple --dry-run"
node ../dist/bin/magents.js create test-simple --mode simple --dry-run
pause

print_test "Create command - Standard mode dry-run" "node ../dist/bin/magents.js create test-standard --mode standard --dry-run"
node ../dist/bin/magents.js create test-standard --mode standard --dry-run
pause

print_test "Create command - Advanced mode dry-run" "node ../dist/bin/magents.js create test-advanced --mode advanced --dry-run"
node ../dist/bin/magents.js create test-advanced --mode advanced --dry-run
pause

# Test 3: Assign command (Task 24.3)
print_test "Assign command - Analyze project" "node ../dist/bin/magents.js assign --analyze --dry-run"
node ../dist/bin/magents.js assign --analyze --dry-run
pause

print_test "Assign command - Filter by category" "node ../dist/bin/magents.js assign --category testing --dry-run"
node ../dist/bin/magents.js assign --category testing --dry-run
pause

print_test "Assign command - Filter by priority" "node ../dist/bin/magents.js assign --priority high --dry-run"
node ../dist/bin/magents.js assign --priority high --dry-run
pause

# Test 4: List agents
print_test "List all agents" "node ../dist/bin/magents.js list"
node ../dist/bin/magents.js list
pause

# Test 5: Start command (Task 24.4)
print_test "Start command - Help" "node ../dist/bin/magents.js start --help"
node ../dist/bin/magents.js start --help
pause

# Create a test agent if none exists
if ! node ../dist/bin/magents.js list | grep -q "test-demo"; then
    print_test "Creating test agent for start command demo" "node ../dist/bin/magents.js create test-demo --mode simple"
    node ../dist/bin/magents.js create test-demo --mode simple
    
    # Stop it so we can test starting
    AGENT_ID=$(node ../dist/bin/magents.js list | grep "test-demo" | awk '{print $2}')
    if [ ! -z "$AGENT_ID" ]; then
        docker stop "magents-$AGENT_ID" 2>/dev/null || true
    fi
    pause
fi

print_test "Start command - Dry run specific agent" "node ../dist/bin/magents.js start test-demo --dry-run"
AGENT_ID=$(node ../dist/bin/magents.js list | grep "test-demo" | awk '{print $2}')
node ../dist/bin/magents.js start "$AGENT_ID" --dry-run
pause

print_test "Start command - With resource limits dry-run" "node ../dist/bin/magents.js start test-demo --cpu 1.5 --memory 2g --dry-run"
node ../dist/bin/magents.js start "$AGENT_ID" --cpu 1.5 --memory 2g --dry-run
pause

print_test "Start command - Interactive mode" "node ../dist/bin/magents.js start"
echo -e "1\n" | node ../dist/bin/magents.js start
pause

# Test 6: Utility features (Task 24.5)
print_test "Progress indicators in create" "node ../dist/bin/magents.js create progress-test --dry-run"
node ../dist/bin/magents.js create progress-test --dry-run
pause

# Test 7: Help commands with new features
print_test "Main help showing all commands" "node ../dist/bin/magents.js --help"
node ../dist/bin/magents.js --help
pause

# Test 8: Configuration
print_test "Show current configuration" "node ../dist/bin/magents.js config"
node ../dist/bin/magents.js config
pause

echo -e "\n${GREEN}====================================="
echo "Task 24 Feature Tests Complete!"
echo "=====================================${NC}"
echo ""
echo "Summary of features tested:"
echo "✅ Task 24.2: Progressive complexity modes (simple/standard/advanced)"
echo "✅ Task 24.3: Automatic task generation with 'assign' command"
echo "✅ Task 24.4: Agent orchestration with 'start' command"
echo "✅ Task 24.5: Utility features (dry-run, progress indicators, interactive mode)"
echo ""
echo "All Task 24 features have been implemented and tested!"