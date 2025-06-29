export interface PortAllocation {
    projectId: string;
    agentId?: string;
    port: number;
    service: string;
    allocatedAt: Date;
}
export declare class PortManager {
    private configManager;
    private allocationsFile;
    private readonly MIN_PORT;
    private readonly MAX_PORT;
    constructor();
    allocatePort(projectId: string, service?: string, preferred?: number): number;
    allocateRange(projectId: string, count: number, startPort?: number): [number, number];
    releaseProjectPorts(projectId: string): void;
    releaseAgentPorts(agentId: string): void;
    getProjectPorts(projectId: string): PortAllocation[];
    getAllocatedPorts(): PortAllocation[];
    isPortInUse(port: number): boolean;
    detectProjectPorts(projectPath: string): {
        [service: string]: number;
    };
    private isPortAvailable;
    private loadAllocations;
    private saveAllocations;
}
//# sourceMappingURL=PortManager.d.ts.map