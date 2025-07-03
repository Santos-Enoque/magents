import { Agent, CreateAgentOptions, CommandResult, CreateAgentResult, CleanupResult } from '../types';
/**
 * @deprecated AgentManager is deprecated in favor of DockerAgentManager.
 * This class uses tmux sessions which have been removed in favor of Docker-only approach.
 * Use DockerAgentManager for all new implementations.
 */
export declare class AgentManager {
    private configManager;
    private gitService;
    private activeAgentsFile;
    constructor();
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getTmuxService(): any;
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