import { Server as SocketIOServer, Socket } from 'socket.io';
import { WebSocketMessage, AgentEvent, WS_EVENTS } from '@magents/shared';

export const setupWebSocket = (io: SocketIOServer) => {
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
    socket.on('subscribe:agents', (data) => {
      socket.join('agents');
      console.log(`Client ${socket.id} subscribed to agent events`);
    });
    
    socket.on('unsubscribe:agents', (data) => {
      socket.leave('agents');
      console.log(`Client ${socket.id} unsubscribed from agent events`);
    });
    
    // Handle project events subscription
    socket.on('subscribe:projects', (data) => {
      socket.join('projects');
      console.log(`Client ${socket.id} subscribed to project events`);
    });
    
    socket.on('unsubscribe:projects', (data) => {
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
    broadcastProjectUpdate: (projectId: string, data: any) => {
      const message: WebSocketMessage = {
        type: WS_EVENTS.PROJECT_UPDATED,
        data: { projectId, ...data },
        timestamp: Date.now()
      };
      
      io.to('projects').emit('project:update', message);
    },
    
    // Broadcast configuration change
    broadcastConfigChange: (config: any) => {
      const message: WebSocketMessage = {
        type: WS_EVENTS.CONFIG_CHANGED,
        data: config,
        timestamp: Date.now()
      };
      
      io.emit('config:change', message);
    }
  };
};