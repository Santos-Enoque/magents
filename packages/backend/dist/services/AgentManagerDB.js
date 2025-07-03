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
        this.db = shared_1.UnifiedDatabaseService.getInstance();
        // Use DockerAgentManager as it's the new default
        this.cliAgentManager = new cli_1.DockerAgentManager();
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
        // Get agents from database
        const dbAgents = await this.db.agentRepo.findAll();
        // Get running agents from CLI to sync status
        const cliAgents = this.cliAgentManager.getActiveAgents();
        const cliAgentIds = new Set(cliAgents.map(a => a.id));
        // Update status based on CLI state
        for (const dbAgent of dbAgents) {
            const isRunning = cliAgentIds.has(dbAgent.id);
            const currentStatus = isRunning ? 'RUNNING' : 'STOPPED';
            if (dbAgent.status !== currentStatus) {
                await this.db.agentRepo.update(dbAgent.id, {
                    status: currentStatus,
                    updatedAt: new Date()
                });
            }
        }
        // Refresh from database after status sync
        const updatedAgents = await this.db.agentRepo.findAll();
        return updatedAgents.map(this.convertToAgent);
    }
    async getAgent(id) {
        await this.ensureInitialized();
        const agent = await this.db.agentRepo.findById(id);
        if (!agent) {
            return null;
        }
        // Check CLI status
        const cliAgents = this.cliAgentManager.getActiveAgents();
        const isRunning = cliAgents.some(a => a.id === id);
        const currentStatus = isRunning ? 'RUNNING' : 'STOPPED';
        if (agent.status !== currentStatus) {
            await this.db.agentRepo.update(id, {
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
                mode: 'DOCKER', // Docker is the default
                projectId: options.projectId,
                dockerContainer: result.data.agentId, // Container name is same as agent ID
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    tmuxSession: result.data.tmuxSession,
                    autoAccept: options.autoAccept,
                    environment: options.environment,
                    context: options.context
                }
            };
            await this.db.agentRepo.create(agentData);
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
                await this.db.agentRepo.update(id, {
                    status: 'STOPPED',
                    updatedAt: new Date()
                });
                // If removing worktree, delete from database
                if (removeWorktree) {
                    await this.db.agentRepo.delete(id);
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
        const agent = await this.db.agentRepo.findById(id);
        if (!agent) {
            return null;
        }
        await this.db.agentRepo.update(id, {
            status: status,
            updatedAt: new Date()
        });
        agent.status = status;
        return this.convertToAgent(agent);
    }
    async updateAgentConfig(id, config) {
        await this.ensureInitialized();
        const agent = await this.db.agentRepo.findById(id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        await this.db.agentRepo.update(id, {
            metadata: {
                ...agent.metadata,
                config
            },
            updatedAt: new Date()
        });
    }
    async assignAgentToProject(agentId, projectId) {
        await this.ensureInitialized();
        const agent = await this.db.agentRepo.findById(agentId);
        if (!agent) {
            throw new Error(`Agent with id ${agentId} not found`);
        }
        await this.db.agentRepo.update(agentId, {
            projectId,
            updatedAt: new Date()
        });
        agent.projectId = projectId;
        return this.convertToAgent(agent);
    }
    async unassignAgentFromProject(agentId) {
        await this.ensureInitialized();
        const agent = await this.db.agentRepo.findById(agentId);
        if (!agent) {
            throw new Error(`Agent with id ${agentId} not found`);
        }
        await this.db.agentRepo.update(agentId, {
            projectId: undefined,
            updatedAt: new Date()
        });
        agent.projectId = undefined;
        return this.convertToAgent(agent);
    }
    async getAgentsByProject(projectId) {
        await this.ensureInitialized();
        const agents = await this.db.agentRepo.findByProject(projectId);
        // Sync status with CLI
        const cliAgents = this.cliAgentManager.getActiveAgents();
        const cliAgentIds = new Set(cliAgents.map(a => a.id));
        for (const agent of agents) {
            const isRunning = cliAgentIds.has(agent.id);
            const currentStatus = isRunning ? 'RUNNING' : 'STOPPED';
            if (agent.status !== currentStatus) {
                await this.db.agentRepo.update(agent.id, {
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
            const existingAgent = await this.db.agentRepo.findById(cliAgent.id);
            if (!existingAgent) {
                // Create agent in database
                const agentData = {
                    id: cliAgent.id,
                    name: `Agent ${cliAgent.branch}`,
                    branch: cliAgent.branch,
                    worktreePath: cliAgent.worktreePath,
                    status: cliAgent.status,
                    mode: 'DOCKER',
                    projectId: cliAgent.projectId,
                    dockerContainer: cliAgent.id,
                    createdAt: cliAgent.createdAt,
                    updatedAt: cliAgent.updatedAt || cliAgent.createdAt,
                    metadata: {
                        tmuxSession: cliAgent.tmuxSession,
                        autoAccept: cliAgent.autoAccept,
                        useDocker: cliAgent.useDocker,
                        config: cliAgent.config
                    }
                };
                await this.db.agentRepo.create(agentData);
            }
            else {
                // Update existing agent
                await this.db.agentRepo.update(cliAgent.id, {
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
                const project = await db.projectRepo.findById(options.projectId);
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
                        mode: 'DOCKER',
                        projectId: options.projectId,
                        dockerContainer: result.data.agentId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        metadata: {
                            tmuxSession: result.data.tmuxSession,
                            autoAccept: options.autoAccept,
                            environment: options.environment,
                            context: options.context
                        }
                    };
                    await db.agentRepo.create(agentData);
                    // Update project's updatedAt timestamp
                    await db.projectRepo.update(options.projectId, {
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
                const agent = await db.agentRepo.findById(agentId);
                if (!agent) {
                    throw new Error(`Agent with id ${agentId} not found`);
                }
                // Stop agent using CLI
                const result = await this.cliAgentManager.stopAgent(agentId, true);
                if (!result.success) {
                    throw new Error(result.message || 'Failed to stop agent');
                }
                // Remove from database
                await db.agentRepo.delete(agentId);
                // Update project's updatedAt if agent was associated with a project
                if (agent.projectId) {
                    await db.projectRepo.update(agent.projectId, {
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
}
exports.AgentManagerDB = AgentManagerDB;
//# sourceMappingURL=AgentManagerDB.js.map