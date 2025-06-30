import { MagentsConfig } from '../types';
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
}
//# sourceMappingURL=ConfigManager.d.ts.map