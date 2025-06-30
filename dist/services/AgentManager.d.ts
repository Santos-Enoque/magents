import { Agent, CreateAgentOptions, CommandResult, CreateAgentResult, CleanupResult } from '../types';
import { TmuxService } from './TmuxService';
export declare class AgentManager {
    private configManager;
    private gitService;
    private tmuxService;
    private activeAgentsFile;
    constructor();
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getTmuxService(): TmuxService;
    getActiveAgents(): Agent[];
    attachToAgent(agentId: string): Promise<CommandResult>;
    stopAgent(agentId: string, removeWorktree?: boolean): Promise<CommandResult>;
    cleanupAllAgents(removeWorktrees?: boolean): Promise<CommandResult<CleanupResult>>;
    private agentExists;
    private recordAgent;
    private removeAgentRecord;
    private copyClaudeConfiguration;
    private copyMCPConfiguration;
}
//# sourceMappingURL=AgentManager.d.ts.map