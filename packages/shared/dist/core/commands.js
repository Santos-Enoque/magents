"use strict";
/**
 * Standard Command Implementations for GUI-CLI Integration
 *
 * Provides concrete implementations of common commands that can be
 * executed from both GUI and CLI interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STANDARD_COMMANDS = exports.ConfigSetCommand = exports.ConfigGetCommand = exports.CleanupCommand = exports.SystemStatusCommand = exports.ListProjectsCommand = exports.CreateProjectCommand = exports.ListAgentsCommand = exports.DeleteAgentCommand = exports.StopAgentCommand = exports.StartAgentCommand = exports.CreateAgentCommand = void 0;
const errors_1 = require("../errors");
const constants_1 = require("../constants");
/**
 * Agent Management Commands
 */
class CreateAgentCommand {
    constructor() {
        this.name = 'create-agent';
        this.description = 'Create a new agent with specified configuration';
        this.category = 'agent';
        this.requiredParams = ['agentId', 'branch'];
        this.optionalParams = ['projectPath', 'autoAccept', 'useDocker'];
    }
    async execute(options) {
        const { agentId, branch, projectPath, autoAccept, useDocker } = options.params || {};
        try {
            // Simulate agent creation logic
            // In real implementation, this would call the actual agent manager
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async operation
            const agent = {
                id: agentId,
                branch,
                projectPath: projectPath || process.cwd(),
                autoAccept: autoAccept || false,
                useDocker: useDocker || false,
                status: 'STOPPED',
                createdAt: new Date(),
                worktreePath: `/tmp/agents/${agentId}`,
                tmuxSession: `magents-${agentId}`
            };
            return {
                success: true,
                data: agent,
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.AGENT_ALREADY_EXISTS, {
                agentId,
                originalError: error
            });
        }
    }
}
exports.CreateAgentCommand = CreateAgentCommand;
class StartAgentCommand {
    constructor() {
        this.name = 'start-agent';
        this.description = 'Start an existing agent';
        this.category = 'agent';
        this.requiredParams = ['agentId'];
        this.optionalParams = [];
    }
    async execute(options) {
        const { agentId } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
                success: true,
                data: { agentId, status: 'RUNNING', startedAt: new Date() },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.AGENT_NOT_FOUND, {
                agentId,
                originalError: error
            });
        }
    }
}
exports.StartAgentCommand = StartAgentCommand;
class StopAgentCommand {
    constructor() {
        this.name = 'stop-agent';
        this.description = 'Stop a running agent';
        this.category = 'agent';
        this.requiredParams = ['agentId'];
        this.optionalParams = ['force'];
    }
    async execute(options) {
        const { agentId, force } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {
                success: true,
                data: { agentId, status: 'STOPPED', stoppedAt: new Date(), forced: force || false },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.AGENT_NOT_FOUND, {
                agentId,
                originalError: error
            });
        }
    }
}
exports.StopAgentCommand = StopAgentCommand;
class DeleteAgentCommand {
    constructor() {
        this.name = 'delete-agent';
        this.description = 'Delete an agent and optionally remove its worktree';
        this.category = 'agent';
        this.requiredParams = ['agentId'];
        this.optionalParams = ['removeWorktree'];
    }
    async execute(options) {
        const { agentId, removeWorktree } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 400));
            return {
                success: true,
                data: {
                    agentId,
                    deleted: true,
                    worktreeRemoved: removeWorktree || false,
                    deletedAt: new Date()
                },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.AGENT_NOT_FOUND, {
                agentId,
                originalError: error
            });
        }
    }
}
exports.DeleteAgentCommand = DeleteAgentCommand;
class ListAgentsCommand {
    constructor() {
        this.name = 'list-agents';
        this.description = 'List all agents with their current status';
        this.category = 'agent';
        this.requiredParams = [];
        this.optionalParams = ['status', 'project'];
    }
    async execute(options) {
        const { status, project } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            // Mock agent data
            const agents = [
                {
                    id: 'agent-1',
                    branch: 'feature/auth',
                    status: 'RUNNING',
                    project: 'ecommerce-app',
                    createdAt: new Date(Date.now() - 3600000),
                    lastActivity: new Date(Date.now() - 300000)
                },
                {
                    id: 'agent-2',
                    branch: 'fix/payment-bug',
                    status: 'STOPPED',
                    project: 'ecommerce-app',
                    createdAt: new Date(Date.now() - 7200000),
                    lastActivity: new Date(Date.now() - 1800000)
                }
            ];
            let filtered = agents;
            if (status) {
                filtered = filtered.filter(agent => agent.status === status);
            }
            if (project) {
                filtered = filtered.filter(agent => agent.project === project);
            }
            return {
                success: true,
                data: { agents: filtered, total: filtered.length },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.DOCKER_ERROR, {
                originalError: error
            });
        }
    }
}
exports.ListAgentsCommand = ListAgentsCommand;
/**
 * Project Management Commands
 */
