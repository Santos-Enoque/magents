#!/bin/bash

echo "🧪 Quick Port Test for Frontend"
echo "==============================="
echo ""

# Check if backend is running
echo "Checking backend on port 3001..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend is not running. Starting it..."
    npm run dev --workspace=@magents/backend &
    BACKEND_PID=$!
    sleep 5
fi

# Start frontend
echo ""
echo "Starting frontend on port 5000..."
npm run dev --workspace=@magents/web &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

# Check which port is actually being used
echo ""
echo "Checking which port the frontend is using..."

if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible on port 5000!"
    open http://localhost:5000
elif curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  Frontend is still running on port 3000"
    echo "   The Vite config may need a restart to pick up the port change"
    open http://localhost:3000
else
    echo "❌ Frontend is not accessible on either port"
fi

echo ""
echo "Press Ctrl+C to stop the servers..."
wait