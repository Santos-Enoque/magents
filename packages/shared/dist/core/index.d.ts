/**
 * Core Business Logic Package for GUI-CLI Integration
 *
 * Provides unified command execution, real-time synchronization,
 * and shared business logic between GUI and CLI interfaces.
 */
import { MagentsError } from '../errors';
export interface CommandOptions {
    agentId?: string;
    projectId?: string;
    params?: Record<string, any>;
    source: 'GUI' | 'CLI';
    userId?: string;
    sessionId: string;
}
export interface CoreCommandResult {
    success: boolean;
    data?: any;
    error?: MagentsError;
    executionTime: number;
    commandId: string;
    source: 'GUI' | 'CLI';
    timestamp: Date;
}
export interface ActivityLogEntry {
    id: string;
    timestamp: Date;
    source: 'GUI' | 'CLI';
    command: string;
    params: Record<string, any>;
    result: CoreCommandResult;
    userId?: string;
    sessionId: string;
}
export type MagentsEvent = 'agent.created' | 'agent.updated' | 'agent.deleted' | 'agent.started' | 'agent.stopped' | 'project.created' | 'project.updated' | 'project.deleted' | 'command.executed' | 'sync.conflict' | 'system.status';
export interface EventPayload {
    eventType: MagentsEvent;
    data: any;
    source: 'GUI' | 'CLI';
    timestamp: Date;
    sessionId: string;
    userId?: string;
}
export interface ICommand {
    name: string;
    description: string;
    category: 'agent' | 'project' | 'system' | 'config';
    requiredParams: string[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export interface ConflictInfo {
    id: string;
    timestamp: Date;
    commandA: ActivityLogEntry;
    commandB: ActivityLogEntry;
    conflictType: 'resource' | 'state' | 'concurrent';
    severity: 'low' | 'medium' | 'high';
    autoResolved: boolean;
    resolution?: string;
}
/**
 * Core Command Registry
 * Central registry for all commands available in both GUI and CLI
 */
export declare class CommandRegistry {
    private commands;
    private eventBus;
    registerCommand(command: ICommand): void;
    getCommand(name: string): ICommand | undefined;
    getAllCommands(): ICommand[];
    getCommandsByCategory(category: string): ICommand[];
    executeCommand(commandName: string, options: CommandOptions): Promise<CoreCommandResult>;
    on(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
}
/**
 * Real-time Synchronization Bridge
 * Manages real-time updates between GUI and CLI
 */
export declare class SyncBridge {
    private eventBus;
    private subscribers;
    private lastSync;
    subscribe(sessionId: string, eventTypes: MagentsEvent[]): void;
    unsubscribe(sessionId: string, eventTypes?: MagentsEvent[]): void;
    broadcast(payload: EventPayload): void;
    onSync(sessionId: string, callback: (payload: EventPayload) => void): void;
    offSync(sessionId: string): void;
    getLastSyncTime(): Date;
    getSubscribers(): Record<string, string[]>;
}
/**
 * Activity Logger
 * Tracks all operations from both GUI and CLI interfaces
 */
export declare class ActivityLogger {
    private logs;
    private maxEntries;
    log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry;
    getLogs(filters?: {
        source?: 'GUI' | 'CLI';
        command?: string;
        userId?: string;
        sessionId?: string;
        since?: Date;
        limit?: number;
    }): ActivityLogEntry[];
    getLogById(id: string): ActivityLogEntry | undefined;
    clearLogs(olderThan?: Date): number;
    getStats(): {
        totalEntries: number;
        bySource: Record<'GUI' | 'CLI', number>;
        byCommand: Record<string, number>;
        recentActivity: ActivityLogEntry[];
    };
}
/**
 * Conflict Resolver
 * Handles conflicts when GUI and CLI operations interfere
 */
export declare class ConflictResolver {
    private conflicts;
    private resolutionStrategies;
    registerResolutionStrategy(conflictType: string, resolver: (conflict: ConflictInfo) => Promise<boolean>): void;
    detectConflict(commandA: ActivityLogEntry, commandB: ActivityLogEntry): Promise<ConflictInfo | null>;
    resolveConflict(conflict: ConflictInfo): Promise<boolean>;
    getConflicts(filters?: {
        resolved?: boolean;
        severity?: 'low' | 'medium' | 'high';
        since?: Date;
    }): ConflictInfo[];
    private createConflict;
    private isResourceConflict;
    private isStateConflict;
    private isConcurrentConflict;
}
/**
 * Unified Core Manager
 * Main orchestrator for GUI-CLI integration
 */
export declare class CoreManager {
    private static instance;
    readonly commandRegistry: CommandRegistry;
    readonly syncBridge: SyncBridge;
    readonly activityLogger: ActivityLogger;
    readonly conflictResolver: ConflictResolver;
    private constructor();
    static getInstance(): CoreManager;
    executeCommand(commandName: string, options: CommandOptions): Promise<CoreCommandResult>;
    private setupEventHandlers;
    private setupDefaultResolutionStrategies;
}
export declare const coreManager: CoreManager;
//# sourceMappingURL=index.d.ts.map