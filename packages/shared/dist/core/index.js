"use strict";
/**
 * Core Business Logic Package for GUI-CLI Integration
 *
 * Provides unified command execution, real-time synchronization,
 * and shared business logic between GUI and CLI interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coreManager = exports.CoreManager = exports.ConflictResolver = exports.ActivityLogger = exports.SyncBridge = exports.CommandRegistry = void 0;
const events_1 = require("events");
const errors_1 = require("../errors");
const constants_1 = require("../constants");
/**
 * Core Command Registry
 * Central registry for all commands available in both GUI and CLI
 */
class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.eventBus = new events_1.EventEmitter();
    }
    registerCommand(command) {
        this.commands.set(command.name, command);
    }
    getCommand(name) {
        return this.commands.get(name);
    }
    getAllCommands() {
        return Array.from(this.commands.values());
    }
    getCommandsByCategory(category) {
        return this.getAllCommands().filter(cmd => cmd.category === category);
    }
    async executeCommand(commandName, options) {
        const startTime = Date.now();
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        try {
            const command = this.getCommand(commandName);
            if (!command) {
                throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.INVALID_CONFIG, {
                    command: commandName,
                    availableCommands: Array.from(this.commands.keys())
                });
            }
            // Validate required parameters
            const missingParams = command.requiredParams.filter(param => !(param in (options.params || {})));
            if (missingParams.length > 0) {
                throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.INVALID_CONFIG, {
                    command: commandName,
                    missingParams,
                    requiredParams: command.requiredParams
                });
            }
            // Execute command
            const result = await command.execute(options);
            const executionTime = Date.now() - startTime;
            const commandResult = {
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
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const magentsError = error instanceof errors_1.MagentsError
                ? error
                : (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.DOCKER_ERROR, { originalError: error });
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
    on(event, listener) {
        this.eventBus.on(event, listener);
    }
    emit(event, ...args) {
        this.eventBus.emit(event, ...args);
    }
}
exports.CommandRegistry = CommandRegistry;
/**
 * Real-time Synchronization Bridge
 * Manages real-time updates between GUI and CLI
 */
