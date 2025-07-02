export interface StartOptions {
    agent?: string;
    all?: boolean;
    docker?: boolean;
    resources?: {
        cpu?: string;
        memory?: string;
        disk?: string;
    };
    network?: string;
    volumes?: string[];
    env?: string[];
    healthCheck?: boolean;
    restart?: string;
    detach?: boolean;
    logs?: boolean;
    shell?: boolean;
    dryRun?: boolean;
}
export interface ContainerStatus {
    id: string;
    name: string;
    status: string;
    health?: string;
    cpu?: string;
    memory?: string;
    created: string;
    ports?: string[];
}
export declare class StartCommand {
    private configManager;
    private agentManager;
    private dockerManager;
    constructor();
    execute(agentId?: string, options?: StartOptions): Promise<void>;
    private checkDocker;
    private startAllAgents;
    private startSpecificAgent;
    private startInteractive;
    private startAgent;
    private startDockerAgent;
    private buildDockerRunCommand;
    private startTmuxAgent;
    private waitForContainer;
    private checkClaudeAuthVolume;
    private applyResourceLimits;
    private setupHealthCheck;
    private showLogs;
    private attachShell;
    private restartAgent;
    getContainerStatus(containerName: string): Promise<ContainerStatus | null>;
}
export declare const startCommand: StartCommand;
//# sourceMappingURL=start.d.ts.map