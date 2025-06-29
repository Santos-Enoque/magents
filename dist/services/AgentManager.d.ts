import { Agent, CreateAgentOptions, CommandResult, CreateAgentResult, CleanupResult } from '../types';
export declare class AgentManager {
    private configManager;
    private gitService;
    private tmuxService;
    constructor();
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getActiveAgents(): Agent[];
    attachToAgent(agentId: string): Promise<CommandResult>;
    stopAgent(agentId: string, removeWorktree?: boolean): Promise<CommandResult>;
    cleanupAllAgents(removeWorktrees?: boolean): Promise<CommandResult<CleanupResult>>;
    private agentExists;
    private removeAgentRecord;
    private copyClaudeConfiguration;
    private generateAgentContextHeader;
}
//# sourceMappingURL=AgentManager.d.ts.map