class SyncBridge {
    constructor() {
        this.eventBus = new events_1.EventEmitter();
        this.subscribers = new Map();
        this.lastSync = new Date();
    }
    subscribe(sessionId, eventTypes) {
        eventTypes.forEach(eventType => {
            if (!this.subscribers.has(eventType)) {
                this.subscribers.set(eventType, new Set());
            }
            this.subscribers.get(eventType).add(sessionId);
        });
    }
    unsubscribe(sessionId, eventTypes) {
        if (eventTypes) {
            eventTypes.forEach(eventType => {
                this.subscribers.get(eventType)?.delete(sessionId);
            });
        }
        else {
            // Unsubscribe from all events
            this.subscribers.forEach(sessions => sessions.delete(sessionId));
        }
    }
    broadcast(payload) {
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
    onSync(sessionId, callback) {
        this.eventBus.on(`sync:${sessionId}`, callback);
    }
    offSync(sessionId) {
        this.eventBus.removeAllListeners(`sync:${sessionId}`);
    }
    getLastSyncTime() {
        return this.lastSync;
    }
    getSubscribers() {
        const result = {};
        this.subscribers.forEach((sessions, eventType) => {
            result[eventType] = Array.from(sessions);
        });
        return result;
    }
}
exports.SyncBridge = SyncBridge;
/**
 * Activity Logger
 * Tracks all operations from both GUI and CLI interfaces
 */
class ActivityLogger {
    constructor() {
        this.logs = [];
        this.maxEntries = 10000;
    }
    log(entry) {
        const logEntry = {
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
    getLogs(filters) {
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
                filtered = filtered.filter(log => log.timestamp >= filters.since);
            }
            if (filters.limit) {
                filtered = filtered.slice(0, filters.limit);
            }
        }
        return filtered;
    }
    getLogById(id) {
        return this.logs.find(log => log.id === id);
    }
    clearLogs(olderThan) {
        const initialCount = this.logs.length;
        if (olderThan) {
            this.logs = this.logs.filter(log => log.timestamp >= olderThan);
        }
        else {
            this.logs = [];
        }
        return initialCount - this.logs.length;
    }
    getStats() {
        const bySource = { GUI: 0, CLI: 0 };
        const byCommand = {};
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
exports.ActivityLogger = ActivityLogger;
/**
 * Conflict Resolver
 * Handles conflicts when GUI and CLI operations interfere
 */
class ConflictResolver {
    constructor() {
        this.conflicts = [];
        this.resolutionStrategies = new Map();
    }
    registerResolutionStrategy(conflictType, resolver) {
        this.resolutionStrategies.set(conflictType, resolver);
    }
    async detectConflict(commandA, commandB) {
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
    async resolveConflict(conflict) {
        const resolver = this.resolutionStrategies.get(conflict.conflictType);
        if (resolver) {
            try {
                const resolved = await resolver(conflict);
                conflict.autoResolved = resolved;
                if (resolved) {
                    conflict.resolution = `Auto-resolved using ${conflict.conflictType} strategy`;
                }
                return resolved;
            }
            catch (error) {
                conflict.resolution = `Auto-resolution failed: ${error instanceof Error ? error.message : error}`;
                return false;
            }
        }
        return false;
    }
    getConflicts(filters) {
        let filtered = [...this.conflicts];
        if (filters) {
            if (filters.resolved !== undefined) {
                filtered = filtered.filter(c => c.autoResolved === filters.resolved);
            }
            if (filters.severity) {
                filtered = filtered.filter(c => c.severity === filters.severity);
            }
            if (filters.since) {
                filtered = filtered.filter(c => c.timestamp >= filters.since);
            }
        }
        return filtered;
    }
    createConflict(commandA, commandB, type, severity) {
        const conflict = {
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
    isResourceConflict(commandA, commandB) {
        // Check if commands target the same resource
        const resourceA = commandA.params.agentId || commandA.params.projectId;
        const resourceB = commandB.params.agentId || commandB.params.projectId;
        return resourceA && resourceB && resourceA === resourceB &&
            Math.abs(commandA.timestamp.getTime() - commandB.timestamp.getTime()) < 5000; // 5 second window
    }
    isStateConflict(commandA, commandB) {
        // Check for incompatible operations
        const incompatiblePairs = [
            ['start-agent', 'delete-agent'],
            ['create-agent', 'delete-agent'],
            ['stop-agent', 'start-agent']
        ];
        return incompatiblePairs.some(([opA, opB]) => (commandA.command === opA && commandB.command === opB) ||
            (commandA.command === opB && commandB.command === opA));
    }
    isConcurrentConflict(commandA, commandB) {
        // Check for rapid concurrent operations from different sources
        return commandA.source !== commandB.source &&
            Math.abs(commandA.timestamp.getTime() - commandB.timestamp.getTime()) < 1000; // 1 second window
    }
}
exports.ConflictResolver = ConflictResolver;
/**
 * Unified Core Manager
 * Main orchestrator for GUI-CLI integration
 */
class CoreManager {
    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.syncBridge = new SyncBridge();
        this.activityLogger = new ActivityLogger();
        this.conflictResolver = new ConflictResolver();
        this.setupEventHandlers();
        this.setupDefaultResolutionStrategies();
    }
    static getInstance() {
        if (!CoreManager.instance) {
            CoreManager.instance = new CoreManager();
        }
        return CoreManager.instance;
    }
    async executeCommand(commandName, options) {
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
    setupEventHandlers() {
        // Listen for command execution to detect conflicts
        this.commandRegistry.on('command.executed', async (event) => {
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
    setupDefaultResolutionStrategies() {
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
            }
            else if (commandBIsSafe && !commandAIsSafe) {
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
exports.CoreManager = CoreManager;
// Export singleton instance
exports.coreManager = CoreManager.getInstance();
//# sourceMappingURL=index.js.map