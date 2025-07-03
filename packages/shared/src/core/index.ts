/**
 * Core Business Logic Package for GUI-CLI Integration
 * 
 * Provides unified command execution, real-time synchronization,
 * and shared business logic between GUI and CLI interfaces.
 */

import { EventEmitter } from 'events';
import { Agent, Project, MagentsConfig } from '../types';
import { createMagentsError, MagentsError, ErrorSeverity } from '../errors';
import { ERROR_CODES } from '../constants';

// Command execution types
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

// Real-time event types
export type MagentsEvent = 
  | 'agent.created'
  | 'agent.updated'
  | 'agent.deleted'
  | 'agent.started'
  | 'agent.stopped'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'command.executed'
  | 'sync.conflict'
  | 'system.status';

export interface EventPayload {
  eventType: MagentsEvent;
  data: any;
  source: 'GUI' | 'CLI';
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

// Command interface for both GUI and CLI
export interface ICommand {
  name: string;
  description: string;
  category: 'agent' | 'project' | 'system' | 'config';
  requiredParams: string[];
  optionalParams: string[];
  execute(options: CommandOptions): Promise<CoreCommandResult>;
}

// Conflict resolution types
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
export class CommandRegistry {
  private commands: Map<string, ICommand> = new Map();
  private eventBus: EventEmitter = new EventEmitter();

  registerCommand(command: ICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): ICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): ICommand[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): ICommand[] {
    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  async executeCommand(commandName: string, options: CommandOptions): Promise<CoreCommandResult> {
    const startTime = Date.now();
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const command = this.getCommand(commandName);
      if (!command) {
        throw createMagentsError(ERROR_CODES.INVALID_CONFIG, {
          command: commandName,
          availableCommands: Array.from(this.commands.keys())
        });
      }

      // Validate required parameters
      const missingParams = command.requiredParams.filter(param => 
        !(param in (options.params || {}))
      );
      
      if (missingParams.length > 0) {
        throw createMagentsError(ERROR_CODES.INVALID_CONFIG, {
          command: commandName,
          missingParams,
          requiredParams: command.requiredParams
        });
      }

      // Execute command
      const result = await command.execute(options);
      const executionTime = Date.now() - startTime;

      const commandResult: CoreCommandResult = {
        ...result,
        executionTime,
        commandId,
        source: options.source,
        timestamp: new Date()
      };

      // Emit command executed event
      this.eventBus.emit('command.executed', {
        eventType: 'command.executed',
        data: { command: commandName, options, result: commandResult },
        source: options.source,
        timestamp: new Date(),
        sessionId: options.sessionId,
        userId: options.userId
      });

      return commandResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const magentsError = error instanceof MagentsError 
        ? error 
        : createMagentsError(ERROR_CODES.DOCKER_ERROR, { originalError: error });

      return {
        success: false,
        error: magentsError,
        executionTime,
        commandId,
        source: options.source,
        timestamp: new Date()
      };
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    this.eventBus.emit(event, ...args);
  }
}

/**
 * Real-time Synchronization Bridge
 * Manages real-time updates between GUI and CLI
 */
export class SyncBridge {
  private eventBus: EventEmitter = new EventEmitter();
  private subscribers: Map<string, Set<string>> = new Map();
  private lastSync: Date = new Date();

  subscribe(sessionId: string, eventTypes: MagentsEvent[]): void {
    eventTypes.forEach(eventType => {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Set());
      }
      this.subscribers.get(eventType)!.add(sessionId);
    });
  }

  unsubscribe(sessionId: string, eventTypes?: MagentsEvent[]): void {
    if (eventTypes) {
      eventTypes.forEach(eventType => {
        this.subscribers.get(eventType)?.delete(sessionId);
      });
    } else {
      // Unsubscribe from all events
      this.subscribers.forEach(sessions => sessions.delete(sessionId));
    }
  }

  broadcast(payload: EventPayload): void {
    const subscribers = this.subscribers.get(payload.eventType);
    if (subscribers) {
      subscribers.forEach(sessionId => {
        if (sessionId !== payload.sessionId) { // Don't send back to originator
          this.eventBus.emit(`sync:${sessionId}`, payload);
        }
      });
    }
    
    this.lastSync = new Date();
  }

  onSync(sessionId: string, callback: (payload: EventPayload) => void): void {
    this.eventBus.on(`sync:${sessionId}`, callback);
  }

  offSync(sessionId: string): void {
    this.eventBus.removeAllListeners(`sync:${sessionId}`);
  }

  getLastSyncTime(): Date {
    return this.lastSync;
  }

  getSubscribers(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.subscribers.forEach((sessions, eventType) => {
      result[eventType] = Array.from(sessions);
    });
    return result;
  }
}

/**
 * Activity Logger
 * Tracks all operations from both GUI and CLI interfaces
 */
export class ActivityLogger {
  private logs: ActivityLogEntry[] = [];
  private maxEntries: number = 10000;

