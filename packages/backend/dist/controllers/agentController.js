"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentController = void 0;
const shared_1 = require("@magents/shared");
// In a real implementation, this would use a database or file storage
// For now, we'll use in-memory storage for scaffolding
let agents = [];
exports.agentController = {
    async listAgents(options) {
        const { page, limit, status } = options;
        let filteredAgents = agents;
        if (status) {
            filteredAgents = agents.filter(agent => agent.status === status);
        }
        const total = filteredAgents.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedAgents = filteredAgents.slice(offset, offset + limit);
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
        const agent = agents.find(a => a.id === id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        return agent;
    },
    async createAgent(options) {
        const agentId = options.agentId || (0, shared_1.generateAgentId)(options.branch);
        // Check if agent already exists
        const existingAgent = agents.find(a => a.id === agentId);
        if (existingAgent) {
            throw new Error(`Agent with id ${agentId} already exists`);
        }
        const agent = {
            id: agentId,
            branch: options.branch,
            worktreePath: `/tmp/magents/${agentId}`, // This would be properly computed
            tmuxSession: `magent-${agentId}`,
            status: 'STOPPED',
            createdAt: new Date()
        };
        agents.push(agent);
        return agent;
    },
    async updateAgentStatus(id, status) {
        const agent = await this.getAgent(id);
        agent.status = status;
        return agent;
    },
    async deleteAgent(id, removeWorktree = false) {
        const agentIndex = agents.findIndex(a => a.id === id);
        if (agentIndex === -1) {
            throw new Error(`Agent with id ${id} not found`);
        }
        // In a real implementation, this would:
        // 1. Stop the tmux session
        // 2. Optionally remove the worktree
        // 3. Clean up any docker containers
        agents.splice(agentIndex, 1);
    }
};
//# sourceMappingURL=agentController.js.map