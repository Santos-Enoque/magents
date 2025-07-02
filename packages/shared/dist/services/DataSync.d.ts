/**
 * DataSync Service for Real-time Updates
 *
 * This service provides real-time synchronization between CLI and GUI components
 * using WebSockets and event-driven architecture with the unified data model.
 */
import { EventEmitter } from 'events';
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData, UnifiedConfigData, EventType, EntityId } from '../types/unified';
import { UnifiedDatabaseService } from '../database';
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
export declare class DataSyncClient extends EventEmitter {
    private ws;
    private config;
    private reconnectAttempts;
    private heartbeatTimer;
    private isReconnecting;
    private isConnected;
    constructor(config: SyncClientConfig);
    /**
     * Connect to the sync server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the sync server
     */
    disconnect(): void;
    /**
     * Send a sync event to the server
     */
    sendEvent(event: SyncEvent): void;
    /**
     * Subscribe to specific event types
     */
    subscribe(eventTypes: EventType[]): void;
    /**
     * Unsubscribe from specific event types
     */
    unsubscribe(eventTypes: EventType[]): void;
    /**
     * Get connection status
     */
    isConnectedToServer(): boolean;
    private handleMessage;
    private reconnect;
    private startHeartbeat;
    private stopHeartbeat;
}
export declare class DataSyncServer extends EventEmitter {
    private wss;
    private config;
    private clients;
    private subscriptions;
    private heartbeatTimers;
    private db;
    private eventRepo;
    constructor(config: SyncServerConfig, db: UnifiedDatabaseService);
    /**
     * Start the sync server
     */
    start(): Promise<void>;
    /**
     * Stop the sync server
     */
    stop(): Promise<void>;
    /**
     * Broadcast a sync event to all subscribed clients
     */
    broadcastEvent(event: SyncEvent): void;
    /**
     * Get the number of connected clients
     */
    getClientCount(): number;
    private handleConnection;
    private handleClientMessage;
    private sendMessage;
    private sendError;
    private startClientHeartbeat;
    private cleanupClient;
    private storeEvent;
}
export declare class DataSyncManager extends EventEmitter {
    private db;
    private agentRepo;
    private projectRepo;
    private taskRepo;
    private configRepo;
    private eventRepo;
    private server;
    private client;
    constructor(db: UnifiedDatabaseService);
    /**
     * Start as a sync server
     */
    startServer(config: SyncServerConfig): Promise<void>;
    /**
     * Start as a sync client
     */
    startClient(config: SyncClientConfig): Promise<void>;
    /**
     * Stop the sync service
     */
    stop(): Promise<void>;
    /**
     * Sync agent data changes
     */
    syncAgentChange(action: 'create' | 'update' | 'delete', agent: UnifiedAgentData, previousData?: UnifiedAgentData): void;
    /**
     * Sync project data changes
     */
    syncProjectChange(action: 'create' | 'update' | 'delete', project: UnifiedProjectData, previousData?: UnifiedProjectData): void;
    /**
     * Sync task data changes
     */
    syncTaskChange(action: 'create' | 'update' | 'delete', task: UnifiedTaskData, previousData?: UnifiedTaskData): void;
    /**
     * Sync configuration changes
     */
    syncConfigChange(action: 'create' | 'update' | 'delete', config: UnifiedConfigData, previousData?: UnifiedConfigData): void;
    /**
     * Get sync statistics
     */
    getStats(): {
        serverConnections?: number;
        clientConnected?: boolean;
        eventsProcessed: number;
        lastEventTime?: Date;
    };
    private setupServerEventHandlers;
    private setupClientEventHandlers;
    private handleSyncEvent;
    private handleAgentSync;
    private handleProjectSync;
    private handleTaskSync;
    private handleConfigSync;
    private broadcastEvent;
    private generateEventId;
}
export declare const createSyncServer: (config: SyncServerConfig, db: UnifiedDatabaseService) => DataSyncServer;
export declare const createSyncClient: (config: SyncClientConfig) => DataSyncClient;
export declare const createSyncManager: (db: UnifiedDatabaseService) => DataSyncManager;
//# sourceMappingURL=DataSync.d.ts.map