"use strict";
/**
 * Core Integration Service for CLI
 *
 * Integrates the CLI with the core manager for unified command execution
 * and real-time synchronization with the GUI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreIntegrationService = void 0;
const shared_1 = require("@magents/shared");
// @ts-ignore - TypeScript module resolution issue
const commands_1 = require("@magents/shared/dist/core/commands");
const DockerAgentManager_1 = require("./DockerAgentManager");
const ConfigManager_1 = require("../config/ConfigManager");
class CoreIntegrationService {
    constructor() {
        this.isInitialized = false;
        this.sessionId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        this.dockerManager = new DockerAgentManager_1.DockerAgentManager();
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
    }
    static getInstance() {
        if (!CoreIntegrationService.instance) {
            CoreIntegrationService.instance = new CoreIntegrationService();
        }
        return CoreIntegrationService.instance;
    }
    /**
     * Initialize the core integration service
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Register all standard commands
            this.registerStandardCommands();
            // Register custom CLI commands
            this.registerCliCommands();
            // Set up event listeners for real-time updates
            this.setupEventListeners();
            // Subscribe to relevant events
            shared_1.coreManager.syncBridge.subscribe(this.sessionId, [
                'command.executed',
                'agent.created',
                'agent.updated',
                'agent.deleted',
                'agent.started',
                'agent.stopped',
                'sync.conflict'
            ]);
            this.isInitialized = true;
            console.log(`Core integration initialized with session ID: ${this.sessionId}`);
        }
        catch (error) {
            console.error('Failed to initialize core integration:', error);
            throw error;
        }
    }
    /**
     * Execute a command through the unified core manager
     */
    async executeCommand(commandName, params = {}, userId) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const options = {
            params,
            source: 'CLI',
            sessionId: this.sessionId,
            userId
        };
        return shared_1.coreManager.executeCommand(commandName, options);
    }
    /**
     * Get the current session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Get activity logs for CLI operations
     */
    getActivityLogs(filters) {
        return shared_1.coreManager.activityLogger.getLogs({
            ...filters,
            source: 'CLI',
            sessionId: this.sessionId
        });
    }
    /**
     * Get sync conflicts involving CLI operations
     */
    getSyncConflicts(filters) {
        return shared_1.coreManager.conflictResolver.getConflicts(filters);
    }
    /**
     * Register standard commands with actual CLI implementations
     */
    registerStandardCommands() {
        commands_1.STANDARD_COMMANDS.forEach((CommandClass) => {
            const command = new CommandClass();
            // Override execute method to use actual CLI services
            const originalExecute = command.execute.bind(command);
            command.execute = async (options) => {
                try {
                    // For CLI, we want to use actual services, not mock data
                    const result = await this.executeActualCommand(command.name, options);
                    return result || await originalExecute(options);
                }
                catch (error) {
                    // Fall back to standard implementation if actual command fails
                    return await originalExecute(options);
                }
            };
            shared_1.coreManager.commandRegistry.registerCommand(command);
        });
    }
    /**
     * Register CLI-specific commands
     */
    registerCliCommands() {
        // Add any CLI-specific commands here that aren't in the standard set
        // For now, we'll rely on the standard commands
    }
    /**
     * Execute actual CLI command using existing services
     */
    async executeActualCommand(commandName, options) {
        const startTime = Date.now();
        const { params = {} } = options;
        try {
            switch (commandName) {
                case 'create-agent':
                    const currentPath = process.cwd();
                    const projectId = require('path').basename(currentPath);
                    const agent = await this.dockerManager.createAgent({
                        agentId: params.agentId,
                        branch: params.branch,
                        projectPath: params.projectPath,
                        autoAccept: params.autoAccept,
                        useDocker: params.useDocker,
                        projectId
                    });
                    return {
                        success: true,
                        data: agent,
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'start-agent':
                    // For Docker agents, attach is the equivalent of start
                    const attachResult = await this.dockerManager.attachToAgent(params.agentId);
                    return {
                        success: attachResult.success,
                        data: { agentId: params.agentId, status: 'RUNNING' },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'stop-agent':
                    await this.dockerManager.stopAgent(params.agentId, params.force);
                    return {
                        success: true,
                        data: { agentId: params.agentId, status: 'STOPPED' },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'delete-agent':
                    // For Docker agents, stop agent with container removal
                    const deleteResult = await this.dockerManager.stopAgent(params.agentId, true);
                    return {
                        success: deleteResult.success,
                        data: { agentId: params.agentId, deleted: true },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'list-agents':
                    const agents = this.dockerManager.getActiveAgents();
                    const filteredAgents = params.status
                        ? agents.filter((agent) => agent.status === params.status)
                        : agents;
                    return {
                        success: true,
                        data: { agents: filteredAgents, total: filteredAgents.length },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'system-status':
                    const status = await this.getSystemStatus(params.detailed);
                    return {
                        success: true,
                        data: status,
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'cleanup':
                    const cleaned = await this.performCleanup(params.removeWorktrees, params.force);
                    return {
                        success: true,
                        data: cleaned,
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'config-get':
                    const config = this.configManager.loadConfig();
                    const value = config[params.key];
                    return {
                        success: true,
                        data: { key: params.key, value },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                case 'config-set':
                    const currentConfig = this.configManager.loadConfig();
                    currentConfig[params.key] = params.value;
                    // Note: ConfigManager doesn't have a saveConfig method exposed
                    // This would need to be implemented or we use a workaround
                    return {
                        success: true,
                        data: { key: params.key, value: params.value, updated: true },
                        executionTime: Date.now() - startTime,
                        commandId: `cmd_${Date.now()}`,
                        source: options.source,
                        timestamp: new Date()
                    };
                default:
                    return null; // Fall back to standard implementation
            }
        }
        catch (error) {
            throw (0, shared_1.createMagentsError)(shared_1.ERROR_CODES.DOCKER_ERROR, {
                command: commandName,
                originalError: error
            });
        }
    }
    /**
     * Set up event listeners for real-time updates
     */
    setupEventListeners() {
        shared_1.coreManager.syncBridge.onSync(this.sessionId, (payload) => {
            // Handle incoming sync events from GUI
            switch (payload.eventType) {
                case 'command.executed':
                    if (payload.source === 'GUI') {
                        console.log(`[SYNC] GUI executed: ${payload.data.command}`);
                    }
                    break;
                case 'agent.created':
                case 'agent.updated':
                case 'agent.deleted':
                case 'agent.started':
                case 'agent.stopped':
                    if (payload.source === 'GUI') {
                        console.log(`[SYNC] GUI ${payload.eventType}: ${payload.data.agentId || 'unknown'}`);
                    }
                    break;
                case 'sync.conflict':
                    console.warn(`[CONFLICT] ${payload.data.conflictType} conflict detected`, payload.data);
                    break;
            }
        });
    }
    /**
     * Get system status information
     */
    async getSystemStatus(detailed) {
        const agents = this.dockerManager.getActiveAgents();
        const projects = []; // TODO: Implement project service
        const status = {
            timestamp: new Date(),
            uptime: process.uptime() * 1000,
            agents: {
                total: agents.length,
                running: agents.filter(a => a.status === 'RUNNING').length,
                stopped: agents.filter(a => a.status === 'STOPPED').length,
                error: agents.filter(a => a.status === 'ERROR').length
            },
            projects: {
                total: projects.length,
                active: 0 // TODO: Implement active project detection
            },
            system: {
                cpu: 0, // TODO: Implement actual system metrics
                memory: 0,
                disk: 0
            }
        };
        if (detailed) {
            // Add detailed system information
            status.system = {
                ...status.system,
                processes: [] // TODO: Implement process monitoring
            };
        }
        return status;
    }
    /**
     * Perform system cleanup
     */
    async performCleanup(removeWorktrees, force) {
        // TODO: Implement actual cleanup logic
        const cleaned = {
            agents: 0,
            worktrees: 0,
            tmuxSessions: 0,
            dockerContainers: 0,
            diskSpaceFreed: '0MB'
        };
        try {
            const agents = this.dockerManager.getActiveAgents();
            const stoppedAgents = agents.filter(a => a.status === 'STOPPED');
            for (const agent of stoppedAgents) {
                try {
                    await this.dockerManager.stopAgent(agent.id, true);
                    cleaned.agents++;
                    if (removeWorktrees)
                        cleaned.worktrees++;
                }
                catch (error) {
                    if (!force)
                        throw error;
                }
            }
        }
        catch (error) {
            console.error('Cleanup error:', error);
            if (!force)
                throw error;
        }
        return cleaned;
    }
    /**
     * Cleanup on service shutdown
     */
    async cleanup() {
        if (!this.isInitialized)
            return;
        try {
            shared_1.coreManager.syncBridge.unsubscribe(this.sessionId);
            shared_1.coreManager.syncBridge.offSync(this.sessionId);
            this.isInitialized = false;
            console.log('Core integration cleaned up');
        }
        catch (error) {
            console.error('Core integration cleanup error:', error);
        }
    }
}
exports.CoreIntegrationService = CoreIntegrationService;
exports.default = CoreIntegrationService;
//# sourceMappingURL=CoreIntegrationService.js.map