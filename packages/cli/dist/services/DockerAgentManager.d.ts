import { Agent, CreateAgentOptions, CommandResult, CreateAgentResult, CleanupResult } from '../types';
/**
 * Docker-based Agent Manager for Magents
 * Creates and manages AI agents as Docker containers
 */
export declare class DockerAgentManager {
    private configManager;
    private gitService;
    private activeAgentsFile;
    private dockerImage;
    constructor();
    getTmuxService(): any;
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getActiveAgents(): Agent[];
    attachToAgent(agentId: string): Promise<CommandResult>;
    stopAgent(agentId: string, removeContainer?: boolean): Promise<CommandResult>;
    cleanupAllAgents(removeContainers?: boolean): Promise<CommandResult<CleanupResult>>;
    private buildDockerCommand;
    private getApiKeys;
    private setupSharedConfiguration;
    private copyDirectory;
    private getContainerStatus;
    private waitForHealthy;
    private ensureDirectory;
    private agentExists;
    private recordAgent;
    private updateAgentStatus;
}
//# sourceMappingURL=DockerAgentManager.d.ts.map