  log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
    const logEntry: ActivityLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date()
    };

    this.logs.unshift(logEntry); // Add to beginning for recent-first order

    // Maintain max entries limit
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    return logEntry;
  }

  getLogs(filters?: {
    source?: 'GUI' | 'CLI';
    command?: string;
    userId?: string;
    sessionId?: string;
    since?: Date;
    limit?: number;
  }): ActivityLogEntry[] {
    let filtered = [...this.logs];

    if (filters) {
      if (filters.source) {
        filtered = filtered.filter(log => log.source === filters.source);
      }
      if (filters.command) {
        filtered = filtered.filter(log => log.command === filters.command);
      }
      if (filters.userId) {
        filtered = filtered.filter(log => log.userId === filters.userId);
      }
      if (filters.sessionId) {
        filtered = filtered.filter(log => log.sessionId === filters.sessionId);
      }
      if (filters.since) {
        filtered = filtered.filter(log => log.timestamp >= filters.since!);
      }
      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit);
      }
    }

    return filtered;
  }

  getLogById(id: string): ActivityLogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  clearLogs(olderThan?: Date): number {
    const initialCount = this.logs.length;
    
    if (olderThan) {
      this.logs = this.logs.filter(log => log.timestamp >= olderThan);
    } else {
      this.logs = [];
    }

    return initialCount - this.logs.length;
  }

  getStats(): {
    totalEntries: number;
    bySource: Record<'GUI' | 'CLI', number>;
    byCommand: Record<string, number>;
    recentActivity: ActivityLogEntry[];
  } {
    const bySource = { GUI: 0, CLI: 0 };
    const byCommand: Record<string, number> = {};

    this.logs.forEach(log => {
      bySource[log.source]++;
      byCommand[log.command] = (byCommand[log.command] || 0) + 1;
    });

    return {
      totalEntries: this.logs.length,
      bySource,
      byCommand,
      recentActivity: this.logs.slice(0, 10)
    };
  }
}

/**
 * Conflict Resolver
 * Handles conflicts when GUI and CLI operations interfere
 */
export class ConflictResolver {
  private conflicts: ConflictInfo[] = [];
  private resolutionStrategies: Map<string, (conflict: ConflictInfo) => Promise<boolean>> = new Map();

  registerResolutionStrategy(
    conflictType: string, 
    resolver: (conflict: ConflictInfo) => Promise<boolean>
  ): void {
    this.resolutionStrategies.set(conflictType, resolver);
  }

  async detectConflict(
    commandA: ActivityLogEntry, 
    commandB: ActivityLogEntry
  ): Promise<ConflictInfo | null> {
    // Detect resource conflicts (same agent/project)
    if (this.isResourceConflict(commandA, commandB)) {
      return this.createConflict(commandA, commandB, 'resource', 'medium');
    }

    // Detect state conflicts (incompatible operations)
    if (this.isStateConflict(commandA, commandB)) {
      return this.createConflict(commandA, commandB, 'state', 'high');
    }

    // Detect concurrent operation conflicts
    if (this.isConcurrentConflict(commandA, commandB)) {
      return this.createConflict(commandA, commandB, 'concurrent', 'low');
    }

    return null;
  }

  async resolveConflict(conflict: ConflictInfo): Promise<boolean> {
    const resolver = this.resolutionStrategies.get(conflict.conflictType);
    if (resolver) {
      try {
        const resolved = await resolver(conflict);
        conflict.autoResolved = resolved;
        if (resolved) {
          conflict.resolution = `Auto-resolved using ${conflict.conflictType} strategy`;
        }
        return resolved;
      } catch (error) {
        conflict.resolution = `Auto-resolution failed: ${error instanceof Error ? error.message : error}`;
        return false;
      }
    }

    return false;
  }

  getConflicts(filters?: {
    resolved?: boolean;
    severity?: 'low' | 'medium' | 'high';
    since?: Date;
  }): ConflictInfo[] {
    let filtered = [...this.conflicts];

    if (filters) {
      if (filters.resolved !== undefined) {
        filtered = filtered.filter(c => c.autoResolved === filters.resolved);
      }
      if (filters.severity) {
        filtered = filtered.filter(c => c.severity === filters.severity);
      }
      if (filters.since) {
        filtered = filtered.filter(c => c.timestamp >= filters.since!);
      }
    }

    return filtered;
  }

