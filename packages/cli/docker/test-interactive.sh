#!/bin/bash
set -e

echo "=== Interactive Test for Magents Docker Runtime ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create temporary directory for socket
SOCKET_DIR=$(mktemp -d /tmp/claude-bridge.XXXXXX)
SOCKET_PATH="$SOCKET_DIR/claude-bridge.sock"
export CLAUDE_BRIDGE_SOCKET="$SOCKET_PATH"

# Step 1: Build the production image
echo -e "${YELLOW}1. Building production Docker image...${NC}"
cd "$(dirname "$0")"
docker build --build-arg BUILD_TARGET=production -f Dockerfile.multi-stage -t magents/agent:test . || {
    echo -e "${RED}Failed to build Docker image${NC}"
    exit 1
}
echo -e "${GREEN}✓ Image built successfully${NC}"
echo ""

# Step 2: Start Claude bridge server
echo -e "${YELLOW}2. Starting Claude Code bridge server...${NC}"
echo "Using socket path: $SOCKET_PATH"

# Create the bridge server script
cat > claude-bridge-server-temp.js << 'EOF'
#!/usr/bin/env node
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SOCKET_PATH = process.env.CLAUDE_BRIDGE_SOCKET || '/var/run/claude-code-bridge.sock';
const MAX_CONCURRENT_CONNECTIONS = 10;
const REQUEST_TIMEOUT = 300000;

// Clean up any existing socket
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

const activeConnections = new Set();

const server = net.createServer((connection) => {
    if (activeConnections.size >= MAX_CONCURRENT_CONNECTIONS) {
        connection.write(JSON.stringify({
            type: 'error',
            message: 'Bridge server at capacity. Please try again later.'
        }));
        connection.end();
        return;
    }

    activeConnections.add(connection);
    console.log(`New connection established. Active connections: ${activeConnections.size}`);

    let buffer = '';
    let requestTimer;

    connection.on('data', (data) => {
        buffer += data.toString();
        
        const lines = buffer.split('\n');
        buffer = lines.pop();

        lines.forEach(line => {
            if (!line.trim()) return;
            
            try {
                const request = JSON.parse(line);
                handleRequest(connection, request);
            } catch (e) {
                console.error('Failed to parse request:', e);
                connection.write(JSON.stringify({
                    type: 'error',
                    message: 'Invalid request format'
                }) + '\n');
            }
        });
    });

    connection.on('close', () => {
        activeConnections.delete(connection);
        if (requestTimer) clearTimeout(requestTimer);
        console.log(`Connection closed. Active connections: ${activeConnections.size}`);
    });

    connection.on('error', (err) => {
        console.error('Connection error:', err);
        activeConnections.delete(connection);
        if (requestTimer) clearTimeout(requestTimer);
    });

    requestTimer = setTimeout(() => {
        connection.write(JSON.stringify({
            type: 'error',
            message: 'Request timeout'
        }) + '\n');
        connection.end();
    }, REQUEST_TIMEOUT);
});

function handleRequest(connection, request) {
    const { command, args = [], env = {}, cwd } = request;

    if (command !== 'claude') {
        connection.write(JSON.stringify({
            type: 'error',
            message: 'Only claude commands are supported'
        }) + '\n');
        return;
    }

    console.log(`Executing: claude ${args.join(' ')}`);

    const processEnv = {
        ...process.env,
        ...env,
        HOME: process.env.HOME,
        PATH: process.env.PATH
    };

    const claudeProcess = spawn('claude', args, {
        env: processEnv,
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    if (request.stdin) {
        claudeProcess.stdin.write(request.stdin);
        claudeProcess.stdin.end();
    }

    claudeProcess.stdout.on('data', (data) => {
        connection.write(JSON.stringify({
            type: 'stdout',
            data: data.toString()
        }) + '\n');
    });

    claudeProcess.stderr.on('data', (data) => {
        connection.write(JSON.stringify({
            type: 'stderr',
            data: data.toString()
        }) + '\n');
    });

    claudeProcess.on('close', (code) => {
        connection.write(JSON.stringify({
            type: 'exit',
            code: code
        }) + '\n');
        connection.end();
    });

    claudeProcess.on('error', (err) => {
        console.error('Failed to execute claude:', err);
        connection.write(JSON.stringify({
            type: 'error',
            message: `Failed to execute claude: ${err.message}`
        }) + '\n');
        connection.end();
    });
}

server.listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, '666');
    console.log(`Claude Code Bridge Server listening on ${SOCKET_PATH}`);
    console.log('Press Ctrl+C to stop the server');
});

