export interface EnvironmentConfig {
    type: 'local' | 'codespaces' | 'gitpod' | 'remote';
    isRemote: boolean;
    supportsDocker: boolean;
    claudeFlags: string[];
    resourceLimits: {
        maxAgents: number;
        memoryLimit?: string;
        cpuLimit?: string;
    };
}
export declare class EnvironmentDetector {
    isCodespaces(): boolean;
    isGitpod(): boolean;
    isRemoteDocker(): boolean;
    isContainerEnvironment(): boolean;
    getEnvironmentConfig(): EnvironmentConfig;
    getCodespacesConfig(): any;
    generateClaudeCommand(baseCommand?: string): string;
    shouldUsePermissionsFlag(): boolean;
    getOptimizedDockerConfig(): any;
    printEnvironmentInfo(): void;
}
//# sourceMappingURL=EnvironmentDetector.d.ts.map