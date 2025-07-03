"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = void 0;
const shared_1 = require("@magents/shared");
const pty = require('node-pty');
// Store active terminal sessions
const terminalSessions = new Map();
const setupWebSocket = (io) => {
    // Terminal namespace for agent terminal connections
    const terminalNamespace = io.of('/terminal');
    terminalNamespace.on('connection', (socket) => {
        const agentId = socket.handshake.query.agentId;
        console.log(`Terminal client connected for agent ${agentId}: ${socket.id}`);
        if (!agentId) {
            socket.emit('error', 'Agent ID is required');
            socket.disconnect();
            return;
        }
        // Connect to Docker container
        connectToAgentTerminal(socket, agentId);
        socket.on('disconnect', () => {
            console.log(`Terminal client disconnected: ${socket.id}`);
            const session = terminalSessions.get(socket.id);
            if (session) {
                session.kill();
                terminalSessions.delete(socket.id);
            }
        });
    });
    // System terminal namespace for host system terminal connections
    const systemTerminalNamespace = io.of('/system-terminal');
    systemTerminalNamespace.on('connection', (socket) => {
        console.log(`System terminal client connected: ${socket.id}`);
        // Connect to host system terminal
        connectToSystemTerminal(socket);
        socket.on('disconnect', () => {
            console.log(`System terminal client disconnected: ${socket.id}`);
            const session = terminalSessions.get(socket.id);
            if (session) {
                session.kill();
                terminalSessions.delete(socket.id);
            }
        });
    });
    io.on('connection', (socket) => {
        console.log(`WebSocket client connected: ${socket.id}`);
        // Send welcome message
        const welcomeMessage = {
            type: 'welcome',
            data: { message: 'Connected to Magents WebSocket server' },
            timestamp: Date.now()
        };
        socket.emit('message', welcomeMessage);
        // Handle agent events subscription
        socket.on('subscribe:agents', () => {
            socket.join('agents');
            console.log(`Client ${socket.id} subscribed to agent events`);
        });
        socket.on('unsubscribe:agents', () => {
            socket.leave('agents');
            console.log(`Client ${socket.id} unsubscribed from agent events`);
        });
        // Handle project events subscription
        socket.on('subscribe:projects', () => {
            socket.join('projects');
            console.log(`Client ${socket.id} subscribed to project events`);
        });
        socket.on('unsubscribe:projects', () => {
            socket.leave('projects');
            console.log(`Client ${socket.id} unsubscribed from project events`);
        });
        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
        });
        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    });
    return {
        // Broadcast agent event to subscribed clients
        broadcastAgentEvent: (event) => {
            const message = {
                type: shared_1.WS_EVENTS.AGENT_CREATED,
                data: event,
                timestamp: Date.now(),
                agentId: event.agentId
            };
            io.to('agents').emit('agent:event', message);
        },
        // Broadcast project update to subscribed clients
        broadcastProjectUpdate: (projectId, data) => {
            const message = {
                type: shared_1.WS_EVENTS.PROJECT_UPDATED,
                data: { projectId, ...data },
                timestamp: Date.now()
            };
            io.to('projects').emit('project:update', message);
        },
        // Broadcast configuration change
        broadcastConfigChange: (config) => {
            const message = {
                type: shared_1.WS_EVENTS.CONFIG_CHANGED,
                data: config,
                timestamp: Date.now()
            };
            io.emit('config:change', message);
        },
        // Broadcast agent creation progress
        broadcastAgentProgress: (agentId, progress) => {
            const message = {
                type: shared_1.WS_EVENTS.AGENT_PROGRESS,
                data: progress,
                timestamp: Date.now(),
                agentId
            };
            io.to('agents').emit('agent:progress', message);
        }
    };
};
exports.setupWebSocket = setupWebSocket;
// Function to connect to agent terminal (Docker only)
async function connectToAgentTerminal(socket, agentId) {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        // Check if Docker container exists for this agent
        try {
            const { stdout: containerCheck } = await execAsync(`docker ps -q -f name=magents-${agentId}`);
            if (containerCheck.trim()) {
                // Docker container exists, connect to it
                console.log(`Connecting to Docker container for agent ${agentId}`);
                connectToDockerContainer(socket, agentId);
            }
            else {
                socket.emit('error', `Docker container for agent ${agentId} not found or not running`);
            }
        }
        catch (error) {
            console.error('Docker not available:', error);
            socket.emit('error', 'Docker is not available or container not found');
        }
    }
    catch (error) {
        console.error('Error connecting to agent terminal:', error);
        socket.emit('error', 'Failed to connect to agent terminal');
    }
}
// Connect to Docker container using node-pty for proper terminal emulation
function connectToDockerContainer(socket, agentId) {
    try {
        // Use node-pty for proper terminal emulation
        const ptyProcess = pty.spawn('docker', ['exec', '-it', `magents-${agentId}`, '/bin/bash'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env
        });
        terminalSessions.set(socket.id, ptyProcess);
        // Send initial connection success
        socket.emit('data', `\x1b[32mConnected to Docker container magents-${agentId}\x1b[0m\r\n`);
        // Handle PTY output
        ptyProcess.onData((data) => {
            socket.emit('data', data);
        });
        // Handle input from client
        socket.on('input', (data) => {
            ptyProcess.write(data);
        });
        // Handle terminal resize
        socket.on('resize', ({ cols, rows }) => {
            ptyProcess.resize(cols, rows);
        });
        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`Docker PTY exited with code ${exitCode}, signal ${signal}`);
            socket.emit('data', `\r\n\x1b[33mContainer session ended\x1b[0m\r\n`);
            terminalSessions.delete(socket.id);
            socket.disconnect();
        });
    }
    catch (error) {
        console.error('Docker PTY error:', error);
        socket.emit('error', 'Failed to connect to Docker container');
        socket.disconnect();
    }
}
// Connect to system terminal (host shell)
function connectToSystemTerminal(socket) {
    try {
        // Use node-pty to spawn a shell process on the host system
        const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME || process.cwd(),
            env: process.env
        });
        terminalSessions.set(socket.id, ptyProcess);
        // Send welcome message
        socket.emit('data', `\x1b[32mSystem terminal connected\x1b[0m\r\n`);
        socket.emit('data', `\x1b[36mShell: ${shell}\x1b[0m\r\n`);
        socket.emit('data', `\x1b[36mWorking directory: ${process.env.HOME || process.cwd()}\x1b[0m\r\n\r\n`);
        // Handle PTY output
        ptyProcess.onData((data) => {
            socket.emit('data', data);
        });
        // Handle input from client
        socket.on('input', (data) => {
            ptyProcess.write(data);
        });
        // Handle terminal resize
        socket.on('resize', ({ cols, rows }) => {
            ptyProcess.resize(cols, rows);
        });
        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`System terminal PTY exited with code ${exitCode}, signal ${signal}`);
            socket.emit('data', `\r\n\x1b[33mTerminal session ended\x1b[0m\r\n`);
            terminalSessions.delete(socket.id);
            socket.disconnect();
        });
    }
    catch (error) {
        console.error('System terminal PTY error:', error);
        socket.emit('error', 'Failed to connect to system terminal');
        socket.disconnect();
    }
}
//# sourceMappingURL=websocket.js.map