  private createConflict(
    commandA: ActivityLogEntry,
    commandB: ActivityLogEntry,
    type: 'resource' | 'state' | 'concurrent',
    severity: 'low' | 'medium' | 'high'
  ): ConflictInfo {
    const conflict: ConflictInfo = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
      commandA,
      commandB,
      conflictType: type,
      severity,
      autoResolved: false
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  private isResourceConflict(commandA: ActivityLogEntry, commandB: ActivityLogEntry): boolean {
    // Check if commands target the same resource
    const resourceA = commandA.params.agentId || commandA.params.projectId;
    const resourceB = commandB.params.agentId || commandB.params.projectId;
    
    return resourceA && resourceB && resourceA === resourceB && 
           Math.abs(commandA.timestamp.getTime() - commandB.timestamp.getTime()) < 5000; // 5 second window
  }

  private isStateConflict(commandA: ActivityLogEntry, commandB: ActivityLogEntry): boolean {
    // Check for incompatible operations
    const incompatiblePairs = [
      ['start-agent', 'delete-agent'],
      ['create-agent', 'delete-agent'],
      ['stop-agent', 'start-agent']
    ];

    return incompatiblePairs.some(([opA, opB]) => 
      (commandA.command === opA && commandB.command === opB) ||
      (commandA.command === opB && commandB.command === opA)
    );
  }

  private isConcurrentConflict(commandA: ActivityLogEntry, commandB: ActivityLogEntry): boolean {
    // Check for rapid concurrent operations from different sources
    return commandA.source !== commandB.source &&
           Math.abs(commandA.timestamp.getTime() - commandB.timestamp.getTime()) < 1000; // 1 second window
  }
}

/**
 * Unified Core Manager
 * Main orchestrator for GUI-CLI integration
 */
export class CoreManager {
  private static instance: CoreManager;
  
  public readonly commandRegistry: CommandRegistry;
  public readonly syncBridge: SyncBridge;
  public readonly activityLogger: ActivityLogger;
  public readonly conflictResolver: ConflictResolver;

  private constructor() {
    this.commandRegistry = new CommandRegistry();
    this.syncBridge = new SyncBridge();
    this.activityLogger = new ActivityLogger();
    this.conflictResolver = new ConflictResolver();

    this.setupEventHandlers();
    this.setupDefaultResolutionStrategies();
  }

  static getInstance(): CoreManager {
    if (!CoreManager.instance) {
      CoreManager.instance = new CoreManager();
    }
    return CoreManager.instance;
  }

  async executeCommand(commandName: string, options: CommandOptions): Promise<CoreCommandResult> {
    // Execute command
    const result = await this.commandRegistry.executeCommand(commandName, options);

    // Log activity
    const logEntry = this.activityLogger.log({
      source: options.source,
      command: commandName,
      params: options.params || {},
      result,
      userId: options.userId,
      sessionId: options.sessionId
    });

    // Broadcast real-time update
    this.syncBridge.broadcast({
      eventType: 'command.executed',
      data: { command: commandName, options, result, logEntry },
      source: options.source,
      timestamp: new Date(),
      sessionId: options.sessionId,
      userId: options.userId
    });

    return result;
  }

  private setupEventHandlers(): void {
    // Listen for command execution to detect conflicts
    this.commandRegistry.on('command.executed', async (event: EventPayload) => {
      const recentCommands = this.activityLogger.getLogs({
        since: new Date(Date.now() - 10000), // Last 10 seconds
        limit: 10
      });

      const currentCommand = recentCommands[0];
      for (let i = 1; i < recentCommands.length; i++) {
        const conflict = await this.conflictResolver.detectConflict(currentCommand, recentCommands[i]);
        if (conflict) {
          await this.conflictResolver.resolveConflict(conflict);
          
          // Broadcast conflict event
          this.syncBridge.broadcast({
            eventType: 'sync.conflict',
            data: conflict,
            source: event.source,
            timestamp: new Date(),
            sessionId: event.sessionId,
            userId: event.userId
          });
        }
      }
    });
  }

  private setupDefaultResolutionStrategies(): void {
    // Resource conflict resolution: Last operation wins
    this.conflictResolver.registerResolutionStrategy('resource', async (conflict) => {
      const laterCommand = conflict.commandA.timestamp > conflict.commandB.timestamp 
        ? conflict.commandA 
        : conflict.commandB;
      
      conflict.resolution = `Resolved by allowing later operation: ${laterCommand.command}`;
      return true;
    });

    // State conflict resolution: Prioritize safe operations
    this.conflictResolver.registerResolutionStrategy('state', async (conflict) => {
      const safeOperations = ['status', 'list', 'show'];
      const dangerousOperations = ['delete', 'stop'];
      
      const commandAIsSafe = safeOperations.some(op => conflict.commandA.command.includes(op));
      const commandBIsSafe = safeOperations.some(op => conflict.commandB.command.includes(op));
      
      if (commandAIsSafe && !commandBIsSafe) {
        conflict.resolution = 'Prioritized safe operation A over dangerous operation B';
        return true;
      } else if (commandBIsSafe && !commandAIsSafe) {
        conflict.resolution = 'Prioritized safe operation B over dangerous operation A';
        return true;
      }
      
      return false; // Require manual resolution
    });

    // Concurrent conflict resolution: Allow both if not conflicting
    this.conflictResolver.registerResolutionStrategy('concurrent', async (conflict) => {
      conflict.resolution = 'Allowed concurrent operations from different sources';
      return true;
    });
  }
}

// Export singleton instance
export const coreManager = CoreManager.getInstance();