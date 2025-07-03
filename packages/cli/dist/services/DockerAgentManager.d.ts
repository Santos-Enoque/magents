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
    private databaseService;
    constructor();
    /**
     * Generate a consistent project ID based on the project path
     */
    private generateProjectId;
    /**
     * Detect if a project exists in the database
     */
    private detectExistingProject;
    /**
     * Auto-create a project for the given path
     */
    private autoCreateProject;
    /**
     * Detect project type based on files in the directory
     */
    private detectProjectType;
    /**
     * Get or create project for the given path
     */
    private getOrCreateProject;
    /**
     * Update project to include the agent in its agentIds array
     */
    private updateProjectWithAgent;
    getTmuxService(): any;
    createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>;
    getActiveAgents(): Agent[];
    attachToAgent(agentId: string): Promise<CommandResult>;
    stopAgent(agentId: string, removeContainer?: boolean): Promise<CommandResult>;
    cleanupAllAgents(removeContainers?: boolean): Promise<CommandResult<CleanupResult>>;
    private buildDockerCommand;
    private buildTmuxInitCommand;
    private getApiKeys;
    private setupSharedConfiguration;
    private copyDirectory;
    private getContainerStatus;
    private waitForHealthy;
    private ensureDirectory;
    private agentExists;
    private recordAgent;
    private updateAgentStatus;
    private checkClaudeAuthVolume;
    private checkClaudeAuthVolumeStatic;
}
//# sourceMappingURL=DockerAgentManager.d.ts.map