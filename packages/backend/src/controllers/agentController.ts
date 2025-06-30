import { Agent, CreateAgentOptions, AgentStatus, generateAgentId } from '@magents/shared';

// In a real implementation, this would use a database or file storage
// For now, we'll use in-memory storage for scaffolding
let agents: Agent[] = [];

export const agentController = {
  async listAgents(options: { page: number; limit: number; status?: string }) {
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

  async getAgent(id: string): Promise<Agent> {
    const agent = agents.find(a => a.id === id);
    if (!agent) {
      throw new Error(`Agent with id ${id} not found`);
    }
    return agent;
  },

  async createAgent(options: CreateAgentOptions): Promise<Agent> {
    const agentId = options.agentId || generateAgentId(options.branch);
    
    // Check if agent already exists
    const existingAgent = agents.find(a => a.id === agentId);
    if (existingAgent) {
      throw new Error(`Agent with id ${agentId} already exists`);
    }
    
    const agent: Agent = {
      id: agentId,
      branch: options.branch,
      worktreePath: `/tmp/magents/${agentId}`, // This would be properly computed
      tmuxSession: `magent-${agentId}`,
      status: 'STOPPED' as AgentStatus,
      createdAt: new Date()
    };
    
    agents.push(agent);
    return agent;
  },

  async updateAgentStatus(id: string, status: AgentStatus): Promise<Agent> {
    const agent = await this.getAgent(id);
    agent.status = status;
    return agent;
  },

  async deleteAgent(id: string, removeWorktree: boolean = false): Promise<void> {
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