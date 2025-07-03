#!/bin/bash

# Simple script to test the dashboard frontend only

echo "🚀 Testing Magents Dashboard Frontend"
echo "===================================="

# Navigate to web package
cd packages/web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "📱 Starting development server..."
echo "🌐 Dashboard will open at: http://localhost:5173"
echo ""
echo "🎮 Features to test:"
echo "  ✨ Unified single-page dashboard layout"
echo "  🔄 Grid/List view toggle (Ctrl+V)"
echo "  ⌨️  Keyboard shortcuts (Ctrl+?)"
echo "  📊 Live system metrics (mock data)"
echo "  🖥️  Inline terminal component"
echo "  📱 Responsive design"
echo "  🎨 Collapsible sections"
echo "  ⚡ Real-time connection status"
echo ""
echo "Press Ctrl+C to stop"

npm run dev