process.on('SIGINT', () => {
    console.log('\nShutting down bridge server...');
    server.close(() => {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    server.close(() => {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        process.exit(0);
    });
});
EOF

node claude-bridge-server-temp.js &
BRIDGE_PID=$!
sleep 2

# Check if server started successfully
if kill -0 $BRIDGE_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Bridge server started (PID: $BRIDGE_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start bridge server${NC}"
    exit 1
fi
echo ""

# Step 3: Run a test container
echo -e "${YELLOW}3. Starting test container...${NC}"

# Remove any existing test container
docker rm -f magents-test 2>/dev/null || true

CONTAINER_ID=$(docker run -d \
    --name magents-test \
    -v "$(pwd)/../../../:/workspace" \
    -v "$SOCKET_PATH:/host/claude-bridge.sock" \
    -e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock \
    magents/agent:test \
    tail -f /dev/null)
echo -e "${GREEN}✓ Container started: ${CONTAINER_ID:0:12}${NC}"

# Wait for container to initialize
echo "Waiting for container to initialize..."
sleep 3

# Check if container is still running
if ! docker ps | grep -q magents-test; then
    echo -e "${RED}✗ Container exited unexpectedly${NC}"
    echo "Container logs:"
    docker logs magents-test 2>&1 | tail -20
    exit 1
fi

# Step 4: Test basic functionality
echo -e "${YELLOW}4. Testing container functionality...${NC}"

# Test health check
echo -n "   Health check endpoint: "
sleep 1
if docker exec magents-test curl -sf http://localhost:3999/health > /dev/null 2>&1; then
    HEALTH_STATUS=$(docker exec magents-test curl -sf http://localhost:3999/health | jq -r '.status' 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Working (status: $HEALTH_STATUS)${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test Task Master
echo -n "   Task Master: "
if docker exec magents-test task-master --version > /dev/null 2>&1; then
    VERSION=$(docker exec magents-test task-master --version)
    echo -e "${GREEN}✓ Installed (${VERSION})${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

# Test Claude wrapper
echo -n "   Claude wrapper: "
if docker exec magents-test which claude > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Available at $(docker exec magents-test which claude)${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

# Test workspace mount
echo -n "   Workspace mount: "
if docker exec magents-test test -d /workspace 2>/dev/null; then
    FILE_COUNT=$(docker exec magents-test bash -c 'find /workspace -maxdepth 1 -type f 2>/dev/null | wc -l' || echo "0")
    echo -e "${GREEN}✓ Mounted (${FILE_COUNT} files)${NC}"
else
    echo -e "${RED}✗ Not accessible${NC}"
fi

echo ""

# Step 5: Interactive test prompt
echo -e "${YELLOW}5. Container is ready for interactive testing!${NC}"
echo ""
echo -e "${GREEN}Container and bridge server will remain running.${NC}"
echo ""
echo "You can now run these commands in a new terminal:"
echo "  • docker exec -it magents-test bash"
echo "  • docker exec -it magents-test claude --version"
echo "  • docker exec -it magents-test task-master list"
echo "  • curl http://localhost:3999/health"
echo ""
echo "To clean up when done:"
echo "  1. docker rm -f magents-test"
echo "  2. kill $BRIDGE_PID"
echo "  3. rm -rf $SOCKET_DIR"
echo ""
echo -e "${YELLOW}Bridge Server PID: $BRIDGE_PID${NC}"
echo -e "${YELLOW}Socket Path: $SOCKET_PATH${NC}"
echo ""
echo "Press Ctrl+C to stop the bridge server and exit (container will keep running)..."

# Clean up temp file
rm -f claude-bridge-server-temp.js

# Wait for user to press Ctrl+C
trap "echo -e '\n${YELLOW}Stopping bridge server...${NC}'; kill $BRIDGE_PID 2>/dev/null; rm -rf $SOCKET_DIR; echo -e '${GREEN}Bridge server stopped. Container is still running.${NC}'; exit 0" INT

while true; do
    sleep 1
done