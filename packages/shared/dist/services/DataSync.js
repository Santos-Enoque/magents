"use strict";
/**
 * DataSync Service for Real-time Updates
 *
 * This service provides real-time synchronization between CLI and GUI components
 * using WebSockets and event-driven architecture with the unified data model.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyncManager = exports.createSyncClient = exports.createSyncServer = exports.DataSyncManager = exports.DataSyncServer = exports.DataSyncClient = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const database_1 = require("../database");
class DataSyncClient extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.isReconnecting = false;
        this.isConnected = false;
        this.config = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            timeout: 10000,
            ...config,
        };
    }
    /**
     * Connect to the sync server
     */
    async connect() {
        if (this.ws && this.isConnected) {
            return;
        }
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.config.url);
                const timeout = setTimeout(() => {
                    this.ws?.terminate();
                    reject(new Error('Connection timeout'));
                }, this.config.timeout);
                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.isReconnecting = false;
                    this.startHeartbeat();
                    this.emit('connected');
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('Failed to parse sync message:', error);
                        this.emit('error', error);
                    }
                };
                this.ws.onclose = () => {
                    clearTimeout(timeout);
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.emit('disconnected');
                    if (!this.isReconnecting && this.reconnectAttempts < this.config.maxReconnectAttempts) {
                        this.reconnect();
                    }
                };
                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Disconnect from the sync server
     */
    disconnect() {
        this.isReconnecting = false;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    /**
     * Send a sync event to the server
     */
    sendEvent(event) {
        if (!this.isConnected || !this.ws) {
            console.warn('Cannot send event: not connected to sync server');
            return;
        }
        try {
            this.ws.send(JSON.stringify(event));
        }
        catch (error) {
            console.error('Failed to send sync event:', error);
            this.emit('error', error);
        }
    }
    /**
     * Subscribe to specific event types
     */
    subscribe(eventTypes) {
        if (!this.isConnected || !this.ws) {
            console.warn('Cannot subscribe: not connected to sync server');
            return;
        }
        try {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                eventTypes,
            }));
        }
        catch (error) {
            console.error('Failed to subscribe to events:', error);
            this.emit('error', error);
        }
    }
    /**
     * Unsubscribe from specific event types
     */
    unsubscribe(eventTypes) {
        if (!this.isConnected || !this.ws) {
            console.warn('Cannot unsubscribe: not connected to sync server');
            return;
        }
        try {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                eventTypes,
            }));
        }
        catch (error) {
            console.error('Failed to unsubscribe from events:', error);
            this.emit('error', error);
        }
    }
    /**
     * Get connection status
     */
    isConnectedToServer() {
        return this.isConnected;
    }
    handleMessage(message) {
        switch (message.type) {
            case 'sync_event':
                this.emit('sync_event', message.data);
                break;
            case 'pong':
                // Heartbeat response - connection is alive
                break;
            case 'error':
                this.emit('error', new Error(message.message || 'Server error'));
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }
    async reconnect() {
        if (this.isReconnecting) {
            return;
        }
        this.isReconnecting = true;
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
        setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                console.error('Reconnection failed:', error);
                if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
                    this.emit('max_reconnect_attempts_reached');
                    this.isReconnecting = false;
                }
                else {
                    this.reconnect();
                }
            }
        }, this.config.reconnectInterval);
    }
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.isConnected) {
                try {
                    this.ws.send(JSON.stringify({ type: 'ping' }));
                }
                catch (error) {
                    console.error('Failed to send heartbeat:', error);
                }
            }
        }, this.config.heartbeatInterval);
    }
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}
exports.DataSyncClient = DataSyncClient;
class DataSyncServer extends events_1.EventEmitter {
    constructor(config, db) {
        super();
        this.wss = null;
        this.clients = new Set();
        this.subscriptions = new Map();
        this.heartbeatTimers = new Map();
        this.config = {
            heartbeatInterval: 30000,
            maxConnections: 100,
            corsOrigins: ['*'],
            ...config,
        };
        this.db = db;
        this.eventRepo = new database_1.EventRepository(db);
    }
    /**
     * Start the sync server
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new ws_1.default.Server({
                    port: this.config.port,
                    perMessageDeflate: false,
                    maxPayload: 1024 * 1024, // 1MB
                });
                this.wss.on('connection', (ws, request) => {
                    this.handleConnection(ws, request);
                });
                this.wss.on('listening', () => {
                    console.log(`DataSync server listening on port ${this.config.port}`);
                    this.emit('listening');
                    resolve();
                });
                this.wss.on('error', (error) => {
                    console.error('DataSync server error:', error);
                    this.emit('error', error);
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the sync server
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.wss) {
                resolve();
                return;
            }
            // Close all client connections
            for (const ws of this.clients) {
                this.cleanupClient(ws);
                ws.terminate();
            }
            this.wss.close(() => {
                console.log('DataSync server stopped');
                this.emit('stopped');
                resolve();
            });
        });
    }
    /**
     * Broadcast a sync event to all subscribed clients
     */
    broadcastEvent(event) {
        const message = JSON.stringify({
            type: 'sync_event',
            data: event,
        });
        for (const ws of this.clients) {
            if (ws.readyState === ws_1.default.OPEN) {
                const subscriptions = this.subscriptions.get(ws);
                if (!subscriptions || subscriptions.has(event.type)) {
                    try {
                        ws.send(message);
                    }
                    catch (error) {
                        console.error('Failed to send event to client:', error);
                    }
                }
            }
        }
        // Store event in database for replay/history
        this.storeEvent(event);
    }
    /**
     * Get the number of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
    handleConnection(ws, request) {
        // Check connection limit
        if (this.clients.size >= this.config.maxConnections) {
            ws.close(1008, 'Server at capacity');
            return;
        }
        console.log('New client connected');
        this.clients.add(ws);
        this.subscriptions.set(ws, new Set());
        this.startClientHeartbeat(ws);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(ws, message);
            }
            catch (error) {
                console.error('Failed to parse client message:', error);
                this.sendError(ws, 'Invalid message format');
            }
        });
        ws.on('close', () => {
            console.log('Client disconnected');
            this.cleanupClient(ws);
        });
        ws.on('error', (error) => {
            console.error('Client error:', error);
            this.cleanupClient(ws);
        });
        this.emit('client_connected', ws);
    }
    handleClientMessage(ws, message) {
        switch (message.type) {
            case 'ping':
                this.sendMessage(ws, { type: 'pong' });
                break;
            case 'subscribe':
                if (Array.isArray(message.eventTypes)) {
                    const subscriptions = this.subscriptions.get(ws) || new Set();
                    message.eventTypes.forEach((eventType) => {
                        subscriptions.add(eventType);
                    });
                    this.subscriptions.set(ws, subscriptions);
                }
                break;
            case 'unsubscribe':
                if (Array.isArray(message.eventTypes)) {
                    const subscriptions = this.subscriptions.get(ws);
                    if (subscriptions) {
                        message.eventTypes.forEach((eventType) => {
                            subscriptions.delete(eventType);
                        });
                    }
                }
                break;
            case 'sync_event':
                // Client is sending an event to broadcast
                if (message.data) {
                    this.broadcastEvent(message.data);
                    this.emit('event_received', message.data);
                }
                break;
            default:
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }
    sendMessage(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                console.error('Failed to send message to client:', error);
            }
        }
    }
    sendError(ws, message) {
        this.sendMessage(ws, {
            type: 'error',
            message,
        });
    }
    startClientHeartbeat(ws) {
        const timer = setInterval(() => {
            if (ws.readyState === ws_1.default.OPEN) {
                try {
                    ws.ping();
                }
                catch (error) {
                    console.error('Failed to ping client:', error);
                    this.cleanupClient(ws);
                }
            }
            else {
                this.cleanupClient(ws);
            }
        }, this.config.heartbeatInterval);
        this.heartbeatTimers.set(ws, timer);
    }
    cleanupClient(ws) {
        this.clients.delete(ws);
        this.subscriptions.delete(ws);
        const timer = this.heartbeatTimers.get(ws);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(ws);
        }
    }
    async storeEvent(event) {
        try {
            const eventData = {
                id: event.id,
                type: event.type,
                timestamp: event.timestamp,
                entityId: event.entityId,
                entityType: event.entityType,
                source: event.source,
                data: event.data || {},
                previousData: event.previousData,
                metadata: event.metadata || {},
            };
            this.eventRepo.create(eventData);
        }
        catch (error) {
            console.error('Failed to store sync event:', error);
        }
    }
}
exports.DataSyncServer = DataSyncServer;
class DataSyncManager extends events_1.EventEmitter {
    constructor(db) {
        super();
        this.server = null;
        this.client = null;
        this.db = db;
        this.agentRepo = new database_1.AgentRepository(db);
        this.projectRepo = new database_1.ProjectRepository(db);
        this.taskRepo = new database_1.TaskRepository(db);
        this.configRepo = new database_1.ConfigRepository(db);
        this.eventRepo = new database_1.EventRepository(db);
    }
    /**
     * Start as a sync server
     */
    async startServer(config) {
        if (this.server) {
            throw new Error('Server already started');
        }
        this.server = new DataSyncServer(config, this.db);
        this.setupServerEventHandlers();
        await this.server.start();
    }
    /**
     * Start as a sync client
     */
    async startClient(config) {
        if (this.client) {
            throw new Error('Client already started');
        }
        this.client = new DataSyncClient(config);
        this.setupClientEventHandlers();
        await this.client.connect();
    }
    /**
     * Stop the sync service
     */
    async stop() {
        if (this.server) {
            await this.server.stop();
            this.server = null;
        }
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
    }
    /**
     * Sync agent data changes
     */
    syncAgentChange(action, agent, previousData) {
        const event = {
            id: this.generateEventId(),
            type: `agent.${action}`,
            entityType: 'agent',
            entityId: agent.id,
            action,
            data: agent,
            previousData,
            timestamp: new Date(),
            source: 'api',
            metadata: {},
        };
        this.broadcastEvent(event);
    }
    /**
     * Sync project data changes
     */
    syncProjectChange(action, project, previousData) {
        const event = {
            id: this.generateEventId(),
            type: `project.${action}`,
            entityType: 'project',
            entityId: project.id,
            action,
            data: project,
            previousData,
            timestamp: new Date(),
            source: 'api',
            metadata: {},
        };
        this.broadcastEvent(event);
    }
    /**
     * Sync task data changes
     */
    syncTaskChange(action, task, previousData) {
        const event = {
            id: this.generateEventId(),
            type: `task.${action}`,
            entityType: 'task',
            entityId: task.id,
            action,
            data: task,
            previousData,
            timestamp: new Date(),
            source: 'api',
            metadata: {},
        };
        this.broadcastEvent(event);
    }
    /**
     * Sync configuration changes
     */
    syncConfigChange(action, config, previousData) {
        const event = {
            id: this.generateEventId(),
            type: `config.${action}`,
            entityType: 'config',
            entityId: 'global',
            action,
            data: config,
            previousData,
            timestamp: new Date(),
            source: 'api',
            metadata: {},
        };
        this.broadcastEvent(event);
    }
    /**
     * Get sync statistics
     */
    getStats() {
        const recentEvents = this.eventRepo.findRecent(1);
        return {
            serverConnections: this.server?.getClientCount(),
            clientConnected: this.client?.isConnectedToServer(),
            eventsProcessed: this.eventRepo.count(),
            lastEventTime: recentEvents.length > 0 ? recentEvents[0].timestamp : undefined,
        };
    }
    setupServerEventHandlers() {
        if (!this.server)
            return;
        this.server.on('client_connected', () => {
            this.emit('client_connected');
        });
        this.server.on('event_received', (event) => {
            this.handleSyncEvent(event);
        });
        this.server.on('error', (error) => {
            this.emit('error', error);
        });
    }
    setupClientEventHandlers() {
        if (!this.client)
            return;
        this.client.on('connected', () => {
            this.emit('connected');
            // Subscribe to all event types by default
            this.client.subscribe([
                'agent.created', 'agent.updated', 'agent.deleted',
                'project.created', 'project.updated', 'project.deleted',
                'task.created', 'task.updated', 'task.deleted',
                'config.updated',
            ]);
        });
        this.client.on('sync_event', (event) => {
            this.handleSyncEvent(event);
        });
        this.client.on('disconnected', () => {
            this.emit('disconnected');
        });
        this.client.on('error', (error) => {
            this.emit('error', error);
        });
    }
    handleSyncEvent(event) {
        try {
            // Apply the sync event to the local database
            switch (event.entityType) {
                case 'agent':
                    this.handleAgentSync(event);
                    break;
                case 'project':
                    this.handleProjectSync(event);
                    break;
                case 'task':
                    this.handleTaskSync(event);
                    break;
                case 'config':
                    this.handleConfigSync(event);
                    break;
            }
            this.emit('sync_applied', event);
        }
        catch (error) {
            console.error('Failed to apply sync event:', error);
            this.emit('sync_error', { event, error });
        }
    }
    handleAgentSync(event) {
        switch (event.action) {
            case 'create':
                this.agentRepo.create(event.data);
                break;
            case 'update':
                this.agentRepo.update(event.entityId, event.data);
                break;
            case 'delete':
                this.agentRepo.delete(event.entityId);
                break;
        }
    }
    handleProjectSync(event) {
        switch (event.action) {
            case 'create':
                this.projectRepo.create(event.data);
                break;
            case 'update':
                this.projectRepo.update(event.entityId, event.data);
                break;
            case 'delete':
                this.projectRepo.delete(event.entityId);
                break;
        }
    }
    handleTaskSync(event) {
        switch (event.action) {
            case 'create':
                this.taskRepo.create(event.data);
                break;
            case 'update':
                this.taskRepo.update(event.entityId, event.data);
                break;
            case 'delete':
                this.taskRepo.delete(event.entityId);
                break;
        }
    }
    handleConfigSync(event) {
        switch (event.action) {
            case 'create':
            case 'update':
                this.configRepo.updateGlobalConfig(event.data);
                break;
        }
    }
    broadcastEvent(event) {
        if (this.server) {
            this.server.broadcastEvent(event);
        }
        if (this.client) {
            this.client.sendEvent(event);
        }
        this.emit('event_broadcasted', event);
    }
    generateEventId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.DataSyncManager = DataSyncManager;
// Factory functions for easy initialization
const createSyncServer = (config, db) => {
    return new DataSyncServer(config, db);
};
exports.createSyncServer = createSyncServer;
const createSyncClient = (config) => {
    return new DataSyncClient(config);
};
exports.createSyncClient = createSyncClient;
const createSyncManager = (db) => {
    return new DataSyncManager(db);
};
exports.createSyncManager = createSyncManager;
//# sourceMappingURL=DataSync.js.map