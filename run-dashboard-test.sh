#!/bin/bash

# Script to run the Magents dashboard for testing

echo "🚀 Starting Magents Dashboard Test Environment"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the magents project root directory"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start the web development server
start_web_server() {
    echo "📱 Starting web development server..."
    
    cd packages/web
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing web dependencies..."
        npm install
    fi
    
    # Start the dev server in the background
    npm run dev &
    WEB_PID=$!
    
    echo "⏳ Waiting for web server to start..."
    sleep 5
    
    # Check if the server started successfully
    if check_port 5173; then
        echo "✅ Web server started on http://localhost:5173"
    else
        echo "❌ Failed to start web server"
        kill $WEB_PID 2>/dev/null
        exit 1
    fi
    
    cd ../..
}

# Function to run Playwright tests
run_tests() {
    echo "🧪 Running Playwright tests..."
    
    # Install Playwright if not already installed
    if [ ! -d "node_modules/@playwright" ]; then
        echo "📦 Installing Playwright..."
        npm install --save-dev @playwright/test
        npx playwright install
    fi
    
    # Run the dashboard test
    npx playwright test test-dashboard.spec.ts --headed
}

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    
    if [ ! -z "$WEB_PID" ]; then
        echo "Stopping web server (PID: $WEB_PID)..."
        kill $WEB_PID 2>/dev/null
    fi
    
    # Kill any remaining processes on our ports
    pkill -f "vite" 2>/dev/null
    
    echo "✅ Cleanup complete"
}

# Set up signal handlers for cleanup
trap cleanup EXIT INT TERM

# Main execution
echo "🔍 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build the project first
echo "🔨 Building the project..."
npm run build:all

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors first."
    exit 1
fi

echo "✅ Build successful"

# Start the web server
start_web_server

# Wait a bit more to ensure everything is ready
echo "⏳ Waiting for everything to be ready..."
sleep 3

# Open the dashboard in the default browser
echo "🌐 Opening dashboard in browser..."
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:5173
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:5173
fi

echo ""
echo "🎉 Dashboard is now running!"
echo "📱 Web Interface: http://localhost:5173"
echo ""
echo "🎮 Test the following features:"
echo "  • View the unified single-page dashboard"
echo "  • Toggle between grid and list views (Ctrl+V)"
echo "  • Open keyboard shortcuts help (Ctrl+?)"
echo "  • Check real-time connection status"
echo "  • Explore collapsible sections"
echo "  • Test responsive design by resizing the window"
echo ""
echo "🧪 To run automated tests:"
echo "  npx playwright test test-dashboard.spec.ts --headed"
echo ""
echo "Press Ctrl+C to stop the servers"

# Keep the script running until interrupted
while true; do
    sleep 1
done