/**
 * DataSync Service for Real-time Updates
 * 
 * This service provides real-time synchronization between CLI and GUI components
 * using WebSockets and event-driven architecture with the unified data model.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import {
  UnifiedAgentData,
  UnifiedProjectData,
  UnifiedTaskData,
  UnifiedConfigData,
  UnifiedEventData,
  EventType,
  EntityId,
} from '../types/unified';
import { UnifiedDatabaseService, AgentRepository, ProjectRepository, TaskRepository, ConfigRepository, EventRepository } from '../database';

export interface SyncEvent {
  id: string;
  type: EventType;
  entityType: 'agent' | 'project' | 'task' | 'config';
  entityId: EntityId;
  action: 'create' | 'update' | 'delete';
  data?: any;
  previousData?: any;
  timestamp: Date;
  source: 'cli' | 'gui' | 'api' | 'system' | 'external';
  metadata?: Record<string, any>;
}

export interface SyncClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface SyncServerConfig {
  port: number;
  heartbeatInterval?: number;
  maxConnections?: number;
  corsOrigins?: string[];
}

export class DataSyncClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<SyncClientConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private isConnected = false;

  constructor(config: SyncClientConfig) {
    super();
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
  async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);
        
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
          } catch (error) {
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

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the sync server
   */
  disconnect(): void {
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
  sendEvent(event: SyncEvent): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send event: not connected to sync server');
      return;
    }

    try {
      this.ws.send(JSON.stringify(event));
    } catch (error) {
      console.error('Failed to send sync event:', error);
      this.emit('error', error);
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(eventTypes: EventType[]): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot subscribe: not connected to sync server');
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        eventTypes,
      }));
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
      this.emit('error', error);
    }
  }

  /**
   * Unsubscribe from specific event types
   */
  unsubscribe(eventTypes: EventType[]): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot unsubscribe: not connected to sync server');
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        eventTypes,
      }));
    } catch (error) {
      console.error('Failed to unsubscribe from events:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'sync_event':
        this.emit('sync_event', message.data as SyncEvent);
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

  private async reconnect(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.emit('max_reconnect_attempts_reached');
          this.isReconnecting = false;
        } else {
          this.reconnect();
        }
      }
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export class DataSyncServer extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private config: Required<SyncServerConfig>;
  private clients = new Set<WebSocket>();
  private subscriptions = new Map<WebSocket, Set<EventType>>();
  private heartbeatTimers = new Map<WebSocket, NodeJS.Timeout>();
  private db: UnifiedDatabaseService;
  private eventRepo: EventRepository;

  constructor(config: SyncServerConfig, db: UnifiedDatabaseService) {
    super();
    this.config = {
      heartbeatInterval: 30000,
      maxConnections: 100,
      corsOrigins: ['*'],
      ...config,
    };
    this.db = db;
    this.eventRepo = new EventRepository(db);
  }

  /**
   * Start the sync server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({
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

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the sync server
   */
  stop(): Promise<void> {
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
  broadcastEvent(event: SyncEvent): void {
    const message = JSON.stringify({
      type: 'sync_event',
      data: event,
    });

    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        const subscriptions = this.subscriptions.get(ws);
        if (!subscriptions || subscriptions.has(event.type)) {
          try {
            ws.send(message);
          } catch (error) {
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
  getClientCount(): number {
    return this.clients.size;
  }

  private handleConnection(ws: WebSocket, request: any): void {
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
      } catch (error) {
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

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;

      case 'subscribe':
        if (Array.isArray(message.eventTypes)) {
          const subscriptions = this.subscriptions.get(ws) || new Set();
          message.eventTypes.forEach((eventType: EventType) => {
            subscriptions.add(eventType);
          });
          this.subscriptions.set(ws, subscriptions);
        }
        break;

      case 'unsubscribe':
        if (Array.isArray(message.eventTypes)) {
          const subscriptions = this.subscriptions.get(ws);
          if (subscriptions) {
            message.eventTypes.forEach((eventType: EventType) => {
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

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to client:', error);
      }
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      message,
    });
  }

  private startClientHeartbeat(ws: WebSocket): void {
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error('Failed to ping client:', error);
          this.cleanupClient(ws);
        }
      } else {
        this.cleanupClient(ws);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(ws, timer);
  }

  private cleanupClient(ws: WebSocket): void {
    this.clients.delete(ws);
    this.subscriptions.delete(ws);
    
    const timer = this.heartbeatTimers.get(ws);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(ws);
    }
  }

  private async storeEvent(event: SyncEvent): Promise<void> {
    try {
      const eventData: UnifiedEventData = {
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
    } catch (error) {
      console.error('Failed to store sync event:', error);
    }
  }
}

export class DataSyncManager extends EventEmitter {
  private db: UnifiedDatabaseService;
  private agentRepo: AgentRepository;
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;
  private configRepo: ConfigRepository;
  private eventRepo: EventRepository;
  private server: DataSyncServer | null = null;
  private client: DataSyncClient | null = null;

  constructor(db: UnifiedDatabaseService) {
    super();
    this.db = db;
    this.agentRepo = new AgentRepository(db);
    this.projectRepo = new ProjectRepository(db);
    this.taskRepo = new TaskRepository(db);
    this.configRepo = new ConfigRepository(db);
    this.eventRepo = new EventRepository(db);
  }

  /**
   * Start as a sync server
   */
  async startServer(config: SyncServerConfig): Promise<void> {
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
  async startClient(config: SyncClientConfig): Promise<void> {
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
  async stop(): Promise<void> {
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
  syncAgentChange(action: 'create' | 'update' | 'delete', agent: UnifiedAgentData, previousData?: UnifiedAgentData): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: `agent.${action}` as EventType,
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
  syncProjectChange(action: 'create' | 'update' | 'delete', project: UnifiedProjectData, previousData?: UnifiedProjectData): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: `project.${action}` as EventType,
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
  syncTaskChange(action: 'create' | 'update' | 'delete', task: UnifiedTaskData, previousData?: UnifiedTaskData): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: `task.${action}` as EventType,
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
  syncConfigChange(action: 'create' | 'update' | 'delete', config: UnifiedConfigData, previousData?: UnifiedConfigData): void {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type: `config.${action}` as EventType,
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
  getStats(): {
    serverConnections?: number;
    clientConnected?: boolean;
    eventsProcessed: number;
    lastEventTime?: Date;
  } {
    const recentEvents = this.eventRepo.findRecent(1);
    
    return {
      serverConnections: this.server?.getClientCount(),
      clientConnected: this.client?.isConnectedToServer(),
      eventsProcessed: this.eventRepo.count(),
      lastEventTime: recentEvents.length > 0 ? recentEvents[0].timestamp : undefined,
    };
  }

  private setupServerEventHandlers(): void {
    if (!this.server) return;

    this.server.on('client_connected', () => {
      this.emit('client_connected');
    });

    this.server.on('event_received', (event: SyncEvent) => {
      this.handleSyncEvent(event);
    });

    this.server.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private setupClientEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connected', () => {
      this.emit('connected');
      // Subscribe to all event types by default
      this.client!.subscribe([
        'agent.created', 'agent.updated', 'agent.deleted',
        'project.created', 'project.updated', 'project.deleted',
        'task.created', 'task.updated', 'task.deleted',
        'config.updated',
      ]);
    });

    this.client.on('sync_event', (event: SyncEvent) => {
      this.handleSyncEvent(event);
    });

    this.client.on('disconnected', () => {
      this.emit('disconnected');
    });

    this.client.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private handleSyncEvent(event: SyncEvent): void {
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
    } catch (error) {
      console.error('Failed to apply sync event:', error);
      this.emit('sync_error', { event, error });
    }
  }

  private handleAgentSync(event: SyncEvent): void {
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

  private handleProjectSync(event: SyncEvent): void {
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

  private handleTaskSync(event: SyncEvent): void {
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

  private handleConfigSync(event: SyncEvent): void {
    switch (event.action) {
      case 'create':
      case 'update':
        this.configRepo.updateGlobalConfig(event.data);
        break;
    }
  }

  private broadcastEvent(event: SyncEvent): void {
    if (this.server) {
      this.server.broadcastEvent(event);
    }

    if (this.client) {
      this.client.sendEvent(event);
    }

    this.emit('event_broadcasted', event);
  }

  private generateEventId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory functions for easy initialization
export const createSyncServer = (config: SyncServerConfig, db: UnifiedDatabaseService): DataSyncServer => {
  return new DataSyncServer(config, db);
};

export const createSyncClient = (config: SyncClientConfig): DataSyncClient => {
  return new DataSyncClient(config);
};

export const createSyncManager = (db: UnifiedDatabaseService): DataSyncManager => {
  return new DataSyncManager(db);
};