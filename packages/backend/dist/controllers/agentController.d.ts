import { Agent, CreateAgentOptions, AgentStatus } from '@magents/shared';
export declare const agentController: {
    listAgents(options: {
        page: number;
        limit: number;
        status?: string;
    }): Promise<{
        agents: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    getAgent(id: string): Promise<Agent>;
    createAgent(options: CreateAgentOptions): Promise<Agent>;
    updateAgentStatus(id: string, status: AgentStatus): Promise<Agent>;
    deleteAgent(id: string, removeWorktree?: boolean): Promise<void>;
    updateAgentConfig(id: string, config: Record<string, unknown>): Promise<void>;
    assignAgentToProject(agentId: string, projectId: string): Promise<Agent>;
    unassignAgentFromProject(agentId: string): Promise<Agent>;
    getAgentsByProject(projectId: string): Promise<Agent[]>;
    assignTaskToAgent(agentId: string, taskId: string): Promise<Agent>;
};
//# sourceMappingURL=agentController.d.ts.map