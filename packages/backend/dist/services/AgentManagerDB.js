"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManagerDB = void 0;
const shared_1 = require("@magents/shared");
const cli_1 = require("@magents/cli");
/**
 * Database-backed implementation of AgentManager
 * This wraps the CLI AgentManager while storing agent data in SQLite
 */
class AgentManagerDB {
    constructor() {
        this.initialized = false;
        this.db = new shared_1.UnifiedDatabaseService();
        // Use AgentManager
        this.cliAgentManager = new cli_1.AgentManager();
    }
    static getInstance() {
        if (!AgentManagerDB.instance) {
            AgentManagerDB.instance = new AgentManagerDB();
        }
        return AgentManagerDB.instance;
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.db.initialize();
            this.initialized = true;
        }
    }
    async getActiveAgents() {
        await this.ensureInitialized();
        // Get all agents from CLI
        const cliAgents = this.cliAgentManager.getActiveAgents();
        // For now, just return all CLI agents directly
        // This bypasses the database sync issues while still showing all agents
        return cliAgents.map(agent => ({
            ...agent,
            projectId: agent.projectId || 'cli-agents-default'
        }));
    }
    async getAgent(id) {
        await this.ensureInitialized();
        const agent = await this.db.agents.findById(id);
        if (!agent) {
            return null;
        }
        // Check CLI status
        const cliAgents = this.cliAgentManager.getActiveAgents();
        const isRunning = cliAgents.some(a => a.id === id);
        const currentStatus = isRunning ? 'RUNNING' : 'STOPPED';
        if (agent.status !== currentStatus) {
            await this.db.agents.update(id, {
                status: currentStatus,
                updatedAt: new Date()
            });
            agent.status = currentStatus;
        }
        return this.convertToAgent(agent);
    }
    async createAgent(options) {
        await this.ensureInitialized();
        try {
            // Create agent using CLI
            const result = await this.cliAgentManager.createAgent(options);
            if (!result.success || !result.data) {
                return result;
            }
            // Store in database
            const agentData = {
                id: result.data.agentId,
                name: `Agent ${result.data.branch}`,
                branch: result.data.branch,
                worktreePath: result.data.worktreePath,
                status: 'RUNNING',
                mode: 'docker', // Docker is the default
                projectId: options.projectId,
                dockerContainer: result.data.agentId, // Container name is same as agent ID
                dockerPorts: [],
                dockerVolumes: [],
                autoAccept: options.autoAccept || false,
                environmentVars: {},
                assignedTasks: [],
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    tmuxSession: result.data.tmuxSession,
                    autoAccept: options.autoAccept,
                    environment: options.environment,
                    context: options.context
                }
            };
            await this.db.agents.create(agentData);
            return result;
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create agent'
            };
        }
    }
    async stopAgent(id, removeWorktree = false) {
        await this.ensureInitialized();
        try {
            // Stop agent using CLI
            const result = await this.cliAgentManager.stopAgent(id, removeWorktree);
            if (result.success) {
                // Update status in database
                await this.db.agents.update(id, {
                    status: 'STOPPED',
                    updatedAt: new Date()
                });
                // If removing worktree, delete from database
                if (removeWorktree) {
                    await this.db.agents.delete(id);
                }
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to stop agent'
            };
        }
    }
    async updateAgentStatus(id, status) {
        await this.ensureInitialized();
        const agent = await this.db.agents.findById(id);
        if (!agent) {
            return null;
        }
        await this.db.agents.update(id, {
            status: status,
            updatedAt: new Date()
        });
        agent.status = status;
        return this.convertToAgent(agent);
    }
    async updateAgentConfig(id, config) {
        await this.ensureInitialized();
        const agent = await this.db.agents.findById(id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        await this.db.agents.update(id, {
            metadata: {
                ...agent.metadata,
                config
            },
            updatedAt: new Date()
        });
    }
    async assignAgentToProject(agentId, projectId) {
        await this.ensureInitialized();
        const agent = await this.db.agents.findById(agentId);
        if (!agent) {
            throw new Error(`Agent with id ${agentId} not found`);
        }
        await this.db.agents.update(agentId, {
            projectId,
            updatedAt: new Date()
        });
        agent.projectId = projectId;
        return this.convertToAgent(agent);
    }
    async unassignAgentFromProject(agentId) {
        await this.ensureInitialized();
        // TODO: Since projectId is required, we need to decide how to handle unassignment
        // Options: 1) Use a default project, 2) Delete the agent, 3) Mark as inactive
        throw new Error('Unassigning agents from projects is not currently supported as projectId is required');
    }
    async getAgentsByProject(projectId) {
        await this.ensureInitialized();
        const agents = await this.db.agents.findByProject(projectId);
        // Sync status with CLI
        const cliAgents = this.cliAgentManager.getActiveAgents();
        const cliAgentIds = new Set(cliAgents.map(a => a.id));
        for (const agent of agents) {
            const isRunning = cliAgentIds.has(agent.id);
            const currentStatus = isRunning ? 'RUNNING' : 'STOPPED';
            if (agent.status !== currentStatus) {
                await this.db.agents.update(agent.id, {
                    status: currentStatus,
                    updatedAt: new Date()
                });
                agent.status = currentStatus;
            }
        }
        return agents.map(this.convertToAgent);
    }
    /**
     * Sync agents from CLI to database (for migration purposes)
     */
    async syncFromCLI() {
        await this.ensureInitialized();
        const cliAgents = this.cliAgentManager.getActiveAgents();
        for (const cliAgent of cliAgents) {
            const existingAgent = await this.db.agents.findById(cliAgent.id);
            if (!existingAgent) {
                // Create agent in database
                const agentData = {
                    id: cliAgent.id,
                    name: `Agent ${cliAgent.branch}`,
                    branch: cliAgent.branch,
                    worktreePath: cliAgent.worktreePath,
                    status: cliAgent.status,
                    mode: 'docker',
                    projectId: cliAgent.projectId,
                    dockerContainer: cliAgent.id,
                    dockerPorts: [],
                    dockerVolumes: [],
                    autoAccept: cliAgent.autoAccept || false,
                    environmentVars: {},
                    assignedTasks: [],
                    tags: [],
                    createdAt: cliAgent.createdAt,
                    updatedAt: cliAgent.updatedAt || cliAgent.createdAt,
                    metadata: {
                        tmuxSession: cliAgent.tmuxSession,
                        autoAccept: cliAgent.autoAccept,
                        useDocker: cliAgent.useDocker,
                        config: cliAgent.config
                    }
                };
                await this.db.agents.create(agentData);
            }
            else {
                // Update existing agent
                await this.db.agents.update(cliAgent.id, {
                    status: cliAgent.status,
                    projectId: cliAgent.projectId,
                    updatedAt: new Date()
                });
            }
        }
    }
    /**
     * Convert UnifiedAgentData to Agent format for backward compatibility
     */
    convertToAgent(data) {
        const agent = {
            id: data.id,
            branch: data.branch,
            worktreePath: data.worktreePath,
            tmuxSession: data.metadata?.tmuxSession || `docker-${data.id}`,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            projectId: data.projectId
        };
        // Add optional fields from metadata
        if (data.metadata?.autoAccept !== undefined) {
            agent.autoAccept = data.metadata.autoAccept;
        }
        if (data.metadata?.useDocker !== undefined) {
            agent.useDocker = data.metadata.useDocker;
        }
        else {
            agent.useDocker = true; // Docker is default
        }
        if (data.metadata?.config) {
            agent.config = data.metadata.config;
        }
        return agent;
    }
    /**
     * Create agent and associate with project in a transaction
     */
    async createAgentWithProject(options) {
        await this.ensureInitialized();
        try {
            return await this.db.transaction(async (db) => {
                // Verify project exists
                const project = await db.projects.findById(options.projectId);
                if (!project) {
                    throw new Error(`Project with id ${options.projectId} not found`);
                }
                // Create agent using CLI
                const result = await this.cliAgentManager.createAgent(options);
                if (!result.success || !result.data) {
                    throw new Error(result.message || 'Failed to create agent');
                }
                try {
                    // Store in database
                    const agentData = {
                        id: result.data.agentId,
                        name: `Agent ${result.data.branch}`,
                        branch: result.data.branch,
                        worktreePath: result.data.worktreePath,
                        status: 'RUNNING',
                        mode: 'docker',
                        projectId: options.projectId,
                        dockerContainer: result.data.agentId,
                        dockerPorts: [],
                        dockerVolumes: [],
                        autoAccept: options.autoAccept || false,
                        environmentVars: {},
                        assignedTasks: [],
                        tags: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        metadata: {
                            tmuxSession: result.data.tmuxSession,
                            autoAccept: options.autoAccept,
                            environment: options.environment,
                            context: options.context
                        }
                    };
                    await db.agents.create(agentData);
                    // Update project's updatedAt timestamp
                    await db.projects.update(options.projectId, {
                        updatedAt: new Date()
                    });
                    return result;
                }
                catch (dbError) {
                    // If database operations fail, clean up the CLI agent
                    await this.cliAgentManager.stopAgent(result.data.agentId, true);
                    throw dbError;
                }
            });
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create agent with project'
            };
        }
    }
    /**
     * Delete agent and update project in a transaction
     */
    async deleteAgentFromProject(agentId) {
        await this.ensureInitialized();
        try {
            return await this.db.transaction(async (db) => {
                // Get agent to find project
                const agent = await db.agents.findById(agentId);
                if (!agent) {
                    throw new Error(`Agent with id ${agentId} not found`);
                }
                // Stop agent using CLI
                const result = await this.cliAgentManager.stopAgent(agentId, true);
                if (!result.success) {
                    throw new Error(result.message || 'Failed to stop agent');
                }
                // Remove from database
                await db.agents.delete(agentId);
                // Update project's updatedAt if agent was associated with a project
                if (agent.projectId) {
                    await db.projects.update(agent.projectId, {
                        updatedAt: new Date()
                    });
                }
                return { success: true, message: 'Agent deleted successfully' };
            });
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete agent'
            };
        }
    }
    /**
     * Get or create a default project for CLI agents
     */
    async getOrCreateDefaultProject() {
        const defaultProjectId = 'cli-agents-default';
        // Check if default project exists
        const existingProject = await this.db.projects.findById(defaultProjectId);
        if (existingProject) {
            return defaultProjectId;
        }
        // Create default project for CLI agents
        try {
            await this.db.projects.create({
                id: defaultProjectId,
                name: 'CLI Agents',
                description: 'Default project for agents created via CLI',
                path: process.cwd(),
                status: 'ACTIVE',
                agentIds: [],
                gitRepository: {
                    branch: 'main',
                    isClean: true
                },
                portRange: { start: 8000, end: 8999 },
                taskMasterConfig: {
                    initialized: false
                },
                projectType: {
                    type: 'unknown',
                    frameworks: [],
                    detectedAt: new Date()
                },
                taskMasterEnabled: false,
                maxAgents: 10,
                dockerNetwork: 'magents-default',
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    isDefault: true,
                    createdBy: 'system'
                }
            });
            return defaultProjectId;
        }
        catch (error) {
            console.warn('Failed to create default project, using hardcoded ID:', error);
            return defaultProjectId;
        }
    }
}
exports.AgentManagerDB = AgentManagerDB;
//# sourceMappingURL=AgentManagerDB.js.map