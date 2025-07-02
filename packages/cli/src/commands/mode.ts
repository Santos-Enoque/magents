import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ui } from '../ui/UIService';
import { ConfigManager } from '../config/ConfigManager';
import inquirer from 'inquirer';

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

const modeConfigs: Record<string, ModeConfig> = {
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

export class ModeManager {
  private configManager: ConfigManager;
  private currentMode: ModeConfig;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.currentMode = this.loadCurrentMode();
  }

  private loadCurrentMode(): ModeConfig {
    const config = this.configManager.loadConfig();
    const mode = config.MODE || 'simple';
    return modeConfigs[mode] || modeConfigs.simple;
  }

  public getCurrentMode(): ModeConfig {
    return this.currentMode;
  }

  public async switchMode(newMode: 'simple' | 'standard' | 'advanced', preserveData: boolean = true): Promise<void> {
    const oldMode = this.currentMode.mode;
    
    if (oldMode === newMode) {
      ui.info(`Already in ${newMode} mode`);
      return;
    }

    // Show mode transition summary
    ui.header(`Switching from ${oldMode} to ${newMode} mode`);
    
    // Show what will change
    this.showModeComparison(oldMode, newMode);
    
    // Confirm the switch
    const confirm = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: `Switch to ${newMode} mode?`,
      default: true
    }]);
    
    if (!confirm.proceed) {
      ui.info('Mode switch cancelled');
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
    
    ui.success(`Successfully switched to ${newMode} mode`);
    
    // Show guided upgrade suggestions if moving up
    if (this.isUpgrade(oldMode, newMode)) {
      await this.showUpgradeGuide(oldMode, newMode);
    }
  }

  private showModeComparison(oldMode: string, newMode: string): void {
    const oldConfig = modeConfigs[oldMode];
    const newConfig = modeConfigs[newMode];
    
    ui.divider('Feature Changes');
    
    const features = Object.keys(oldConfig.features) as Array<keyof typeof oldConfig.features>;
    
    features.forEach(feature => {
      const oldValue = oldConfig.features[feature];
      const newValue = newConfig.features[feature];
      
      if (oldValue !== newValue) {
        const featureName = this.getFeatureName(feature);
        const status = newValue ? '✓ Enabled' : '✗ Disabled';
        const color = newValue ? 'green' : 'red';
        ui.keyValue(featureName, status);
      }
    });
  }

  private getFeatureName(feature: string): string {
    const names: Record<string, string> = {
      taskMaster: 'Task Master Integration',
      githubIntegration: 'GitHub Integration',
      dockerSupport: 'Docker Support',
      mcpServers: 'MCP Servers',
      customCommands: 'Custom Commands',
      advancedSettings: 'Advanced Settings'
    };
    return names[feature] || feature;
  }

  private async preserveConfiguration(oldMode: string): Promise<void> {
    const backupDir = path.join(this.configManager.getAgentsDir(), '.mode-backups');
    const backupFile = path.join(backupDir, `${oldMode}-${Date.now()}.json`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const config = this.configManager.loadConfig();
    fs.writeFileSync(backupFile, JSON.stringify(config, null, 2));
    
    ui.muted(`Configuration backed up to ${backupFile}`);
  }

  private async applyModeConfiguration(mode: string): Promise<void> {
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

  private isUpgrade(oldMode: string, newMode: string): boolean {
    const modeOrder = ['simple', 'standard', 'advanced'];
    return modeOrder.indexOf(newMode) > modeOrder.indexOf(oldMode);
  }

  private async showUpgradeGuide(oldMode: string, newMode: string): Promise<void> {
    ui.divider('Upgrade Guide');
    
    if (oldMode === 'simple' && newMode === 'standard') {
      ui.info('Welcome to Standard mode! Here are the new features available:');
      ui.list([
        'Task Master integration - Use `magents task-create` to create agents from tasks',
        'GitHub integration - Create issues and PRs with `--create-issue` flag',
        'MCP servers - Connect to external services via MCP protocol',
        'Branch management - Automatic branch creation and push'
      ]);
      
      ui.tip('Try creating an agent with Task Master: `magents create my-feature --mode standard --task 1.2`');
    }
    
    if (newMode === 'advanced') {
      ui.info('Welcome to Advanced mode! You now have access to:');
      ui.list([
        'Custom commands - Create your own CLI commands',
        'Advanced settings - Fine-tune agent behavior',
        'Full Task Master features - Complex task workflows',
        'Custom Docker configurations',
        'MCP server development tools'
      ]);
      
      ui.tip('Explore advanced features with `magents config --advanced`');
    }
  }

  public showModeHelp(mode?: string): void {
    const targetMode = mode || this.currentMode.mode;
    const config = modeConfigs[targetMode];
    
    ui.header(`${targetMode.charAt(0).toUpperCase() + targetMode.slice(1)} Mode Help`);
    
    switch (config.helpLevel) {
      case 'basic':
        ui.info('Simple mode provides the essentials:');
        ui.list([
          'Create agents quickly with smart defaults',
          'Attach to agents and start coding',
          'Basic Docker support',
          'Minimal configuration required'
        ]);
        ui.tip('Ready for more? Try `magents mode switch standard`');
        break;
        
      case 'detailed':
        ui.info('Standard mode includes:');
        ui.list([
          'Task Master integration for project management',
          'GitHub issue and PR creation',
          'MCP server connections',
          'Docker and tmux modes',
          'Branch management automation'
        ]);
        ui.example('magents create feature --task 1.2 --create-issue');
        break;
        
      case 'expert':
        ui.info('Advanced mode - full control:');
        ui.list([
          'All standard features plus:',
          'Custom command creation',
          'Advanced configuration options',
          'Task Master workflow automation',
          'Custom Docker images and configs',
          'MCP server development'
        ]);
        ui.example('magents workflow create complex-feature --template advanced');
        break;
    }
  }

  public getModeRecommendation(): string {
    // Analyze user's environment and usage to recommend a mode
    const hasTaskMaster = this.checkTaskMasterInstalled();
    const hasDocker = this.checkDockerInstalled();
    const hasGitHub = this.checkGitHubCLI();
    
    if (!hasTaskMaster && !hasGitHub) {
      return 'simple';
    } else if (hasTaskMaster && hasGitHub && !this.hasAdvancedUsage()) {
      return 'standard';
    } else {
      return 'advanced';
    }
  }

  private checkTaskMasterInstalled(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('which task-master', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private checkDockerInstalled(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private checkGitHubCLI(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private hasAdvancedUsage(): boolean {
    // Check for advanced usage patterns
    const config = this.configManager.loadConfig();
    return !!(
      config.CUSTOM_COMMANDS_ENABLED ||
      config.MCP_DEVELOPMENT_MODE ||
      config.ADVANCED_DOCKER_CONFIG
    );
  }
}

// Export singleton instance
export const modeManager = new ModeManager();