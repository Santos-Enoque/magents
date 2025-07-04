import { Agent, CreateAgentOptions, AgentStatus, CommandResult } from '@magents/shared';
/**
 * Database-backed implementation of AgentManager
 * This wraps the CLI AgentManager while storing agent data in SQLite
 */
export declare class AgentManagerDB {
    private static instance;
    private db;
    private cliAgentManager;
    private initialized;
    private constructor();
    static getInstance(): AgentManagerDB;
    private ensureInitialized;
    getActiveAgents(): Promise<Agent[]>;
    getAgent(id: string): Promise<Agent | null>;
    createAgent(options: CreateAgentOptions): Promise<CommandResult<{
        agentId: string;
        branch: string;
        worktreePath: string;
        tmuxSession: string;
    }>>;
    stopAgent(id: string, removeWorktree?: boolean): Promise<CommandResult<void>>;
    updateAgentStatus(id: string, status: AgentStatus): Promise<Agent | null>;
    updateAgentConfig(id: string, config: Record<string, unknown>): Promise<void>;
    assignAgentToProject(agentId: string, projectId: string): Promise<Agent>;
    unassignAgentFromProject(agentId: string): Promise<Agent>;
    getAgentsByProject(projectId: string): Promise<Agent[]>;
    /**
     * Sync agents from CLI to database (for migration purposes)
     */
    syncFromCLI(): Promise<void>;
    /**
     * Convert UnifiedAgentData to Agent format for backward compatibility
     */
    private convertToAgent;
    /**
     * Create agent and associate with project in a transaction
     */
    createAgentWithProject(options: CreateAgentOptions & {
        projectId: string;
    }): Promise<CommandResult<{
        agentId: string;
        branch: string;
        worktreePath: string;
        tmuxSession: string;
    }>>;
    /**
     * Delete agent and update project in a transaction
     */
    deleteAgentFromProject(agentId: string): Promise<CommandResult<void>>;
    /**
     * Get or create a default project for CLI agents
     */
    private getOrCreateDefaultProject;
}
//# sourceMappingURL=AgentManagerDB.d.ts.map