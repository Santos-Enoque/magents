import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Agent, AgentRecord, CreateAgentOptions, CommandResult, AgentStatus, CreateAgentResult, CleanupResult } from '../types';
import { ConfigManager } from '../config/ConfigManager';
import { GitService } from './GitService';
import { ui } from '../ui/UIService';

// Extended agent type for Docker agents
interface DockerAgent extends Agent {
  containerName: string;
  repoRoot: string;
}

/**
 * Docker-based Agent Manager for Magents
 * Creates and manages AI agents as Docker containers
 */
export class DockerAgentManager {
  private configManager: ConfigManager;
  private gitService: GitService;
  private activeAgentsFile: string;
  private dockerImage: string;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.gitService = new GitService();
    this.activeAgentsFile = path.join(this.configManager.getAgentsDir(), 'docker_agents.json');
    const config = this.configManager.loadConfig();
    // Always check for Claude auth volume to determine image
    this.dockerImage = config.DOCKER_IMAGE || 'magents/agent:latest';
  }

  // Compatibility method for CLI that might check for TmuxService
  public getTmuxService(): any {
    return {
      listSessions: () => this.getActiveAgents().map(a => a.tmuxSession),
      sessionExists: (session: string) => {
        const containerName = session; // tmuxSession is containerName for Docker agents
        return this.getContainerStatus(containerName) === 'RUNNING';
      }
    };
  }

  public async createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>> {
    try {
      const config = this.configManager.loadConfig();
      const agentId = options.agentId || `agent-${Date.now()}`;
      
      // Check if agent already exists
      if (this.agentExists(agentId)) {
        return {
          success: false,
          message: `Agent '${agentId}' already exists`
        };
      }

      // Check max agents limit
      const activeAgents = this.getActiveAgents();
      if (activeAgents.length >= config.MAX_AGENTS) {
        return {
          success: false,
          message: `Maximum number of agents (${config.MAX_AGENTS}) reached`
        };
      }

      const repoRoot = options.projectPath || this.gitService.getRepoRoot();
      const containerName = `magents-${agentId}`;

      // Prepare shared volumes
      const sharedConfigDir = path.join(this.configManager.getAgentsDir(), 'shared-config');
      const agentStateDir = path.join(this.configManager.getAgentsDir(), agentId);
      
      // Create directories
      this.ensureDirectory(sharedConfigDir);
      this.ensureDirectory(agentStateDir);

      // Copy configurations to shared directory
      await this.setupSharedConfiguration(repoRoot, sharedConfigDir);

      // Build docker run command
      const dockerCmd = this.buildDockerCommand({
        containerName,
        agentId,
        branch: options.branch,
        repoRoot,
        sharedConfigDir,
        agentStateDir,
        apiKeys: this.getApiKeys()
      });

      // Start the container
      ui.info(`Starting Docker container for agent '${agentId}'...`);
      execSync(dockerCmd);

      // Wait for container to be healthy
      await this.waitForHealthy(containerName);

      // Record the agent
      this.recordAgent({
        id: agentId,
        branch: options.branch,
        worktreePath: repoRoot,
        tmuxSession: containerName,
        containerName,
        repoRoot,
        status: 'RUNNING',
        createdAt: new Date()
      });

      return {
        success: true,
        message: `Docker agent '${agentId}' created successfully!`,
        data: {
          agentId,
          branch: options.branch,
          worktreePath: repoRoot, // For compatibility
          tmuxSession: containerName // For compatibility
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create Docker agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public getActiveAgents(): Agent[] {
    if (!fs.existsSync(this.activeAgentsFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.activeAgentsFile, 'utf8');
      const records = JSON.parse(content) as any[];
      
      return records.map(record => ({
        id: record.id,
        branch: record.branch,
        status: this.getContainerStatus(record.containerName),
        worktreePath: record.repoRoot, // For compatibility
        tmuxSession: record.containerName, // For compatibility
        createdAt: new Date(record.createdAt),
        useDocker: true
      } as Agent));
    } catch {
      return [];
    }
  }

  public async attachToAgent(agentId: string): Promise<CommandResult> {
    const agents = this.getActiveAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return {
        success: false,
        message: `Agent '${agentId}' not found`
      };
    }

    try {
      // For Docker agents, tmuxSession is the container name
      const containerName = agent.tmuxSession;
      
      // Check if container is running
      const status = this.getContainerStatus(containerName);
      if (status !== 'RUNNING') {
        // Restart container
        execSync(`docker start ${containerName}`);
        await this.waitForHealthy(containerName);
      }

      // Attach to container
      ui.info(`Attaching to Docker agent '${agentId}'...`);
      ui.info(`Run 'exit' to detach from the agent without stopping it.`);
      
      // This will replace current process with docker attach
      execSync(`docker exec -it ${containerName} bash`, { stdio: 'inherit' });

      return {
        success: true,
        message: `Detached from agent '${agentId}'`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to attach to agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async stopAgent(agentId: string, removeContainer: boolean = false): Promise<CommandResult> {
    const agents = this.getActiveAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return {
        success: false,
        message: `Agent '${agentId}' not found`
      };
    }

    try {
      // For Docker agents, tmuxSession is the container name
      const containerName = agent.tmuxSession;
      
      // Stop container
      execSync(`docker stop ${containerName}`, { stdio: 'pipe' });

      // Remove container if requested
      if (removeContainer) {
        execSync(`docker rm ${containerName}`, { stdio: 'pipe' });
      }

      // Update agent record
      this.updateAgentStatus(agentId, removeContainer ? 'REMOVED' : 'STOPPED');

      return {
        success: true,
        message: `Agent '${agentId}' ${removeContainer ? 'removed' : 'stopped'}`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async cleanupAllAgents(removeContainers: boolean = false): Promise<CommandResult<CleanupResult>> {
    const agents = this.getActiveAgents();

    if (agents.length === 0) {
      return {
        success: true,
        message: 'No active Docker agents to cleanup'
      };
    }

    let stopped = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        // For Docker agents, tmuxSession is the container name
        const containerName = agent.tmuxSession;
        
        // Stop container
        execSync(`docker stop ${containerName}`, { stdio: 'pipe' });

        // Remove container if requested
        if (removeContainers) {
          execSync(`docker rm ${containerName}`, { stdio: 'pipe' });
        }

        stopped++;
      } catch (error) {
        errors.push(`Failed to stop ${agent.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clear or update agents file
    if (removeContainers) {
      fs.writeFileSync(this.activeAgentsFile, '[]');
    } else {
      // Update all agents to stopped status
      const agents = this.getActiveAgents();
      agents.forEach(agent => agent.status = 'STOPPED');
      fs.writeFileSync(this.activeAgentsFile, JSON.stringify(agents, null, 2));
    }

    return {
      success: errors.length === 0,
      message: `Stopped ${stopped} Docker agents${removeContainers ? ' and removed containers' : ''}${errors.length > 0 ? `. Errors: ${errors.join(', ')}` : ''}`,
      data: { stopped, errors }
    };
  }

  private buildDockerCommand(options: {
    containerName: string;
    agentId: string;
    branch: string;
    repoRoot: string;
    sharedConfigDir: string;
    agentStateDir: string;
    apiKeys: Record<string, string>;
  }): string {
    const envVars = Object.entries(options.apiKeys)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    // Check if we should use the Claude bridge
    const bridgeSocket = '/tmp/claude-bridge-persistent/claude-bridge.sock';
    const bridgeMount = fs.existsSync(bridgeSocket) 
      ? `-v ${bridgeSocket}:/host/claude-bridge.sock`
      : '';

    // Check if Claude authentication volume exists
    const hasClaudeAuth = this.checkClaudeAuthVolume();
    const claudeAuthVolume = hasClaudeAuth 
      ? `-v claude-container-auth:/home/magents`
      : '';

    // Only set bridge socket if we don't have Claude auth
    const bridgeEnv = !hasClaudeAuth && bridgeMount
      ? `-e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock`
      : '';

    // Use Claude-enabled image if auth volume exists
    const dockerImage = hasClaudeAuth ? 'magents/claude:dev' : this.dockerImage;
    
    // For Claude image, we need to override the entrypoint
    const entrypointOverride = hasClaudeAuth ? '--entrypoint /bin/bash' : '';
    
    // Command to keep container running
    const runCommand = hasClaudeAuth ? '-c "while true; do sleep 3600; done"' : 'tail -f /dev/null';

    return `docker run -d \
      --name ${options.containerName} \
      --label magents.agent.id=${options.agentId} \
      --label magents.agent.branch=${options.branch} \
      -v "${options.repoRoot}:/workspace" \
      -v "${options.sharedConfigDir}:/shared" \
      -v "${options.agentStateDir}:/agent" \
      ${claudeAuthVolume} \
      ${bridgeMount} \
      -e AGENT_ID="${options.agentId}" \
      -e AGENT_BRANCH="${options.branch}" \
      ${bridgeEnv} \
      ${envVars} \
      ${entrypointOverride} \
      ${dockerImage} \
      ${runCommand}`;
  }

  private getApiKeys(): Record<string, string> {
    const keys: Record<string, string> = {};
    
    // Get API keys from environment
    const apiKeyVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'PERPLEXITY_API_KEY',
      'GOOGLE_API_KEY',
      'MISTRAL_API_KEY'
    ];

    apiKeyVars.forEach(key => {
      const value = process.env[key];
      if (value) {
        keys[key] = value;
      }
    });

    return keys;
  }

  private async setupSharedConfiguration(sourceRepo: string, sharedConfigDir: string): Promise<void> {
    // Copy Task Master configuration
    const taskMasterSource = path.join(sourceRepo, '.taskmaster');
    const taskMasterDest = path.join(sharedConfigDir, '.taskmaster');
    
    if (fs.existsSync(taskMasterSource)) {
      this.copyDirectory(taskMasterSource, taskMasterDest);
      ui.muted('  ✓ Copied Task Master configuration');
    }

    // Copy CLAUDE.md
    const claudeMdSource = path.join(sourceRepo, 'CLAUDE.md');
    const claudeMdDest = path.join(sharedConfigDir, 'CLAUDE.md');
    
    if (fs.existsSync(claudeMdSource)) {
      fs.copyFileSync(claudeMdSource, claudeMdDest);
      ui.muted('  ✓ Copied CLAUDE.md');
    }

    // Copy MCP configuration
    const mcpSource = path.join(sourceRepo, '.mcp.json');
    const mcpDest = path.join(sharedConfigDir, '.mcp.json');
    
    if (fs.existsSync(mcpSource)) {
      fs.copyFileSync(mcpSource, mcpDest);
      ui.muted('  ✓ Copied MCP configuration');
    }
  }

  private copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    });
  }

  private getContainerStatus(containerName: string): AgentStatus {
    try {
      const result = execSync(`docker inspect ${containerName} --format='{{.State.Status}}'`, { 
        encoding: 'utf8',
        stdio: 'pipe' 
      }).trim();
      
      return result === 'running' ? 'RUNNING' : 'STOPPED';
    } catch {
      return 'STOPPED';
    }
  }

  private async waitForHealthy(containerName: string, timeout: number = 30000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        // First check if container is running
        const status = execSync(
          `docker inspect ${containerName} --format='{{.State.Status}}'`,
          { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
        
        if (status !== 'running') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Then check health if available
        try {
          const health = execSync(
            `docker inspect ${containerName} --format='{{.State.Health.Status}}'`,
            { encoding: 'utf8', stdio: 'pipe' }
          ).trim();
          
          // If healthy, we're good
          if (health === 'healthy') {
            return;
          }
        } catch (healthError) {
          // No health check configured - that's OK, container is running
          return;
        }
      } catch {
        // Container might not exist yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Container ${containerName} did not become healthy within ${timeout}ms`);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private agentExists(agentId: string): boolean {
    const agents = this.getActiveAgents();
    return agents.some(agent => agent.id === agentId);
  }

  private recordAgent(agent: AgentRecord & { containerName: string; repoRoot: string; status: string; createdAt: Date }): void {
    const existingRecords = fs.existsSync(this.activeAgentsFile) 
      ? JSON.parse(fs.readFileSync(this.activeAgentsFile, 'utf8')) 
      : [];
    existingRecords.push(agent);
    fs.writeFileSync(this.activeAgentsFile, JSON.stringify(existingRecords, null, 2));
  }

  private updateAgentStatus(agentId: string, status: string): void {
    const agents = this.getActiveAgents();
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      agent.status = status as AgentStatus;
      fs.writeFileSync(this.activeAgentsFile, JSON.stringify(agents, null, 2));
    }
  }

  private checkClaudeAuthVolume(): boolean {
    try {
      const result = execSync('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  private checkClaudeAuthVolumeStatic(): boolean {
    try {
      const result = execSync('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }
}