import { MagentsConfig, AgentRecord } from '../types';
export declare class ConfigManager {
    private static instance;
    private configFile;
    private agentsDir;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    getConfigPath(): string;
    getAgentsDir(): string;
    initializeConfig(): void;
    loadConfig(): MagentsConfig;
    updateConfig(updates: Partial<MagentsConfig>): void;
    getAgentDataPath(agentId: string): string;
    saveAgentData(agent: AgentRecord): void;
    loadAgentData(agentId: string): AgentRecord | null;
    getAllAgents(): AgentRecord[];
    deleteAgentData(agentId: string): void;
    updateAgentData(agentId: string, updates: Partial<AgentRecord>): void;
}
//# sourceMappingURL=ConfigManager.d.ts.map