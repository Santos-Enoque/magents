#!/usr/bin/env node

/**
 * Simple Browser Test Server
 * 
 * Starts a local server to test the browser functionality
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3334;
const HTML_FILE = '/Users/santossafrao/Development/personal/magents/packages/shared/test-browser.html';

const server = http.createServer((req, res) => {
  try {
    if (req.url === '/' || req.url === '/test') {
      const html = fs.readFileSync(HTML_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Server Error: ${error.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Browser test server running at http://localhost:${PORT}`);
  console.log('📝 Open the URL in your browser to run interactive tests');
  console.log('🛑 Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});