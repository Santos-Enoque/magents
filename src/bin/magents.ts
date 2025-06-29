#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { AgentManager } from '../services/AgentManager';
import { ConfigManager } from '../config/ConfigManager';

const program = new Command();
const agentManager = new AgentManager();
const configManager = ConfigManager.getInstance();

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
  .option('-e, --env <key=value>', 'Set environment variable (can be used multiple times)', (value: string, previous: Record<string, string>) => {
    const envVars = previous || {};
    const [key, val] = value.split('=');
    if (key && val) {
      envVars[key] = val;
    }
    return envVars;
  }, {} as Record<string, string>)
  .option('-t, --task <description>', 'Task description for the agent')
  .option('-s, --service <name=url>', 'Service endpoint (can be used multiple times)', (value: string, previous: Record<string, string>) => {
    const services = previous || {};
    const [name, url] = value.split('=');
    if (name && url) {
      services[name] = url;
    }
    return services;
  }, {} as Record<string, string>)
  .option('-b, --boundary <rule>', 'Add boundary rule (can be used multiple times)', (value: string, previous: string[]) => {
    const boundaries = previous || [];
    boundaries.push(value);
    return boundaries;
  }, [] as string[])
  .action(async (branch: string, agentId?: string, options?: { 
    autoAccept: boolean;
    env?: Record<string, string>;
    task?: string;
    service?: Record<string, string>;
    boundary?: string[];
  }) => {
    const spinner = ora('Creating agent...').start();
    
    try {
      const result = await agentManager.createAgent({
        branch,
        agentId,
        autoAccept: options?.autoAccept,
        environment: options?.task ? { ...options.env, AGENT_TASK: options.task } : options?.env,
        context: {
          task: options?.task,
          services: options?.service,
          boundaries: options?.boundary
        }
      });

      if (result.success && result.data) {
        spinner.succeed(chalk.green(result.message));
        console.log(chalk.blue('Agent Details:'));
        console.log(`  ID: ${chalk.yellow(result.data.agentId)}`);
        console.log(`  Branch: ${chalk.yellow(result.data.branch)}`);
        console.log(`  Worktree: ${chalk.gray(result.data.worktreePath)}`);
        console.log(`  Tmux Session: ${chalk.gray(result.data.tmuxSession)}`);
        console.log('');
        console.log(chalk.blue('Next steps:'));
        console.log(`  ${chalk.white('magents attach')} ${chalk.yellow(result.data.agentId)}`);
        console.log(`  ${chalk.white('magents stop')} ${chalk.yellow(result.data.agentId)}`);
      } else {
        spinner.fail(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create agent: ${error instanceof Error ? error.message : String(error)}`));
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
      console.log(chalk.yellow('No active agents found'));
      return;
    }

    console.log(chalk.blue('Active Claude Code agents:'));
    console.log('');
    
    // Table header
    console.log(chalk.white.bold(
      '  Agent ID'.padEnd(20) +
      'Branch'.padEnd(25) +
      'Status'.padEnd(12) +
      'Worktree Path'
    ));
    console.log(chalk.gray('  ' + '─'.repeat(80)));
    
    agents.forEach(agent => {
      const statusColor = agent.status === 'RUNNING' ? chalk.green : 
                         agent.status === 'STOPPED' ? chalk.yellow : chalk.red;
      
      console.log(
        `  ${chalk.yellow(agent.id.padEnd(18))} ` +
        `${chalk.white(agent.branch.padEnd(23))} ` +
        `${statusColor(agent.status.padEnd(10))} ` +
        `${chalk.gray(agent.worktreePath)}`
      );
      
      // Show task if present
      if (agent.environment?.AGENT_TASK || agent.context?.task) {
        const task = agent.environment?.AGENT_TASK || agent.context?.task || '';
        console.log(`    ${chalk.cyan('Task:')} ${chalk.white(task)}`);
      }
    });
    
    console.log('');
    console.log(chalk.blue(`Total: ${agents.length} agent${agents.length !== 1 ? 's' : ''}`));
  });

// Attach command
program
  .command('attach')
  .description('Attach to an existing agent\'s tmux session')
  .argument('<agent-id>', 'Agent ID to attach to')
  .action(async (agentId: string) => {
    const spinner = ora(`Attaching to agent '${agentId}'...`).start();
    
    try {
      const result = await agentManager.attachToAgent(agentId);
      
      if (result.success) {
        spinner.stop();
        // The attach process will take over the terminal
      } else {
        spinner.fail(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to attach: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Stop command
program
  .command('stop')
  .description('Stop an agent and optionally remove its worktree')
  .argument('<agent-id>', 'Agent ID to stop')
  .option('-r, --remove-worktree', 'Remove the worktree as well')
  .action(async (agentId: string, options: { removeWorktree?: boolean }) => {
    let removeWorktree = options.removeWorktree || false;
    
    // Ask about worktree removal if not specified
    if (!options.removeWorktree) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'removeWorktree',
          message: 'Do you want to remove the worktree as well?',
          default: false
        }
      ]);
      removeWorktree = answer.removeWorktree;
    }
    
    const spinner = ora(`Stopping agent '${agentId}'...`).start();
    
    try {
      const result = await agentManager.stopAgent(agentId, removeWorktree);
      
      if (result.success) {
        spinner.succeed(chalk.green(result.message));
      } else {
        spinner.fail(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Stop all agents and clean up')
  .option('-r, --remove-worktrees', 'Remove all worktrees as well')
  .action(async (options: { removeWorktrees?: boolean }) => {
    const agents = agentManager.getActiveAgents();
    
    if (agents.length === 0) {
      console.log(chalk.yellow('No active agents to cleanup'));
      return;
    }
    
    console.log(chalk.yellow(`This will stop ${agents.length} active agent${agents.length !== 1 ? 's' : ''}:`));
    agents.forEach(agent => {
      console.log(`  ${chalk.yellow(agent.id)} (${agent.branch})`);
    });
    console.log('');
    
    const confirmCleanup = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue with cleanup?',
        default: false
      }
    ]);
    
    if (!confirmCleanup.proceed) {
      console.log(chalk.blue('Cleanup cancelled'));
      return;
    }
    
    let removeWorktrees = options.removeWorktrees || false;
    
    if (!options.removeWorktrees) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'removeWorktrees',
          message: 'Remove all worktrees as well?',
          default: false
        }
      ]);
      removeWorktrees = answer.removeWorktrees;
    }
    
    const spinner = ora('Cleaning up all agents...').start();
    
    try {
      const result = await agentManager.cleanupAllAgents(removeWorktrees);
      
      if (result.success) {
        spinner.succeed(chalk.green(result.message));
      } else {
        spinner.warn(chalk.yellow(result.message));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize configuration')
  .action(() => {
    const spinner = ora('Initializing magents configuration...').start();
    
    try {
      configManager.initializeConfig();
      spinner.succeed(chalk.green('Configuration initialized successfully!'));
      
      const configPath = configManager.getConfigPath();
      console.log(chalk.blue('Configuration file:'), chalk.gray(configPath));
      console.log(chalk.blue('Agents directory:'), chalk.gray(configManager.getAgentsDir()));
      console.log('');
      console.log(chalk.blue('Quick start:'));
      console.log(`  ${chalk.white('magents create')} ${chalk.yellow('feature/my-feature')}`);
      console.log(`  ${chalk.white('magents list')}`);
      console.log(`  ${chalk.white('magents attach')} ${chalk.yellow('<agent-id>')}`);
    } catch (error) {
      spinner.fail(chalk.red(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('View or edit configuration')
  .option('-e, --edit', 'Edit configuration interactively')
  .action(async (options: { edit?: boolean }) => {
    const config = configManager.loadConfig();
    
    if (options.edit) {
      console.log(chalk.blue('Current Configuration:'));
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${key}: ${chalk.yellow(String(value))}`);
      });
      console.log('');
      
      const answers = await inquirer.prompt([
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
      console.log(chalk.green('Configuration updated successfully!'));
    } else {
      console.log(chalk.blue('Current Configuration:'));
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${chalk.white(key)}: ${chalk.yellow(String(value))}`);
      });
      console.log('');
      console.log(chalk.gray(`Config file: ${configManager.getConfigPath()}`));
    }
  });

program.parse();