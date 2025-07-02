#!/usr/bin/env node
/**
 * Claude Code Bridge Server
 * Runs on the host machine to proxy Claude Code commands from Docker containers
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SOCKET_PATH = '/var/run/claude-code-bridge.sock';
const MAX_CONCURRENT_CONNECTIONS = 10;
const REQUEST_TIMEOUT = 300000; // 5 minutes

// Ensure socket directory exists
const socketDir = path.dirname(SOCKET_PATH);
if (!fs.existsSync(socketDir)) {
    console.error(`Socket directory ${socketDir} does not exist. Please create it with appropriate permissions.`);
    process.exit(1);
}

// Clean up any existing socket
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

// Connection pool
const activeConnections = new Set();

// Create server
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
        
        // Try to parse complete JSON messages
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

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

    // Set timeout for the connection
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

    // Merge environment variables
    const processEnv = {
        ...process.env,
        ...env,
        // Ensure Claude Code config is accessible
        HOME: process.env.HOME,
        PATH: process.env.PATH
    };

    const claudeProcess = spawn('claude', args, {
        env: processEnv,
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
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

    // Handle process exit
    claudeProcess.on('close', (code) => {
        connection.write(JSON.stringify({
            type: 'exit',
            code: code
        }) + '\n');
        connection.end();
    });

    // Handle process errors
    claudeProcess.on('error', (err) => {
        console.error('Failed to execute claude:', err);
        connection.write(JSON.stringify({
            type: 'error',
            message: `Failed to execute claude: ${err.message}`
        }) + '\n');
        connection.end();
    });
}

// Start server
server.listen(SOCKET_PATH, () => {
    // Set permissions to allow docker group access
    fs.chmodSync(SOCKET_PATH, '660');
    console.log(`Claude Code Bridge Server listening on ${SOCKET_PATH}`);
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
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