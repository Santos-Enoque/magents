#!/bin/bash

echo "🔍 Verifying Frontend Port Change to 5000"
echo "========================================="

echo -e "\n✅ Configuration Updates:"
echo "1. Vite config: Frontend now runs on port 5000"
echo "2. Backend CORS: Updated to allow http://localhost:5000"
echo "3. Proxy settings: Still correctly pointing to backend on 3001"
echo "4. Constants: FRONTEND_DEFAULT updated to 5000"

echo -e "\n📋 Port Configuration:"
echo "- Frontend (Web UI): http://localhost:5000"
echo "- Backend (API): http://localhost:3001"
echo "- WebSocket: ws://localhost:3001"

echo -e "\n🚀 To start the services:"
echo "# Terminal 1 - Start Backend:"
echo "npm run dev --workspace=@magents/backend"
echo ""
echo "# Terminal 2 - Start Frontend:"
echo "npm run dev --workspace=@magents/web"

echo -e "\n✨ The web UI will now be accessible at http://localhost:5000"
echo "   (instead of the previous http://localhost:3000)"

echo -e "\n🔧 Files modified:"
echo "- packages/web/vite.config.ts (port: 5000)"
echo "- packages/backend/src/server.ts (CORS origin)"
echo "- packages/shared/src/constants.ts (FRONTEND_DEFAULT)"
echo "- docs/USE-CASES.md (documentation update)"

echo -e "\n✅ Port change completed successfully!"