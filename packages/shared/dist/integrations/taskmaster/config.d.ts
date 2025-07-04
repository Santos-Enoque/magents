/**
 * TaskMaster Integration Configuration
 */
export interface TaskMasterConfig {
    /**
     * Whether TaskMaster integration is enabled
     */
    enabled: boolean;
    /**
     * Whether to auto-install TaskMaster in Docker containers
     */
    autoInstall: boolean;
    /**
     * Path to TaskMaster configuration file
     */
    configPath?: string;
    /**
     * Default API keys for TaskMaster AI features
     */
    apiKeys?: {
        anthropic?: string;
        perplexity?: string;
        openai?: string;
        google?: string;
        mistral?: string;
    };
    /**
     * Model configuration for TaskMaster
     */
    models?: {
        main?: string;
        research?: string;
        fallback?: string;
    };
    /**
     * Additional TaskMaster CLI flags
     */
    cliFlags?: string[];
}
export declare const DEFAULT_TASKMASTER_CONFIG: TaskMasterConfig;
/**
 * Check if TaskMaster should be enabled based on environment
 */
export declare function shouldEnableTaskMaster(): boolean;
/**
 * Get TaskMaster configuration from environment
 */
export declare function getTaskMasterConfigFromEnv(): TaskMasterConfig;
//# sourceMappingURL=config.d.ts.map