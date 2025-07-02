#!/bin/bash
# Start Claude bridge server as a persistent background service

echo "=== Starting Claude Bridge Server ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if claude is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude is not installed on the host${NC}"
    echo "Install Claude first:"
    echo "  npm install -g @anthropic-ai/claude-cli"
    echo "  or"
    echo "  brew install claude"
    exit 1
fi

# Create bridge directory
BRIDGE_DIR="/tmp/claude-bridge-persistent"
mkdir -p "$BRIDGE_DIR"
SOCKET_PATH="$BRIDGE_DIR/claude-bridge.sock"
LOG_FILE="$BRIDGE_DIR/bridge.log"
PID_FILE="$BRIDGE_DIR/bridge.pid"

# Stop any existing bridge server
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}Stopping existing bridge server (PID: $OLD_PID)...${NC}"
        kill "$OLD_PID"
        sleep 1
    fi
fi

# Clean up old socket
if [ -S "$SOCKET_PATH" ]; then
    rm -f "$SOCKET_PATH"
fi

# Create bridge server script
cat > "$BRIDGE_DIR/bridge-server.js" << 'EOF'
#!/usr/bin/env node
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SOCKET_PATH = process.env.SOCKET_PATH || '/tmp/claude-bridge-persistent/claude-bridge.sock';

console.log(`Starting Claude Bridge Server...`);
console.log(`Socket path: ${SOCKET_PATH}`);

// Clean up any existing socket
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

// Ensure socket directory exists
const socketDir = path.dirname(SOCKET_PATH);
if (!fs.existsSync(socketDir)) {
    fs.mkdirSync(socketDir, { recursive: true });
}

const activeConnections = new Set();

const server = net.createServer((connection) => {
    console.log(`New connection from ${connection.remoteAddress}`);
    activeConnections.add(connection);

    let buffer = '';

    connection.on('data', (data) => {
        buffer += data.toString();
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        lines.forEach(line => {
            if (!line.trim()) return;
            
            try {
                const request = JSON.parse(line);
                console.log(`Request: ${request.command} ${(request.args || []).join(' ')}`);
                handleRequest(connection, request);
            } catch (e) {
                console.error('Parse error:', e.message);
                connection.write(JSON.stringify({
                    type: 'error',
                    message: `Invalid JSON: ${e.message}`
                }) + '\n');
            }
        });
    });

    connection.on('close', () => {
        activeConnections.delete(connection);
        console.log(`Connection closed. Active: ${activeConnections.size}`);
    });

    connection.on('error', (err) => {
        console.error('Connection error:', err.message);
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

    console.log(`Executing: claude ${args.join(' ')}`);

    // Use shell to execute claude to handle shebangs and PATH properly
    const claudeProcess = spawn('/bin/sh', ['-c', `claude ${args.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ')}`], {
        env: { ...process.env, ...env, PATH: process.env.PATH },
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
    });

    // Handle stdin if provided
    if (request.stdin) {
        claudeProcess.stdin.write(request.stdin);
        claudeProcess.stdin.end();
    }

    // Stream stdout
    claudeProcess.stdout.on('data', (data) => {
        connection.write(JSON.stringify({
            type: 'stdout',
            data: data.toString()
        }) + '\n');
    });

    // Stream stderr
    claudeProcess.stderr.on('data', (data) => {
        connection.write(JSON.stringify({
            type: 'stderr',
            data: data.toString()
        }) + '\n');
    });

    // Handle exit
    claudeProcess.on('close', (code) => {
        console.log(`Command exited with code: ${code}`);
        connection.write(JSON.stringify({
            type: 'exit',
            code: code
        }) + '\n');
        connection.end();
    });

    // Handle errors
    claudeProcess.on('error', (err) => {
        console.error('Spawn error:', err.message);
        connection.write(JSON.stringify({
            type: 'error',
            message: `Failed to execute claude: ${err.message}`
        }) + '\n');
        connection.end();
    });
}

// Start server
server.listen(SOCKET_PATH, () => {
    // Make socket accessible
    fs.chmodSync(SOCKET_PATH, '0666');
    console.log(`Bridge server listening on ${SOCKET_PATH}`);
    console.log(`PID: ${process.pid}`);
    
    // Write PID file
    fs.writeFileSync(process.env.PID_FILE || '/tmp/claude-bridge-persistent/bridge.pid', process.pid.toString());
});

// Keep process alive
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        process.exit(0);
    });
});

// Log heartbeat every 30 seconds
setInterval(() => {
    console.log(`Heartbeat: ${new Date().toISOString()} - Active connections: ${activeConnections.size}`);
}, 30000);
EOF

# Start the bridge server
echo -e "${YELLOW}Starting bridge server...${NC}"
export SOCKET_PATH="$SOCKET_PATH"
export PID_FILE="$PID_FILE"

nohup node "$BRIDGE_DIR/bridge-server.js" > "$LOG_FILE" 2>&1 &
BRIDGE_PID=$!
echo $BRIDGE_PID > "$PID_FILE"

# Wait for server to start
sleep 2

# Check if it's running
if kill -0 $BRIDGE_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Bridge server started successfully${NC}"
    echo ""
    echo -e "${BLUE}Bridge Server Info:${NC}"
    echo "  PID: $BRIDGE_PID"
    echo "  Socket: $SOCKET_PATH"
    echo "  Log: $LOG_FILE"
    echo "  Status: Running"
    echo ""
    echo -e "${BLUE}To use with Docker container:${NC}"
    echo "  docker run -d \\"
    echo "    --name magents-test \\"
    echo "    -v /path/to/workspace:/workspace \\"
    echo "    -v $SOCKET_PATH:/host/claude-bridge.sock \\"
    echo "    -e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock \\"
    echo "    magents/agent:test \\"
    echo "    tail -f /dev/null"
    echo ""
    echo -e "${BLUE}To stop the bridge server:${NC}"
    echo "  kill $BRIDGE_PID"
    echo ""
    echo -e "${BLUE}To view logs:${NC}"
    echo "  tail -f $LOG_FILE"
else
    echo -e "${RED}✗ Failed to start bridge server${NC}"
    echo "Check the log file: $LOG_FILE"
    cat "$LOG_FILE"
    exit 1
fi