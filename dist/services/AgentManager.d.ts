import { Agent, CreateAgentOptions, CommandResult, CreateAgentResult, CleanupResult } from '../types';
export declare class AgentManager {
    private configManager;
    private gitService;
    private tmuxService;
    private activeAgentsFile;
    constructor();
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getActiveAgents(): Agent[];
    attachToAgent(agentId: string): Promise<CommandResult>;
    stopAgent(agentId: string, removeWorktree?: boolean): Promise<CommandResult>;
    cleanupAllAgents(removeWorktrees?: boolean): Promise<CommandResult<CleanupResult>>;
    private agentExists;
    private recordAgent;
    private removeAgentRecord;
    private copyClaudeConfiguration;
}
//# sourceMappingURL=AgentManager.d.ts.map