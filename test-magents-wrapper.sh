#!/bin/bash

# Test script for MagentsTaskManager functionality
# This script tests the integration through the backend API

echo "🧪 Testing MagentsTaskManager API..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API base URL (adjust if your backend runs on a different port)
API_URL="http://localhost:3001/api/magents-tasks"
TEST_PROJECT="/tmp/test-magents-project"

# Create test project
echo "📁 Creating test project at $TEST_PROJECT..."
mkdir -p "$TEST_PROJECT/src"
cat > "$TEST_PROJECT/package.json" << EOF
{
  "name": "test-magents-project",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.0.0",
    "mongoose": "^7.0.0"
  }
}
EOF

echo "const express = require('express');" > "$TEST_PROJECT/src/index.js"

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo ""
    echo "🔍 Testing: $description"
    echo "   Method: $method"
    echo "   Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X GET "$API_URL$endpoint")
    else
        response=$(curl -s -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓ Success${NC}"
        echo "   Response: $response" | head -n 3
    else
        echo -e "   ${RED}✗ Failed${NC}"
    fi
}

# Start backend server in background (if not already running)
echo "🚀 Ensuring backend server is running..."
cd packages/backend
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

# Run tests
echo ""
echo "═══════════════════════════════════════════════════════"
echo "Running API Tests"
echo "═══════════════════════════════════════════════════════"

# Test 1: Quick Start
test_endpoint "POST" "/quick-start" \
    "{\"projectPath\": \"$TEST_PROJECT\", \"projectName\": \"Test Project\", \"autoDetectType\": true}" \
    "Quick Start Task Master"

# Test 2: Get Tasks
test_endpoint "GET" "/tasks?projectPath=$TEST_PROJECT" \
    "" \
    "Get Simplified Tasks"

# Test 3: Get Next Task
test_endpoint "GET" "/next-task?projectPath=$TEST_PROJECT" \
    "" \
    "Get Next Task"

# Test 4: Create Task
test_endpoint "POST" "/tasks" \
    "{\"projectPath\": \"$TEST_PROJECT\", \"title\": \"Implement authentication\", \"priority\": \"high\"}" \
    "Create Simple Task"

# Test 5: Auto Analyze
test_endpoint "POST" "/auto-analyze" \
    "{\"projectPath\": \"$TEST_PROJECT\"}" \
    "Auto Analyze Project"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEST_PROJECT"
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Tests completed!"