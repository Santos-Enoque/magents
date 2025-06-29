export interface MCPConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    scope: 'global' | 'project' | 'agent';
}
export interface SettingsSyncResult {
    success: boolean;
    message: string;
    syncedFiles: string[];
    errors: string[];
}
export declare class SettingsManager {
    private homeDir;
    private claudeConfigDir;
    constructor();
    syncSettingsToAgent(agentPath: string): Promise<SettingsSyncResult>;
    createProjectSettings(projectPath: string, settings: any): Promise<void>;
    loadProjectSettings(projectPath: string): any;
    mergeMCPConfigs(globalMCPs: MCPConfig[], projectMCPs?: MCPConfig[]): MCPConfig[];
    validateMCPConfig(mcp: MCPConfig): {
        valid: boolean;
        errors: string[];
    };
    getClaudeConfigFiles(): string[];
    private syncFile;
    private syncDirectory;
}
//# sourceMappingURL=SettingsManager.d.ts.map