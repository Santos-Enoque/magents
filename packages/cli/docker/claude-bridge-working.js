#!/usr/bin/env node
/**
 * Claude Code Bridge Server for Magents
 * Allows Docker containers to share host's Claude authentication
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const SOCKET_PATH = process.env.SOCKET_PATH || '/tmp/claude-bridge-persistent/claude-bridge.sock';

console.log(`Starting Magents Claude Bridge Server...`);
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

// Find claude executable at startup
let claudePath;
try {
    claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    console.log(`Found claude at: ${claudePath}`);
    
    // Test if claude works
    execSync(`${claudePath} --version`, { encoding: 'utf8' });
    console.log('Claude executable verified');
} catch (error) {
    console.error('Error: Could not find or execute claude');
    console.error('Make sure claude is installed: npm install -g @anthropic-ai/claude-cli');
    process.exit(1);
}

const activeConnections = new Set();

const server = net.createServer((connection) => {
    activeConnections.add(connection);
    console.log(`New agent connection. Active: ${activeConnections.size}`);

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
                console.log(`Agent request: claude ${(request.args || []).join(' ')}`);
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
        console.log(`Agent disconnected. Active: ${activeConnections.size}`);
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

    console.log(`Executing for agent: ${claudePath} ${args.join(' ')}`);

    // Create the command with proper escaping
    const fullCommand = [claudePath].concat(args);
    
    // Use execFile for more reliable execution
    const child_process = require('child_process');
    const claudeProcess = child_process.execFile(claudePath, args, {
        env: { ...process.env, ...env },
        cwd: cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }, (error, stdout, stderr) => {
        if (error && error.code === 'ENOENT') {
            connection.write(JSON.stringify({
                type: 'error',
                message: 'Claude executable not found'
            }) + '\n');
            connection.end();
            return;
        }

        // Send stdout if any
        if (stdout) {
            connection.write(JSON.stringify({
                type: 'stdout',
                data: stdout
            }) + '\n');
        }

        // Send stderr if any
        if (stderr) {
            connection.write(JSON.stringify({
                type: 'stderr',
                data: stderr
            }) + '\n');
        }

        // Send exit code
        connection.write(JSON.stringify({
            type: 'exit',
            code: error ? error.code || 1 : 0
        }) + '\n');
        
        connection.end();
    });

    // Handle stdin if provided
    if (request.stdin) {
        claudeProcess.stdin.write(request.stdin);
        claudeProcess.stdin.end();
    }
}

// Start server
server.listen(SOCKET_PATH, () => {
    // Make socket accessible to all users
    fs.chmodSync(SOCKET_PATH, '0666');
    console.log(`Bridge server ready for agents on ${SOCKET_PATH}`);
    console.log(`PID: ${process.pid}`);
    
    // Write PID file
    const pidFile = path.join(socketDir, 'bridge.pid');
    fs.writeFileSync(pidFile, process.pid.toString());
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down bridge server...');
    server.close(() => {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        process.exit(0);
    });
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

// Keep process alive with periodic status
setInterval(() => {
    const now = new Date().toISOString();
    console.log(`[${now}] Bridge alive - Active agents: ${activeConnections.size}`);
}, 60000); // Every minute