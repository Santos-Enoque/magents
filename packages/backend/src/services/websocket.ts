import { Server as SocketIOServer, Socket } from 'socket.io';
import { WebSocketMessage, AgentEvent, AgentCreationProgress, WS_EVENTS } from '@magents/shared';
import { spawn, ChildProcess } from 'child_process';
const pty = require('node-pty');

// Store active terminal sessions
const terminalSessions = new Map<string, any>();

export const setupWebSocket = (io: SocketIOServer) => {
  // Terminal namespace for agent terminal connections
  const terminalNamespace = io.of('/terminal');
  
  terminalNamespace.on('connection', (socket: Socket) => {
    const agentId = socket.handshake.query.agentId as string;
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
  
  systemTerminalNamespace.on('connection', (socket: Socket) => {
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

  io.on('connection', (socket: Socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    
    // Send welcome message
    const welcomeMessage: WebSocketMessage = {
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
    broadcastAgentEvent: (event: AgentEvent) => {
      const message: WebSocketMessage<AgentEvent> = {
        type: WS_EVENTS.AGENT_CREATED,
        data: event,
        timestamp: Date.now(),
        agentId: event.agentId
      };
      
      io.to('agents').emit('agent:event', message);
    },
    
    // Broadcast project update to subscribed clients
    broadcastProjectUpdate: (projectId: string, data: Record<string, unknown>) => {
      const message: WebSocketMessage = {
        type: WS_EVENTS.PROJECT_UPDATED,
        data: { projectId, ...data },
        timestamp: Date.now()
      };
      
      io.to('projects').emit('project:update', message);
    },
    
    // Broadcast configuration change
    broadcastConfigChange: (config: unknown) => {
      const message: WebSocketMessage = {
        type: WS_EVENTS.CONFIG_CHANGED,
        data: config,
        timestamp: Date.now()
      };
      
      io.emit('config:change', message);
    },
    
    // Broadcast agent creation progress
    broadcastAgentProgress: (agentId: string, progress: AgentCreationProgress) => {
      const message: WebSocketMessage<AgentCreationProgress> = {
        type: WS_EVENTS.AGENT_PROGRESS,
        data: progress,
        timestamp: Date.now(),
        agentId
      };
      
      io.to('agents').emit('agent:progress', message);
    }
  };
};

// Function to connect to agent terminal (Docker only)
async function connectToAgentTerminal(socket: Socket, agentId: string) {
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
      } else {
        socket.emit('error', `Docker container for agent ${agentId} not found or not running`);
      }
    } catch (error) {
      console.error('Docker not available:', error);
      socket.emit('error', 'Docker is not available or container not found');
    }
  } catch (error) {
    console.error('Error connecting to agent terminal:', error);
    socket.emit('error', 'Failed to connect to agent terminal');
  }
}

// Connect to Docker container using node-pty for proper terminal emulation
function connectToDockerContainer(socket: Socket, agentId: string) {
  try {
    // Use node-pty for proper terminal emulation
    const ptyProcess = pty.spawn('docker', ['exec', '-it', `magents-${agentId}`, '/bin/bash'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env as any
    });
    
    terminalSessions.set(socket.id, ptyProcess);
    
    // Send initial connection success
    socket.emit('data', `\x1b[32mConnected to Docker container magents-${agentId}\x1b[0m\r\n`);
    
    // Handle PTY output
    ptyProcess.onData((data: string) => {
      socket.emit('data', data);
    });
    
    // Handle input from client
    socket.on('input', (data: string) => {
      ptyProcess.write(data);
    });
    
    // Handle terminal resize
    socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
      ptyProcess.resize(cols, rows);
    });
    
    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }: { exitCode: number | null; signal?: number | null }) => {
      console.log(`Docker PTY exited with code ${exitCode}, signal ${signal}`);
      socket.emit('data', `\r\n\x1b[33mContainer session ended\x1b[0m\r\n`);
      terminalSessions.delete(socket.id);
      socket.disconnect();
    });
    
  } catch (error) {
    console.error('Docker PTY error:', error);
    socket.emit('error', 'Failed to connect to Docker container');
    socket.disconnect();
  }
}


// Connect to system terminal (host shell)
function connectToSystemTerminal(socket: Socket) {
  try {
    // Use node-pty to spawn a shell process on the host system
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME || process.cwd(),
      env: process.env as any
    });
    
    terminalSessions.set(socket.id, ptyProcess);
    
    // Send welcome message
    socket.emit('data', `\x1b[32mSystem terminal connected\x1b[0m\r\n`);
    socket.emit('data', `\x1b[36mShell: ${shell}\x1b[0m\r\n`);
    socket.emit('data', `\x1b[36mWorking directory: ${process.env.HOME || process.cwd()}\x1b[0m\r\n\r\n`);
    
    // Handle PTY output
    ptyProcess.onData((data: string) => {
      socket.emit('data', data);
    });
    
    // Handle input from client
    socket.on('input', (data: string) => {
      ptyProcess.write(data);
    });
    
    // Handle terminal resize
    socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
      ptyProcess.resize(cols, rows);
    });
    
    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }: { exitCode: number | null; signal?: number | null }) => {
      console.log(`System terminal PTY exited with code ${exitCode}, signal ${signal}`);
      socket.emit('data', `\r\n\x1b[33mTerminal session ended\x1b[0m\r\n`);
      terminalSessions.delete(socket.id);
      socket.disconnect();
    });
    
  } catch (error) {
    console.error('System terminal PTY error:', error);
    socket.emit('error', 'Failed to connect to system terminal');
    socket.disconnect();
  }
}