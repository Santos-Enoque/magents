"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskMasterCommand = exports.TaskMasterCommand = void 0;
const UIService_1 = require("../ui/UIService");
const ConfigManager_1 = require("../config/ConfigManager");
const child_process_1 = require("child_process");
const inquirer_1 = __importDefault(require("inquirer"));
class TaskMasterCommand {
    constructor() {
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
    }
    async execute(action, options = {}) {
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
    async promptToEnable() {
        UIService_1.ui.warning('Task Master integration is currently disabled.');
        const { enable } = await inquirer_1.default.prompt([{
                type: 'confirm',
                name: 'enable',
                message: 'Would you like to enable Task Master integration?',
                default: true
            }]);
        if (enable) {
            await this.enableTaskMaster();
            return true;
        }
        UIService_1.ui.info('Task Master remains disabled. Enable it with: magents taskmaster enable');
        return false;
    }
    isTaskMasterAvailable() {
        try {
            (0, child_process_1.execSync)('which task-master', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async handleMissingTaskMaster() {
        UIService_1.ui.error('Task Master is not installed in your environment.');
        const choices = [
            { name: 'Install Task Master globally (npm)', value: 'npm' },
            { name: 'Use Docker image with Task Master', value: 'docker' },
            { name: 'Cancel', value: 'cancel' }
        ];
        const { action } = await inquirer_1.default.prompt([{
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
                UIService_1.ui.info('To use Task Master with Docker:');
                UIService_1.ui.command('magents create my-agent --docker-image magents/agent:latest-taskmaster');
                UIService_1.ui.info('Or rebuild your images with: ./docker/build-docker-images.sh --with-taskmaster');
                break;
        }
    }
    async showStatus() {
        const config = this.configManager.loadConfig();
        UIService_1.ui.header('Task Master Integration Status');
        UIService_1.ui.keyValue('Enabled', config.TASK_MASTER_ENABLED ? 'Yes' : 'No');
        UIService_1.ui.keyValue('Auto-install', config.TASKMASTER_AUTO_INSTALL ? 'Yes' : 'No');
        UIService_1.ui.keyValue('Available', this.isTaskMasterAvailable() ? 'Yes' : 'No');
        if (this.isTaskMasterAvailable()) {
            try {
                const version = (0, child_process_1.execSync)('task-master --version', { encoding: 'utf8' }).trim();
                UIService_1.ui.keyValue('Version', version);
            }
            catch {
                UIService_1.ui.keyValue('Version', 'Unknown');
            }
        }
        // Check for Task Master project
        const hasProject = this.hasTaskMasterProject();
        UIService_1.ui.keyValue('Project initialized', hasProject ? 'Yes' : 'No');
        if (hasProject) {
            try {
                const taskCount = (0, child_process_1.execSync)('task-master list --count', { encoding: 'utf8' }).trim();
                UIService_1.ui.keyValue('Total tasks', taskCount);
            }
            catch {
                // Ignore errors
            }
        }
    }
    async enableTaskMaster() {
        this.configManager.updateConfig({
            TASK_MASTER_ENABLED: true
        });
        UIService_1.ui.success('Task Master integration enabled');
        if (!this.isTaskMasterAvailable()) {
            const { install } = await inquirer_1.default.prompt([{
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
    async disableTaskMaster() {
        this.configManager.updateConfig({
            TASK_MASTER_ENABLED: false,
            TASKMASTER_AUTO_INSTALL: false
        });
        UIService_1.ui.success('Task Master integration disabled');
        UIService_1.ui.info('Task Master can be re-enabled with: magents taskmaster enable');
    }
    async installTaskMaster() {
        const spinner = UIService_1.ui.spinner('Installing Task Master...');
        spinner.start();
        try {
            (0, child_process_1.execSync)('npm install -g task-master-ai', { stdio: 'pipe' });
            spinner.succeed('Task Master installed successfully');
            // Enable Task Master
            this.configManager.updateConfig({
                TASK_MASTER_ENABLED: true
            });
            // Check if we should initialize a project
            if (!this.hasTaskMasterProject()) {
                const { init } = await inquirer_1.default.prompt([{
                        type: 'confirm',
                        name: 'init',
                        message: 'Would you like to initialize Task Master in this project?',
                        default: true
                    }]);
                if (init) {
                    (0, child_process_1.execSync)('task-master init', { stdio: 'inherit' });
                }
            }
        }
        catch (error) {
            spinner.fail('Failed to install Task Master');
            UIService_1.ui.error(error instanceof Error ? error.message : String(error));
        }
    }
    hasTaskMasterProject() {
        const fs = require('fs');
        const path = require('path');
        return fs.existsSync(path.join(process.cwd(), '.taskmaster'));
    }
    async passThrough(command, options) {
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
                }
                else if (typeof value !== 'boolean') {
                    args.push(`--${key}`, String(value));
                }
            }
        });
        const taskMasterCmd = `task-master ${args.join(' ')}`;
        try {
            (0, child_process_1.execSync)(taskMasterCmd, { stdio: 'inherit' });
        }
        catch (error) {
            // Task Master will handle its own error output
            process.exit(1);
        }
    }
}
exports.TaskMasterCommand = TaskMasterCommand;
// Export singleton instance
exports.taskMasterCommand = new TaskMasterCommand();
//# sourceMappingURL=taskmaster.js.map