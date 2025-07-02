export interface ModeConfig {
    mode: 'simple' | 'standard' | 'advanced';
    features: {
        taskMaster: boolean;
        githubIntegration: boolean;
        dockerSupport: boolean;
        mcpServers: boolean;
        customCommands: boolean;
        advancedSettings: boolean;
    };
    helpLevel: 'basic' | 'detailed' | 'expert';
}
export declare class ModeManager {
    private configManager;
    private currentMode;
    constructor();
    private loadCurrentMode;
    getCurrentMode(): ModeConfig;
    switchMode(newMode: 'simple' | 'standard' | 'advanced', preserveData?: boolean, dryRun?: boolean): Promise<void>;
    private showModeComparison;
    private getFeatureName;
    private preserveConfiguration;
    private applyModeConfiguration;
    private isUpgrade;
    private showUpgradeGuide;
    showModeHelp(mode?: string): void;
    getModeRecommendation(): string;
    private checkTaskMasterInstalled;
    private checkDockerInstalled;
    private checkGitHubCLI;
    private hasAdvancedUsage;
}
export declare const modeManager: ModeManager;
//# sourceMappingURL=mode.d.ts.map