class CreateProjectCommand {
    constructor() {
        this.name = 'create-project';
        this.description = 'Create a new project configuration';
        this.category = 'project';
        this.requiredParams = ['name', 'path'];
        this.optionalParams = ['description', 'type'];
    }
    async execute(options) {
        const { name, path, description, type } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const project = {
                id: `project-${Date.now()}`,
                name,
                path,
                description: description || '',
                type: type || 'generic',
                createdAt: new Date(),
                agents: []
            };
            return {
                success: true,
                data: project,
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.PROJECT_NOT_FOUND, {
                projectName: name,
                originalError: error
            });
        }
    }
}
exports.CreateProjectCommand = CreateProjectCommand;
class ListProjectsCommand {
    constructor() {
        this.name = 'list-projects';
        this.description = 'List all configured projects';
        this.category = 'project';
        this.requiredParams = [];
        this.optionalParams = ['status'];
    }
    async execute(options) {
        try {
            await new Promise(resolve => setTimeout(resolve, 150));
            const projects = [
                {
                    id: 'project-1',
                    name: 'ecommerce-app',
                    path: '/Users/dev/projects/ecommerce',
                    description: 'Main e-commerce application',
                    type: 'react',
                    agents: ['agent-1', 'agent-2'],
                    createdAt: new Date(Date.now() - 86400000)
                },
                {
                    id: 'project-2',
                    name: 'api-server',
                    path: '/Users/dev/projects/api',
                    description: 'Backend API server',
                    type: 'nodejs',
                    agents: [],
                    createdAt: new Date(Date.now() - 172800000)
                }
            ];
            return {
                success: true,
                data: { projects, total: projects.length },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.DOCKER_ERROR, {
                originalError: error
            });
        }
    }
}
exports.ListProjectsCommand = ListProjectsCommand;
/**
 * System Commands
 */
class SystemStatusCommand {
    constructor() {
        this.name = 'system-status';
        this.description = 'Get current system status and metrics';
        this.category = 'system';
        this.requiredParams = [];
        this.optionalParams = ['detailed'];
    }
    async execute(options) {
        const { detailed } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const status = {
                timestamp: new Date(),
                uptime: 3600000, // 1 hour
                agents: {
                    total: 5,
                    running: 2,
                    stopped: 3,
                    error: 0
                },
                projects: {
                    total: 3,
                    active: 2
                },
                system: {
                    cpu: Math.round(Math.random() * 100),
                    memory: Math.round(Math.random() * 100),
                    disk: Math.round(Math.random() * 100)
                }
            };
            if (detailed) {
                status.system.processes = [
                    { name: 'magents-backend', cpu: 15, memory: 120 },
                    { name: 'magents-web', cpu: 8, memory: 80 }
                ];
            }
            return {
                success: true,
                data: status,
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.DOCKER_ERROR, {
                originalError: error
            });
        }
    }
}
exports.SystemStatusCommand = SystemStatusCommand;
class CleanupCommand {
    constructor() {
        this.name = 'cleanup';
        this.description = 'Clean up stopped agents and orphaned resources';
        this.category = 'system';
        this.requiredParams = [];
        this.optionalParams = ['removeWorktrees', 'force'];
    }
    async execute(options) {
        const { removeWorktrees, force } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Longer operation
            const cleaned = {
                agents: 2,
                worktrees: removeWorktrees ? 2 : 0,
                tmuxSessions: 3,
                dockerContainers: 1,
                diskSpaceFreed: '1.2GB'
            };
            return {
                success: true,
                data: cleaned,
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.DOCKER_ERROR, {
                originalError: error
            });
        }
    }
}
exports.CleanupCommand = CleanupCommand;
/**
 * Configuration Commands
 */
class ConfigGetCommand {
    constructor() {
        this.name = 'config-get';
        this.description = 'Get configuration value';
        this.category = 'config';
        this.requiredParams = ['key'];
        this.optionalParams = [];
    }
    async execute(options) {
        const { key } = options.params || {};
        try {
            // Mock configuration values
            const config = {
                'DOCKER_ENABLED': true,
                'MAX_AGENTS': 10,
                'CLAUDE_AUTO_ACCEPT': false,
                'TMUX_SESSION_PREFIX': 'magents',
                'DEFAULT_BASE_BRANCH': 'main'
            };
            const value = config[key];
            if (value === undefined) {
                throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.INVALID_CONFIG, {
                    key,
                    availableKeys: Object.keys(config)
                });
            }
            return {
                success: true,
                data: { key, value },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ConfigGetCommand = ConfigGetCommand;
class ConfigSetCommand {
    constructor() {
        this.name = 'config-set';
        this.description = 'Set configuration value';
        this.category = 'config';
        this.requiredParams = ['key', 'value'];
        this.optionalParams = [];
    }
    async execute(options) {
        const { key, value } = options.params || {};
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {
                success: true,
                data: { key, value, updated: true },
                executionTime: 0,
                commandId: '',
                source: options.source,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw (0, errors_1.createMagentsError)(constants_1.ERROR_CODES.INVALID_CONFIG, {
                key,
                value,
                originalError: error
            });
        }
    }
}
exports.ConfigSetCommand = ConfigSetCommand;
// Export all command classes
exports.STANDARD_COMMANDS = [
    CreateAgentCommand,
    StartAgentCommand,
    StopAgentCommand,
    DeleteAgentCommand,
    ListAgentsCommand,
    CreateProjectCommand,
    ListProjectsCommand,
    SystemStatusCommand,
    CleanupCommand,
    ConfigGetCommand,
    ConfigSetCommand
];
//# sourceMappingURL=commands.js.map