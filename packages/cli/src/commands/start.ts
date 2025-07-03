import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ui } from '../ui/UIService';
import { ConfigManager } from '../config/ConfigManager';
import { AgentManager } from '../services/AgentManager';
import { DockerAgentManager } from '../services/DockerAgentManager';
import { execSync, spawn } from 'child_process';
import inquirer from 'inquirer';

export interface StartOptions {
  agent?: string;
  all?: boolean;
  docker?: boolean;
  resources?: {
    cpu?: string;
    memory?: string;
    disk?: string;
  };
  network?: string;
  volumes?: string[];
  env?: string[];
  healthCheck?: boolean;
  restart?: string;
  detach?: boolean;
  logs?: boolean;
  shell?: boolean;
  dryRun?: boolean;
}

export interface ContainerStatus {
  id: string;
  name: string;
  status: string;
  health?: string;
  cpu?: string;
  memory?: string;
  created: string;
  ports?: string[];
}

export class StartCommand {
  private configManager: ConfigManager;
  private agentManager: AgentManager;
  private dockerManager: DockerAgentManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.agentManager = new AgentManager();
    this.dockerManager = new DockerAgentManager();
  }

  public async execute(agentId?: string, options: StartOptions = {}): Promise<void> {
    try {
      // Check if Docker is available
      if (options.docker || this.configManager.loadConfig().DOCKER_ENABLED) {
        const dockerAvailable = await this.checkDocker();
        if (!dockerAvailable) {
          ui.error('Docker is not available. Please install Docker.');
          process.exit(1);
        }
      }

      // Handle different start scenarios
      if (options.all) {
        await this.startAllAgents(options);
      } else if (agentId) {
        await this.startSpecificAgent(agentId, options);
      } else {
        // Interactive mode - select agent to start
        await this.startInteractive(options);
      }

    } catch (error) {
      ui.error(`Failed to start agent: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async checkDocker(): Promise<boolean> {
    try {
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async startAllAgents(options: StartOptions): Promise<void> {
    const agents = this.agentManager.getActiveAgents();
    const stoppedAgents = agents.filter(a => a.status !== 'RUNNING');

    if (stoppedAgents.length === 0) {
      ui.info('All agents are already running');
      return;
    }

    ui.header(`Starting ${stoppedAgents.length} agents`);

    for (const agent of stoppedAgents) {
      await this.startAgent(agent, options);
    }

    ui.success(`Started ${stoppedAgents.length} agents`);
  }

  private async startSpecificAgent(agentId: string, options: StartOptions): Promise<void> {
    const agents = this.agentManager.getActiveAgents();
    const agent = agents.find(a => a.id === agentId || a.id.startsWith(agentId));

    if (!agent) {
      ui.error(`Agent '${agentId}' not found`);
      
      // Suggest creating the agent
      const create = await inquirer.prompt([{
        type: 'confirm',
        name: 'create',
        message: `Would you like to create agent '${agentId}'?`,
        default: true
      }]);

      if (create.create) {
        ui.info('Redirecting to create command...');
        execSync(`node ${__dirname}/../../bin/magents.js create ${agentId} --docker`, { stdio: 'inherit' });
      }
      return;
    }

    if (agent.status === 'RUNNING') {
      ui.info(`Agent '${agent.id}' is already running`);
      
      if (options.logs) {
        await this.showLogs(agent, options);
      } else if (options.shell) {
        await this.attachShell(agent, options);
      } else {
        const action = await inquirer.prompt([{
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Attach to agent', value: 'attach' },
            { name: 'View logs', value: 'logs' },
            { name: 'Open shell', value: 'shell' },
            { name: 'Restart agent', value: 'restart' },
            { name: 'Cancel', value: 'cancel' }
          ]
        }]);

        switch (action.action) {
          case 'attach':
            execSync(`node ${__dirname}/../../bin/magents.js attach ${agent.id}`, { stdio: 'inherit' });
            break;
          case 'logs':
            await this.showLogs(agent, options);
            break;
          case 'shell':
            await this.attachShell(agent, options);
            break;
          case 'restart':
            await this.restartAgent(agent, options);
            break;
        }
      }
      return;
    }

    await this.startAgent(agent, options);
  }

  private async startInteractive(options: StartOptions): Promise<void> {
    const agents = this.agentManager.getActiveAgents();
    
    if (agents.length === 0) {
      ui.warning('No agents found');
      const create = await inquirer.prompt([{
        type: 'confirm',
        name: 'create',
        message: 'Would you like to create a new agent?',
        default: true
      }]);

      if (create.create) {
        execSync(`node ${__dirname}/../../bin/magents.js create`, { stdio: 'inherit' });
      }
      return;
    }

    const stoppedAgents = agents.filter(a => a.status !== 'RUNNING');
    
    if (stoppedAgents.length === 0) {
      ui.info('All agents are already running');
      
      const choices = agents.map(a => ({
        name: `${a.id} (${a.branch}) - Running`,
        value: a.id
      }));

      const selected = await inquirer.prompt([{
        type: 'list',
        name: 'agent',
        message: 'Select an agent to manage:',
        choices: [...choices, { name: 'Cancel', value: null as string | null }]
      }]);

      if (selected.agent) {
        await this.startSpecificAgent(selected.agent, options);
      }
      return;
    }

    const choices: Array<{name: string, value: string | null}> = stoppedAgents.map(a => ({
      name: `${a.id} (${a.branch}) - Stopped`,
      value: a.id
    }));

    choices.push({ name: 'Start all stopped agents', value: 'all' });
    choices.push({ name: 'Cancel', value: null });

    const selected = await inquirer.prompt([{
      type: 'list',
      name: 'agent',
      message: 'Select agent to start:',
      choices
    }]);

    if (selected.agent === 'all') {
      await this.startAllAgents(options);
    } else if (selected.agent) {
      await this.startSpecificAgent(selected.agent, options);
    }
  }

  private async startAgent(agent: any, options: StartOptions): Promise<void> {
    if (options.dryRun) {
      ui.header('Dry Run - Agent Start Preview');
      ui.keyValue('Agent ID', agent.id);
      ui.keyValue('Agent Branch', agent.branch);
      ui.keyValue('Mode', 'Docker');
      
      ui.keyValue('Container Name', `magents-${agent.id}`);
      ui.keyValue('Docker Image', this.configManager.loadConfig().DOCKER_IMAGE || 'magents/agent:latest');
      if (options.resources?.cpu) ui.keyValue('CPU Limit', options.resources.cpu);
      if (options.resources?.memory) ui.keyValue('Memory Limit', options.resources.memory);
      if (options.network) ui.keyValue('Network', options.network);
      if (options.volumes && options.volumes.length > 0) {
        ui.keyValue('Additional Volumes', options.volumes.join(', '));
      }
      if (options.env && options.env.length > 0) {
        ui.keyValue('Environment Variables', options.env.join(', '));
      }
      if (options.restart) ui.keyValue('Restart Policy', options.restart);
      
      ui.info('Use without --dry-run to start the agent');
      return;
    }

    const spinner = ui.spinner(`Starting agent '${agent.id}'...`);
    spinner.start();

    try {
      await this.startDockerAgent(agent, options);

      spinner.succeed(`Agent '${agent.id}' started successfully`);

      // Show connection info
      ui.divider('Connection Info');
      ui.command(`magents attach ${agent.id}`, 'Connect to agent');
      ui.command(`docker logs magents-${agent.id}`, 'View container logs');
      ui.command(`docker exec -it magents-${agent.id} bash`, 'Open shell in container');

    } catch (error) {
      spinner.fail(`Failed to start agent '${agent.id}'`);
      throw error;
    }
  }

  private async startDockerAgent(agent: any, options: StartOptions): Promise<void> {
    const containerName = `magents-${agent.id}`;
    
    // Check if container exists
    try {
      const containerInfo = execSync(`docker inspect ${containerName} --format='{{.State.Status}}'`, {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      if (containerInfo === 'running') {
        ui.info('Container is already running');
        return;
      }

      // Start existing container
      execSync(`docker start ${containerName}`, { stdio: 'pipe' });
      
      // Wait for container to be ready
      await this.waitForContainer(containerName);

    } catch (error) {
      // Container doesn't exist, create it
      ui.muted('Container not found, creating new one...');
      
      // Build docker run command with options
      const dockerCmd = this.buildDockerRunCommand(agent, containerName, options);
      
      execSync(dockerCmd, { stdio: 'pipe' });
      
      // Wait for container to be ready
      await this.waitForContainer(containerName);
    }

    // Apply resource limits if specified
    if (options.resources) {
      await this.applyResourceLimits(containerName, options.resources);
    }

    // Set up health check if requested
    if (options.healthCheck) {
      await this.setupHealthCheck(containerName);
    }
  }

  private buildDockerRunCommand(agent: any, containerName: string, options: StartOptions): string {
    const config = this.configManager.loadConfig();
    const dockerImage = config.DOCKER_IMAGE || 'magents/agent:latest';
    
    let cmd = `docker run -d --name ${containerName}`;
    
    // Add labels
    cmd += ` --label magents.agent.id=${agent.id}`;
    cmd += ` --label magents.agent.branch=${agent.branch}`;
    
    // Add volumes
    cmd += ` -v "${agent.worktreePath}:/workspace"`;
    
    // Add Claude auth volume if exists
    const hasClaudeAuth = this.checkClaudeAuthVolume();
    if (hasClaudeAuth) {
      cmd += ` -v claude-container-auth:/home/magents`;
    }
    
    // Add custom volumes
    if (options.volumes) {
      options.volumes.forEach(v => {
        cmd += ` -v "${v}"`;
      });
    }
    
    // Add network
    if (options.network) {
      cmd += ` --network ${options.network}`;
    }
    
    // Add environment variables
    cmd += ` -e AGENT_ID="${agent.id}"`;
    cmd += ` -e AGENT_BRANCH="${agent.branch}"`;
    
    if (options.env) {
      options.env.forEach(e => {
        cmd += ` -e "${e}"`;
      });
    }
    
    // Add restart policy
    if (options.restart) {
      cmd += ` --restart ${options.restart}`;
    }
    
    // Add resource limits
    if (options.resources?.cpu) {
      cmd += ` --cpus="${options.resources.cpu}"`;
    }
    if (options.resources?.memory) {
      cmd += ` --memory="${options.resources.memory}"`;
    }
    
    // Override entrypoint for Claude image
    if (hasClaudeAuth && dockerImage.includes('claude')) {
      cmd += ` --entrypoint /bin/bash`;
      cmd += ` ${dockerImage}`;
      cmd += ` -c "while true; do sleep 3600; done"`;
    } else {
      cmd += ` ${dockerImage}`;
    }
    
    return cmd;
  }


  private async waitForContainer(containerName: string, timeout: number = 30000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const status = execSync(`docker inspect ${containerName} --format='{{.State.Status}}'`, {
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();
        
        if (status === 'running') {
          return;
        }
      } catch {
        // Container might not exist yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Container ${containerName} did not start within ${timeout}ms`);
  }

  private checkClaudeAuthVolume(): boolean {
    try {
      execSync('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  private async applyResourceLimits(containerName: string, resources: any): Promise<void> {
    try {
      if (resources.cpu) {
        execSync(`docker update --cpus="${resources.cpu}" ${containerName}`, { stdio: 'pipe' });
      }
      if (resources.memory) {
        execSync(`docker update --memory="${resources.memory}" ${containerName}`, { stdio: 'pipe' });
      }
      ui.muted('Applied resource limits');
    } catch (error) {
      ui.warning('Failed to apply some resource limits');
    }
  }

  private async setupHealthCheck(containerName: string): Promise<void> {
    // Docker doesn't support adding health checks to running containers
    // This would need to be part of the image or docker run command
    ui.muted('Health check should be configured in Docker image');
  }

  private async showLogs(agent: any, options: StartOptions): Promise<void> {
    const containerName = `magents-${agent.id}`;
    const follow = options.detach ? '' : '-f';
    
    spawn('docker', ['logs', follow, containerName], { stdio: 'inherit' });
  }

  private async attachShell(agent: any, options: StartOptions): Promise<void> {
    const containerName = `magents-${agent.id}`;
    spawn('docker', ['exec', '-it', containerName, 'bash'], { stdio: 'inherit' });
  }

  private async restartAgent(agent: any, options: StartOptions): Promise<void> {
    const spinner = ui.spinner(`Restarting agent '${agent.id}'...`);
    spinner.start();

    try {
      const containerName = `magents-${agent.id}`;
      execSync(`docker restart ${containerName}`, { stdio: 'pipe' });
      await this.waitForContainer(containerName);

      spinner.succeed(`Agent '${agent.id}' restarted successfully`);
    } catch (error) {
      spinner.fail(`Failed to restart agent '${agent.id}'`);
      throw error;
    }
  }

  public async getContainerStatus(containerName: string): Promise<ContainerStatus | null> {
    try {
      const format = '{{json .}}';
      const output = execSync(`docker inspect ${containerName} --format='${format}'`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const data = JSON.parse(output);
      
      return {
        id: data.Id.substring(0, 12),
        name: data.Name.substring(1), // Remove leading /
        status: data.State.Status,
        health: data.State.Health?.Status,
        created: new Date(data.Created).toLocaleString(),
        ports: data.NetworkSettings?.Ports ? Object.keys(data.NetworkSettings.Ports) : []
      };
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const startCommand = new StartCommand();