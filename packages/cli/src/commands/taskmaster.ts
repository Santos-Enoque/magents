import { Command } from 'commander';
import { ui } from '../ui/UIService';
import { ConfigManager } from '../config/ConfigManager';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

export class TaskMasterCommand {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public async execute(action: string, options: any = {}): Promise<void> {
    const config = this.configManager.loadConfig();

    // Check if Task Master is enabled
    if (!config.TASK_MASTER_ENABLED) {
      const enable = await this.promptToEnable();
      if (!enable) {
        return;
      }
    }

    // Check if Task Master is available
    if (!this.isTaskMasterAvailable()) {
      await this.handleMissingTaskMaster();
      return;
    }

    // Execute Task Master command
    switch (action) {
      case 'status':
        await this.showStatus();
        break;
      case 'enable':
        await this.enableTaskMaster();
        break;
      case 'disable':
        await this.disableTaskMaster();
        break;
      case 'install':
        await this.installTaskMaster();
        break;
      default:
        // Pass through to Task Master CLI
        await this.passThrough(action, options);
    }
  }

  private async promptToEnable(): Promise<boolean> {
    ui.warning('Task Master integration is currently disabled.');
    
    const { enable } = await inquirer.prompt([{
      type: 'confirm',
      name: 'enable',
      message: 'Would you like to enable Task Master integration?',
      default: true
    }]);

    if (enable) {
      await this.enableTaskMaster();
      return true;
    }

    ui.info('Task Master remains disabled. Enable it with: magents taskmaster enable');
    return false;
  }

  private isTaskMasterAvailable(): boolean {
    try {
      execSync('which task-master', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async handleMissingTaskMaster(): Promise<void> {
    ui.error('Task Master is not installed in your environment.');
    
    const choices = [
      { name: 'Install Task Master globally (npm)', value: 'npm' },
      { name: 'Use Docker image with Task Master', value: 'docker' },
      { name: 'Cancel', value: 'cancel' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'How would you like to proceed?',
      choices
    }]);

    switch (action) {
      case 'npm':
        await this.installTaskMaster();
        break;
      case 'docker':
        ui.info('To use Task Master with Docker:');
        ui.command('magents create my-agent --docker-image magents/agent:latest-taskmaster');
        ui.info('Or rebuild your images with: ./docker/build-docker-images.sh --with-taskmaster');
        break;
    }
  }

  private async showStatus(): Promise<void> {
    const config = this.configManager.loadConfig();
    
    ui.header('Task Master Integration Status');
    ui.keyValue('Enabled', config.TASK_MASTER_ENABLED ? 'Yes' : 'No');
    ui.keyValue('Auto-install', config.TASKMASTER_AUTO_INSTALL ? 'Yes' : 'No');
    ui.keyValue('Available', this.isTaskMasterAvailable() ? 'Yes' : 'No');
    
    if (this.isTaskMasterAvailable()) {
      try {
        const version = execSync('task-master --version', { encoding: 'utf8' }).trim();
        ui.keyValue('Version', version);
      } catch {
        ui.keyValue('Version', 'Unknown');
      }
    }

    // Check for Task Master project
    const hasProject = this.hasTaskMasterProject();
    ui.keyValue('Project initialized', hasProject ? 'Yes' : 'No');
    
    if (hasProject) {
      try {
        const taskCount = execSync('task-master list --count', { encoding: 'utf8' }).trim();
        ui.keyValue('Total tasks', taskCount);
      } catch {
        // Ignore errors
      }
    }
  }

  private async enableTaskMaster(): Promise<void> {
    this.configManager.updateConfig({
      TASK_MASTER_ENABLED: true
    });
    
    ui.success('Task Master integration enabled');
    
    if (!this.isTaskMasterAvailable()) {
      const { install } = await inquirer.prompt([{
        type: 'confirm',
        name: 'install',
        message: 'Task Master is not installed. Would you like to install it now?',
        default: true
      }]);

      if (install) {
        await this.installTaskMaster();
      }
    }
  }

  private async disableTaskMaster(): Promise<void> {
    this.configManager.updateConfig({
      TASK_MASTER_ENABLED: false,
      TASKMASTER_AUTO_INSTALL: false
    });
    
    ui.success('Task Master integration disabled');
    ui.info('Task Master can be re-enabled with: magents taskmaster enable');
  }

  private async installTaskMaster(): Promise<void> {
    const spinner = ui.spinner('Installing Task Master...');
    spinner.start();

    try {
      execSync('npm install -g task-master-ai', { stdio: 'pipe' });
      spinner.succeed('Task Master installed successfully');
      
      // Enable Task Master
      this.configManager.updateConfig({
        TASK_MASTER_ENABLED: true
      });
      
      // Check if we should initialize a project
      if (!this.hasTaskMasterProject()) {
        const { init } = await inquirer.prompt([{
          type: 'confirm',
          name: 'init',
          message: 'Would you like to initialize Task Master in this project?',
          default: true
        }]);

        if (init) {
          execSync('task-master init', { stdio: 'inherit' });
        }
      }
    } catch (error) {
      spinner.fail('Failed to install Task Master');
      ui.error(error instanceof Error ? error.message : String(error));
    }
  }

  private hasTaskMasterProject(): boolean {
    const fs = require('fs');
    const path = require('path');
    return fs.existsSync(path.join(process.cwd(), '.taskmaster'));
  }

  private async passThrough(command: string, options: any): Promise<void> {
    // Build Task Master command
    const args = [command];
    
    // Add any additional arguments
    if (options._ && options._.length > 0) {
      args.push(...options._);
    }
    
    // Add flags
    Object.entries(options).forEach(([key, value]) => {
      if (key !== '_' && value !== undefined) {
        if (typeof value === 'boolean' && value) {
          args.push(`--${key}`);
        } else if (typeof value !== 'boolean') {
          args.push(`--${key}`, String(value));
        }
      }
    });

    const taskMasterCmd = `task-master ${args.join(' ')}`;
    
    try {
      execSync(taskMasterCmd, { stdio: 'inherit' });
    } catch (error) {
      // Task Master will handle its own error output
      process.exit(1);
    }
  }
}

// Export singleton instance
export const taskMasterCommand = new TaskMasterCommand();