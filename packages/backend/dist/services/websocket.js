"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = void 0;
const shared_1 = require("@magents/shared");
const setupWebSocket = (io) => {
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
//# sourceMappingURL=websocket.js.map