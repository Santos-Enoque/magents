export interface DockerContainerOptions {
    agentId: string;
    projectPath: string;
    portRange: string;
    environment?: Record<string, string>;
    branch: string;
    projectName: string;
    isolationMode?: 'strict' | 'permissive';
}
export type ContainerStatus = 'running' | 'stopped' | 'paused' | 'restarting' | 'removing' | 'dead' | 'created' | 'exited';
export declare class DockerService {
    private templatesDir;
    constructor();
    createContainer(options: DockerContainerOptions): Promise<void>;
    startContainer(agentId: string, projectPath: string): Promise<void>;
    stopContainer(agentId: string, projectPath: string): Promise<void>;
    removeContainer(agentId: string, projectPath: string): Promise<void>;
    execInContainer(agentId: string, projectPath: string, command: string[]): Promise<string>;
    containerExists(agentId: string): boolean;
    getContainerStatus(agentId: string): ContainerStatus | null;
    isDockerAvailable(): boolean;
    private generateDockerComposeFile;
    attachToContainer(agentId: string, projectPath: string): Promise<void>;
}
//# sourceMappingURL=DockerService.d.ts.map