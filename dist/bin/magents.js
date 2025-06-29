#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const AgentManager_1 = require("../services/AgentManager");
const ConfigManager_1 = require("../config/ConfigManager");
const PortManager_1 = require("../services/PortManager");
const program = new commander_1.Command();
const agentManager = new AgentManager_1.AgentManager();
const configManager = ConfigManager_1.ConfigManager.getInstance();
const portManager = new PortManager_1.PortManager();
program
    .name('magents')
    .description('Multi-Agent Claude Code Workflow Manager')
    .version('1.0.0');
// Create command
program
    .command('create')
    .description('Create new agent with worktree and Claude Code session')
    .argument('<branch>', 'Branch name for the agent')
    .argument('[agent-id]', 'Optional agent ID (auto-generated if not provided)')
    .option('--no-auto-accept', 'Disable automatic command acceptance in Claude Code')
    .action(async (branch, agentId, options) => {
    const spinner = (0, ora_1.default)('Creating agent...').start();
    try {
        const result = await agentManager.createAgent({
            branch,
            agentId,
            autoAccept: options?.autoAccept
        });
        if (result.success && result.data) {
            spinner.succeed(chalk_1.default.green(result.message));
            console.log(chalk_1.default.blue('Agent Details:'));
            console.log(`  ID: ${chalk_1.default.yellow(result.data.agentId)}`);
            console.log(`  Branch: ${chalk_1.default.yellow(result.data.branch)}`);
            console.log(`  Worktree: ${chalk_1.default.gray(result.data.worktreePath)}`);
            console.log(`  Tmux Session: ${chalk_1.default.gray(result.data.tmuxSession)}`);
            console.log('');
            console.log(chalk_1.default.blue('Next steps:'));
            console.log(`  ${chalk_1.default.white('magents attach')} ${chalk_1.default.yellow(result.data.agentId)}`);
            console.log(`  ${chalk_1.default.white('magents stop')} ${chalk_1.default.yellow(result.data.agentId)}`);
        }
        else {
            spinner.fail(chalk_1.default.red(result.message));
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to create agent: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// List command
program
    .command('list')
    .description('List all active agents')
    .action(() => {
    const agents = agentManager.getActiveAgents();
    if (agents.length === 0) {
        console.log(chalk_1.default.yellow('No active agents found'));
        return;
    }
    console.log(chalk_1.default.blue('Active Claude Code agents:'));
    console.log('');
    // Table header
    console.log(chalk_1.default.white.bold('  Agent ID'.padEnd(20) +
        'Branch'.padEnd(25) +
        'Status'.padEnd(12) +
        'Worktree Path'));
    console.log(chalk_1.default.gray('  ' + '─'.repeat(80)));
    agents.forEach(agent => {
        const statusColor = agent.status === 'RUNNING' ? chalk_1.default.green :
            agent.status === 'STOPPED' ? chalk_1.default.yellow : chalk_1.default.red;
        console.log(`  ${chalk_1.default.yellow(agent.id.padEnd(18))} ` +
            `${chalk_1.default.white(agent.branch.padEnd(23))} ` +
            `${statusColor(agent.status.padEnd(10))} ` +
            `${chalk_1.default.gray(agent.worktreePath)}`);
    });
    console.log('');
    console.log(chalk_1.default.blue(`Total: ${agents.length} agent${agents.length !== 1 ? 's' : ''}`));
});
// Attach command
program
    .command('attach')
    .description('Attach to an existing agent\'s tmux session')
    .argument('<agent-id>', 'Agent ID to attach to')
    .action(async (agentId) => {
    const spinner = (0, ora_1.default)(`Attaching to agent '${agentId}'...`).start();
    try {
        const result = await agentManager.attachToAgent(agentId);
        if (result.success) {
            spinner.stop();
            // The attach process will take over the terminal
        }
        else {
            spinner.fail(chalk_1.default.red(result.message));
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to attach: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// Stop command
program
    .command('stop')
    .description('Stop an agent and optionally remove its worktree')
    .argument('<agent-id>', 'Agent ID to stop')
    .option('-r, --remove-worktree', 'Remove the worktree as well')
    .action(async (agentId, options) => {
    let removeWorktree = options.removeWorktree || false;
    // Ask about worktree removal if not specified
    if (!options.removeWorktree) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'removeWorktree',
                message: 'Do you want to remove the worktree as well?',
                default: false
            }
        ]);
        removeWorktree = answer.removeWorktree;
    }
    const spinner = (0, ora_1.default)(`Stopping agent '${agentId}'...`).start();
    try {
        const result = await agentManager.stopAgent(agentId, removeWorktree);
        if (result.success) {
            spinner.succeed(chalk_1.default.green(result.message));
        }
        else {
            spinner.fail(chalk_1.default.red(result.message));
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// Cleanup command
program
    .command('cleanup')
    .description('Stop all agents and clean up')
    .option('-r, --remove-worktrees', 'Remove all worktrees as well')
    .action(async (options) => {
    const agents = agentManager.getActiveAgents();
    if (agents.length === 0) {
        console.log(chalk_1.default.yellow('No active agents to cleanup'));
        return;
    }
    console.log(chalk_1.default.yellow(`This will stop ${agents.length} active agent${agents.length !== 1 ? 's' : ''}:`));
    agents.forEach(agent => {
        console.log(`  ${chalk_1.default.yellow(agent.id)} (${agent.branch})`);
    });
    console.log('');
    const confirmCleanup = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue with cleanup?',
            default: false
        }
    ]);
    if (!confirmCleanup.proceed) {
        console.log(chalk_1.default.blue('Cleanup cancelled'));
        return;
    }
    let removeWorktrees = options.removeWorktrees || false;
    if (!options.removeWorktrees) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'removeWorktrees',
                message: 'Remove all worktrees as well?',
                default: false
            }
        ]);
        removeWorktrees = answer.removeWorktrees;
    }
    const spinner = (0, ora_1.default)('Cleaning up all agents...').start();
    try {
        const result = await agentManager.cleanupAllAgents(removeWorktrees);
        if (result.success) {
            spinner.succeed(chalk_1.default.green(result.message));
        }
        else {
            spinner.warn(chalk_1.default.yellow(result.message));
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// Init command
program
    .command('init')
    .description('Initialize configuration')
    .action(() => {
    const spinner = (0, ora_1.default)('Initializing magents configuration...').start();
    try {
        configManager.initializeConfig();
        spinner.succeed(chalk_1.default.green('Configuration initialized successfully!'));
        const configPath = configManager.getConfigPath();
        console.log(chalk_1.default.blue('Configuration file:'), chalk_1.default.gray(configPath));
        console.log(chalk_1.default.blue('Agents directory:'), chalk_1.default.gray(configManager.getAgentsDir()));
        console.log('');
        console.log(chalk_1.default.blue('Quick start:'));
        console.log(`  ${chalk_1.default.white('magents create')} ${chalk_1.default.yellow('feature/my-feature')}`);
        console.log(`  ${chalk_1.default.white('magents list')}`);
        console.log(`  ${chalk_1.default.white('magents attach')} ${chalk_1.default.yellow('<agent-id>')}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// Config command
program
    .command('config')
    .description('View or edit configuration')
    .option('-e, --edit', 'Edit configuration interactively')
    .action(async (options) => {
    const config = configManager.loadConfig();
    if (options.edit) {
        console.log(chalk_1.default.blue('Current Configuration:'));
        Object.entries(config).forEach(([key, value]) => {
            console.log(`  ${key}: ${chalk_1.default.yellow(String(value))}`);
        });
        console.log('');
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'DEFAULT_BASE_BRANCH',
                message: 'Default base branch:',
                default: config.DEFAULT_BASE_BRANCH
            },
            {
                type: 'input',
                name: 'CLAUDE_CODE_PATH',
                message: 'Claude Code command:',
                default: config.CLAUDE_CODE_PATH
            },
            {
                type: 'confirm',
                name: 'CLAUDE_AUTO_ACCEPT',
                message: 'Auto-accept Claude Code commands:',
                default: config.CLAUDE_AUTO_ACCEPT
            },
            {
                type: 'number',
                name: 'MAX_AGENTS',
                message: 'Maximum number of agents:',
                default: config.MAX_AGENTS
            }
        ]);
        configManager.updateConfig(answers);
        console.log(chalk_1.default.green('Configuration updated successfully!'));
    }
    else {
        console.log(chalk_1.default.blue('Current Configuration:'));
        Object.entries(config).forEach(([key, value]) => {
            console.log(`  ${chalk_1.default.white(key)}: ${chalk_1.default.yellow(String(value))}`);
        });
        console.log('');
        console.log(chalk_1.default.gray(`Config file: ${configManager.getConfigPath()}`));
    }
});
// Ports command
program
    .command('ports')
    .description('Port management commands')
    .option('-l, --list', 'List all allocated ports')
    .option('-d, --detect <path>', 'Detect ports in project directory')
    .option('-a, --allocate <count>', 'Allocate port range for project')
    .option('--project <id>', 'Project ID for operations')
    .action((options) => {
    if (options.list) {
        const allocations = portManager.getAllocatedPorts();
        if (allocations.length === 0) {
            console.log(chalk_1.default.yellow('No ports currently allocated'));
            return;
        }
        console.log(chalk_1.default.blue('Allocated Ports:'));
        console.log('');
        allocations.forEach(allocation => {
            const inUse = portManager.isPortInUse(allocation.port);
            const statusColor = inUse ? chalk_1.default.green : chalk_1.default.yellow;
            console.log(`  Port ${chalk_1.default.white(allocation.port.toString())} - ${statusColor(inUse ? 'IN USE' : 'ALLOCATED')}`);
            console.log(`    Project: ${chalk_1.default.yellow(allocation.projectId)}`);
            console.log(`    Service: ${chalk_1.default.gray(allocation.service)}`);
            console.log(`    Allocated: ${chalk_1.default.gray(allocation.allocatedAt.toISOString())}`);
            console.log('');
        });
    }
    if (options.detect) {
        const detected = portManager.detectProjectPorts(options.detect);
        if (Object.keys(detected).length === 0) {
            console.log(chalk_1.default.yellow('No ports detected in project'));
            return;
        }
        console.log(chalk_1.default.blue('Detected Ports:'));
        console.log('');
        Object.entries(detected).forEach(([service, port]) => {
            const inUse = portManager.isPortInUse(port);
            const statusColor = inUse ? chalk_1.default.red : chalk_1.default.green;
            console.log(`  ${chalk_1.default.white(service)}: ${chalk_1.default.yellow(port.toString())} ${statusColor(inUse ? '(IN USE)' : '(AVAILABLE)')}`);
        });
    }
    if (options.allocate && options.project) {
        try {
            const count = parseInt(options.allocate, 10);
            const [start, end] = portManager.allocateRange(options.project, count);
            console.log(chalk_1.default.green(`Allocated port range: ${start}-${end} for project ${options.project}`));
        }
        catch (error) {
            console.log(chalk_1.default.red(`Failed to allocate ports: ${error instanceof Error ? error.message : String(error)}`));
        }
    }
});
program.parse();
//# sourceMappingURL=magents.js.map