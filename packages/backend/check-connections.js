#!/usr/bin/env node

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const express = require('express');

console.log('🔍 Checking connection configurations...\n');

// Check if backend is running
const checkBackend = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3001/api/health', (res) => {
      console.log('✅ Backend server is running on port 3001');
      resolve(true);
    }).on('error', () => {
      console.log('❌ Backend server is NOT running on port 3001');
      console.log('   Run: npm run dev (in backend directory)');
      resolve(false);
    });
  });
};

// Check WebSocket configuration
const checkWebSocket = async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: "http://localhost:4000",
      methods: ["GET", "POST"]
    }
  });

  console.log('\n📡 WebSocket Configuration:');
  console.log('   - CORS origin: http://localhost:4000');
  console.log('   - Transports: websocket, polling');
  console.log('   - Namespaces: /, /terminal, /system-terminal');
};

// Check SSE endpoint
const checkSSE = async () => {
  console.log('\n📊 SSE (Server-Sent Events) Configuration:');
  console.log('   - Endpoint: /api/metrics');
  console.log('   - CORS headers: Access-Control-Allow-Origin: *');
  console.log('   - Event types: system-metrics');
  console.log('   - Update interval: 2 seconds');
};

// Check frontend proxy
const checkFrontendProxy = () => {
  console.log('\n🌐 Frontend Proxy Configuration:');
  console.log('   - /api → http://localhost:3001');
  console.log('   - /socket.io → http://localhost:3001 (WebSocket)');
  console.log('   - /terminal → http://localhost:3001 (WebSocket)');
  console.log('   - /system-terminal → http://localhost:3001 (WebSocket)');
};

// Main check
const runChecks = async () => {
  const backendRunning = await checkBackend();
  checkWebSocket();
  checkSSE();
  checkFrontendProxy();

  console.log('\n📋 Troubleshooting Steps:');
  if (!backendRunning) {
    console.log('\n1. Start the backend server:');
    console.log('   cd packages/backend');
    console.log('   npm run dev');
  }
  console.log('\n2. Start the frontend:');
  console.log('   cd packages/web');
  console.log('   npm run dev');
  console.log('\n3. Check browser console for:');
  console.log('   - WebSocket connection errors');
  console.log('   - CORS errors');
  console.log('   - Network tab for failed requests');
  console.log('\n4. Verify firewall/security software is not blocking:');
  console.log('   - Port 3001 (backend)');
  console.log('   - Port 4000 (frontend)');
};

runChecks();