"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modeManager = exports.ModeManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const UIService_1 = require("../ui/UIService");
const ConfigManager_1 = require("../config/ConfigManager");
const inquirer_1 = __importDefault(require("inquirer"));
const modeConfigs = {
    simple: {
        mode: 'simple',
        features: {
            taskMaster: false,
            githubIntegration: false,
            dockerSupport: true, // Docker is available but simplified
            mcpServers: false,
            customCommands: false,
            advancedSettings: false
        },
        helpLevel: 'basic'
    },
    standard: {
        mode: 'standard',
        features: {
            taskMaster: true,
            githubIntegration: true,
            dockerSupport: true,
            mcpServers: true,
            customCommands: false,
            advancedSettings: false
        },
        helpLevel: 'detailed'
    },
    advanced: {
        mode: 'advanced',
        features: {
            taskMaster: true,
            githubIntegration: true,
            dockerSupport: true,
            mcpServers: true,
            customCommands: true,
            advancedSettings: true
        },
        helpLevel: 'expert'
    }
};
class ModeManager {
    constructor() {
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
        this.currentMode = this.loadCurrentMode();
    }
    loadCurrentMode() {
        const config = this.configManager.loadConfig();
        const mode = config.MODE || 'simple';
        return modeConfigs[mode] || modeConfigs.simple;
    }
    getCurrentMode() {
        return this.currentMode;
    }
    async switchMode(newMode, preserveData = true, dryRun = false) {
        const oldMode = this.currentMode.mode;
        if (oldMode === newMode) {
            UIService_1.ui.info(`Already in ${newMode} mode`);
            return;
        }
        // Show mode transition summary
        UIService_1.ui.header(`Switching from ${oldMode} to ${newMode} mode`);
        // Show what will change
        this.showModeComparison(oldMode, newMode);
        if (dryRun) {
            UIService_1.ui.header('Dry Run - Mode Switch Preview');
            UIService_1.ui.keyValue('Current Mode', oldMode);
            UIService_1.ui.keyValue('Target Mode', newMode);
            UIService_1.ui.keyValue('Data Preservation', preserveData ? 'Yes' : 'No');
            if (preserveData) {
                const backupDir = path.join(this.configManager.getAgentsDir(), '.mode-backups');
                UIService_1.ui.keyValue('Config Backup Location', backupDir);
            }
            UIService_1.ui.info('Use without --dry-run to switch modes');
            return;
        }
        // Confirm the switch
        const confirm = await inquirer_1.default.prompt([{
                type: 'confirm',
                name: 'proceed',
                message: `Switch to ${newMode} mode?`,
                default: true
            }]);
        if (!confirm.proceed) {
            UIService_1.ui.info('Mode switch cancelled');
            return;
        }
        // Preserve existing configuration if requested
        if (preserveData) {
            await this.preserveConfiguration(oldMode);
        }
        // Update configuration
        this.configManager.updateConfig({ MODE: newMode });
        // Update current mode
        this.currentMode = modeConfigs[newMode];
        // Apply mode-specific configurations
        await this.applyModeConfiguration(newMode);
        UIService_1.ui.success(`Successfully switched to ${newMode} mode`);
        // Show guided upgrade suggestions if moving up
        if (this.isUpgrade(oldMode, newMode)) {
            await this.showUpgradeGuide(oldMode, newMode);
        }
    }
    showModeComparison(oldMode, newMode) {
        const oldConfig = modeConfigs[oldMode];
        const newConfig = modeConfigs[newMode];
        UIService_1.ui.divider('Feature Changes');
        const features = Object.keys(oldConfig.features);
        features.forEach(feature => {
            const oldValue = oldConfig.features[feature];
            const newValue = newConfig.features[feature];
            if (oldValue !== newValue) {
                const featureName = this.getFeatureName(feature);
                const status = newValue ? '✓ Enabled' : '✗ Disabled';
                const color = newValue ? 'green' : 'red';
                UIService_1.ui.keyValue(featureName, status);
            }
        });
    }
    getFeatureName(feature) {
        const names = {
            taskMaster: 'Task Master Integration',
            githubIntegration: 'GitHub Integration',
            dockerSupport: 'Docker Support',
            mcpServers: 'MCP Servers',
            customCommands: 'Custom Commands',
            advancedSettings: 'Advanced Settings'
        };
        return names[feature] || feature;
    }
    async preserveConfiguration(oldMode) {
        const backupDir = path.join(this.configManager.getAgentsDir(), '.mode-backups');
        const backupFile = path.join(backupDir, `${oldMode}-${Date.now()}.json`);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const config = this.configManager.loadConfig();
        fs.writeFileSync(backupFile, JSON.stringify(config, null, 2));
        UIService_1.ui.muted(`Configuration backed up to ${backupFile}`);
    }
    async applyModeConfiguration(mode) {
        const modeConfig = modeConfigs[mode];
        const config = this.configManager.loadConfig();
        // Apply feature flags
        if (!modeConfig.features.taskMaster) {
            config.TASK_MASTER_ENABLED = false;
        }
        if (!modeConfig.features.githubIntegration) {
            config.GITHUB_INTEGRATION = false;
        }
        if (!modeConfig.features.mcpServers) {
            config.MCP_ENABLED = false;
        }
        this.configManager.updateConfig(config);
    }
    isUpgrade(oldMode, newMode) {
        const modeOrder = ['simple', 'standard', 'advanced'];
        return modeOrder.indexOf(newMode) > modeOrder.indexOf(oldMode);
    }
    async showUpgradeGuide(oldMode, newMode) {
        UIService_1.ui.divider('Upgrade Guide');
        if (oldMode === 'simple' && newMode === 'standard') {
            UIService_1.ui.info('Welcome to Standard mode! Here are the new features available:');
            UIService_1.ui.list([
                'Task Master integration - Use `magents task-create` to create agents from tasks',
                'GitHub integration - Create issues and PRs with `--create-issue` flag',
                'MCP servers - Connect to external services via MCP protocol',
                'Branch management - Automatic branch creation and push'
            ]);
            UIService_1.ui.tip('Try creating an agent with Task Master: `magents create my-feature --mode standard --task 1.2`');
        }
        if (newMode === 'advanced') {
            UIService_1.ui.info('Welcome to Advanced mode! You now have access to:');
            UIService_1.ui.list([
                'Custom commands - Create your own CLI commands',
                'Advanced settings - Fine-tune agent behavior',
                'Full Task Master features - Complex task workflows',
                'Custom Docker configurations',
                'MCP server development tools'
            ]);
            UIService_1.ui.tip('Explore advanced features with `magents config --advanced`');
        }
    }
    showModeHelp(mode) {
        const targetMode = mode || this.currentMode.mode;
        const config = modeConfigs[targetMode];
        UIService_1.ui.header(`${targetMode.charAt(0).toUpperCase() + targetMode.slice(1)} Mode Help`);
        switch (config.helpLevel) {
            case 'basic':
                UIService_1.ui.info('Simple mode provides the essentials:');
                UIService_1.ui.list([
                    'Create agents quickly with smart defaults',
                    'Attach to agents and start coding',
                    'Basic Docker support',
                    'Minimal configuration required'
                ]);
                UIService_1.ui.tip('Ready for more? Try `magents mode switch standard`');
                break;
            case 'detailed':
                UIService_1.ui.info('Standard mode includes:');
                UIService_1.ui.list([
                    'Task Master integration for project management',
                    'GitHub issue and PR creation',
                    'MCP server connections',
                    'Docker container support',
                    'Branch management automation'
                ]);
                UIService_1.ui.example('magents create feature --task 1.2 --create-issue');
                break;
            case 'expert':
                UIService_1.ui.info('Advanced mode - full control:');
                UIService_1.ui.list([
                    'All standard features plus:',
                    'Custom command creation',
                    'Advanced configuration options',
                    'Task Master workflow automation',
                    'Custom Docker images and configs',
                    'MCP server development'
                ]);
                UIService_1.ui.example('magents workflow create complex-feature --template advanced');
                break;
        }
    }
    getModeRecommendation() {
        // Analyze user's environment and usage to recommend a mode
        const hasTaskMaster = this.checkTaskMasterInstalled();
        const hasDocker = this.checkDockerInstalled();
        const hasGitHub = this.checkGitHubCLI();
        if (!hasTaskMaster && !hasGitHub) {
            return 'simple';
        }
        else if (hasTaskMaster && hasGitHub && !this.hasAdvancedUsage()) {
            return 'standard';
        }
        else {
            return 'advanced';
        }
    }
    checkTaskMasterInstalled() {
        try {
            const { execSync } = require('child_process');
            execSync('which task-master', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    checkDockerInstalled() {
        try {
            const { execSync } = require('child_process');
            execSync('docker --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    checkGitHubCLI() {
        try {
            const { execSync } = require('child_process');
            execSync('gh --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    hasAdvancedUsage() {
        // Check for advanced usage patterns
        const config = this.configManager.loadConfig();
        return !!(config.CUSTOM_COMMANDS_ENABLED ||
            config.MCP_DEVELOPMENT_MODE ||
            config.ADVANCED_DOCKER_CONFIG);
    }
}
exports.ModeManager = ModeManager;
// Export singleton instance
exports.modeManager = new ModeManager();
//# sourceMappingURL=mode.js.map