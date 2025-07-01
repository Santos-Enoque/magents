"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentController = void 0;
const cli_1 = require("@magents/cli");
// Initialize the AgentManager to connect to CLI storage
const agentManager = new cli_1.AgentManager();
exports.agentController = {
    async listAgents(options) {
        const { page, limit, status } = options;
        // Get agents from CLI storage
        let allAgents = agentManager.getActiveAgents();
        // Filter by status if provided
        if (status) {
            allAgents = allAgents.filter(agent => agent.status === status);
        }
        const total = allAgents.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedAgents = allAgents.slice(offset, offset + limit);
        return {
            agents: paginatedAgents,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    },
    async getAgent(id) {
        const allAgents = agentManager.getActiveAgents();
        const agent = allAgents.find(a => a.id === id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        return agent;
    },
    async createAgent(options) {
        // Use CLI AgentManager to create agent
        const result = await agentManager.createAgent(options);
        if (!result.success) {
            throw new Error(result.message || 'Failed to create agent');
        }
        // Return the created agent data
        const agent = result.data;
        if (!agent) {
            throw new Error('Agent created but no data returned');
        }
        return {
            id: agent.agentId,
            branch: agent.branch,
            worktreePath: agent.worktreePath,
            tmuxSession: agent.tmuxSession,
            status: 'RUNNING',
            createdAt: new Date()
        };
    },
    async updateAgentStatus(id, status) {
        // For status updates, we need to implement this in CLI AgentManager
        // For now, we'll just return the agent with updated status from memory
        const agent = await this.getAgent(id);
        // Note: This doesn't persist the status change to the CLI storage
        // In a complete implementation, AgentManager would need status update methods
        return {
            ...agent,
            status,
            updatedAt: new Date()
        };
    },
    async deleteAgent(id, removeWorktree = false) {
        // Use CLI AgentManager to stop and remove agent
        const result = await agentManager.stopAgent(id, removeWorktree);
        if (!result.success) {
            throw new Error(result.message || 'Failed to delete agent');
        }
    },
    async updateAgentConfig(id, config) {
        // Get the agent first to ensure it exists
        const agent = await this.getAgent(id);
        // Note: In a complete implementation, this would persist the config
        // to the CLI storage. For now, we're storing in memory only.
        // The AgentManager would need to be extended to support config updates.
        // Store config in agent object (this is temporary, would need proper storage)
        agent.config = config;
        // TODO: Implement proper config persistence in AgentManager
        console.log(`Updated config for agent ${id}:`, config);
    }
};
//# sourceMappingURL=agentController.js.map