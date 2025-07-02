#!/bin/bash
set -e

echo "=== Starting Magents Test Environment ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create temporary directory for socket
SOCKET_DIR=$(mktemp -d /tmp/claude-bridge.XXXXXX)
SOCKET_PATH="$SOCKET_DIR/claude-bridge.sock"
export CLAUDE_BRIDGE_SOCKET="$SOCKET_PATH"

# Store PIDs file
PIDS_FILE="$SOCKET_DIR/pids"

# Step 1: Build the production image
echo -e "${YELLOW}1. Building production Docker image...${NC}"
cd "$(dirname "$0")"
docker build --build-arg BUILD_TARGET=production -f Dockerfile.multi-stage -t magents/agent:test . || {
    echo -e "${RED}Failed to build Docker image${NC}"
    exit 1
}
echo -e "${GREEN}✓ Image built successfully${NC}"
echo ""

# Step 2: Start Claude bridge server in background
echo -e "${YELLOW}2. Starting Claude Code bridge server...${NC}"
echo "Socket path: $SOCKET_PATH"

# Create the bridge server script
cat > "$SOCKET_DIR/bridge-server.js" << 'EOF'
#!/usr/bin/env node
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SOCKET_PATH = process.env.CLAUDE_BRIDGE_SOCKET || '/var/run/claude-code-bridge.sock';
const LOG_FILE = process.env.BRIDGE_LOG_FILE || '/tmp/claude-bridge.log';

// Redirect console to log file
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
const log = (...args) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${args.join(' ')}\n`);
};

// Clean up any existing socket
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

const activeConnections = new Set();

const server = net.createServer((connection) => {
    if (activeConnections.size >= 10) {
        connection.write(JSON.stringify({
            type: 'error',
            message: 'Bridge server at capacity. Please try again later.'
        }));
        connection.end();
        return;
    }

    activeConnections.add(connection);
    log(`New connection established. Active connections: ${activeConnections.size}`);

    let buffer = '';

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
                log('Failed to parse request:', e);
                connection.write(JSON.stringify({
                    type: 'error',
                    message: 'Invalid request format'
                }) + '\n');
            }
        });
    });

    connection.on('close', () => {
        activeConnections.delete(connection);
        log(`Connection closed. Active connections: ${activeConnections.size}`);
    });

    connection.on('error', (err) => {
        log('Connection error:', err);
        activeConnections.delete(connection);
    });
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

    log(`Executing: claude ${args.join(' ')}`);

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
        log('Failed to execute claude:', err);
        connection.write(JSON.stringify({
            type: 'error',
            message: `Failed to execute claude: ${err.message}`
        }) + '\n');
        connection.end();
    });
}

server.listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, '666');
    log(`Claude Code Bridge Server listening on ${SOCKET_PATH}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down...');
    server.close(() => {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        process.exit(0);
    });
});
EOF

# Start bridge server with nohup
BRIDGE_LOG="$SOCKET_DIR/bridge.log"
export BRIDGE_LOG_FILE="$BRIDGE_LOG"
nohup node "$SOCKET_DIR/bridge-server.js" > "$BRIDGE_LOG" 2>&1 &
BRIDGE_PID=$!
echo $BRIDGE_PID > "$PIDS_FILE"
sleep 2

# Check if server started successfully
if kill -0 $BRIDGE_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Bridge server started (PID: $BRIDGE_PID)${NC}"
    echo "   Log file: $BRIDGE_LOG"
else
    echo -e "${RED}✗ Failed to start bridge server${NC}"
    cat "$BRIDGE_LOG"
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

# Fix socket permissions in container
echo "Fixing socket permissions..."
docker exec magents-test sudo chown magents:magents /host/claude-bridge.sock 2>/dev/null || true

# Step 4: Test basic functionality
echo ""
echo -e "${YELLOW}4. Testing container functionality...${NC}"

# Test health check
echo -n "   Health check endpoint: "
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

# Test Claude bridge connection
echo -n "   Claude bridge connection: "
if docker exec magents-test bash -c "echo 'test' | nc -U /host/claude-bridge.sock" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Not connected${NC}"
    # Debug info
    docker exec magents-test ls -la /host/claude-bridge.sock 2>&1 || true
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

# Create stop script
cat > "$SOCKET_DIR/stop-environment.sh" << EOF
#!/bin/bash
echo "Stopping Magents test environment..."

# Stop bridge server
if [ -f "$PIDS_FILE" ]; then
    BRIDGE_PID=\$(cat "$PIDS_FILE")
    if kill -0 \$BRIDGE_PID 2>/dev/null; then
        echo "Stopping bridge server (PID: \$BRIDGE_PID)..."
        kill \$BRIDGE_PID
    fi
fi

# Remove container
echo "Removing container..."
docker rm -f magents-test 2>/dev/null || true

# Clean up socket directory
echo "Cleaning up..."
rm -rf "$SOCKET_DIR"

echo "Environment stopped."
EOF
chmod +x "$SOCKET_DIR/stop-environment.sh"

# Step 5: Show usage instructions
echo -e "${GREEN}=== Test environment is ready! ===${NC}"
echo ""
echo -e "${BLUE}Test Commands:${NC}"
echo "  docker exec -it magents-test bash"
echo "  docker exec -it magents-test claude --version"
echo "  docker exec -it magents-test task-master list"
echo "  docker exec -it magents-test tmux"
echo ""
echo -e "${BLUE}Bridge Server Info:${NC}"
echo "  PID: $BRIDGE_PID"
echo "  Socket: $SOCKET_PATH"
echo "  Log: $BRIDGE_LOG"
echo ""
echo -e "${BLUE}To stop the environment:${NC}"
echo "  $SOCKET_DIR/stop-environment.sh"
echo ""
echo -e "${YELLOW}Note: The bridge server and container are running in the background.${NC}"
echo -e "${YELLOW}They will continue running until you stop them manually.${NC}"