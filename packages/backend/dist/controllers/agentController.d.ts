import { Agent, CreateAgentOptions, AgentStatus } from '@magents/shared';
export declare const agentController: {
    listAgents(options: {
        page: number;
        limit: number;
        status?: string;
    }): Promise<{
        agents: Agent[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAgent(id: string): Promise<Agent>;
    createAgent(options: CreateAgentOptions): Promise<Agent>;
    updateAgentStatus(id: string, status: AgentStatus): Promise<Agent>;
    deleteAgent(id: string, removeWorktree?: boolean): Promise<void>;
};
//# sourceMappingURL=agentController.d.ts.map