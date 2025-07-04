import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Agent, AgentRecord, CreateAgentOptions, CommandResult, AgentStatus, CreateAgentResult, CleanupResult } from '../types';
import { ConfigManager } from '../config/ConfigManager';
import { GitService } from './GitService';
import { ui } from '../ui/UIService';
import { createHash } from 'crypto';
import { UnifiedDatabaseService, UnifiedProjectData } from '@magents/shared';

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
  private databaseService: UnifiedDatabaseService;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.gitService = new GitService();
    this.activeAgentsFile = path.join(this.configManager.getAgentsDir(), 'docker_agents.json');
    const config = this.configManager.loadConfig();
    // Always check for Claude auth volume to determine image
    this.dockerImage = config.DOCKER_IMAGE || 'magents/agent:latest';
    this.databaseService = new UnifiedDatabaseService();
  }

  /**
   * Generate a consistent project ID based on the project path
   */
  private generateProjectId(projectPath: string): string {
    const normalizedPath = path.resolve(projectPath);
    const projectName = path.basename(normalizedPath);
    // Create a short hash from the full path for uniqueness
    const hash = createHash('md5').update(normalizedPath).digest('hex').substring(0, 8);
    return `${projectName}-${hash}`;
  }

  /**
   * Detect if a project exists in the database
   */
  private async detectExistingProject(projectPath: string): Promise<UnifiedProjectData | null> {
    try {
      await this.databaseService.initialize();
      const normalizedPath = path.resolve(projectPath);
      
      // First try to find by exact path match
      const projectByPath = await this.databaseService.projects.findBy({ path: normalizedPath });
      if (projectByPath.length > 0) {
        return projectByPath[0];
      }

      // If not found by path, try to find by generated project ID
      const projectId = this.generateProjectId(normalizedPath);
      const project = await this.databaseService.projects.findById(projectId);
      return project;
    } catch (error) {
      ui.info(`Could not check for existing project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Auto-create a project for the given path
   */
  private async autoCreateProject(projectPath: string): Promise<UnifiedProjectData> {
    await this.databaseService.initialize();
    
    const normalizedPath = path.resolve(projectPath);
    const projectName = path.basename(normalizedPath);
    const projectId = this.generateProjectId(normalizedPath);

    // Check if it's a git repository
    let gitRepository;
    try {
      // Try to get git info using execSync
      const { execSync } = require('child_process');
      const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
        cwd: normalizedPath, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      let gitRemote;
      try {
        gitRemote = execSync('git config --get remote.origin.url', { 
          cwd: normalizedPath, 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      } catch {
        gitRemote = undefined;
      }
      
      gitRepository = {
        branch: gitBranch,
        remote: gitRemote,
        isClean: true,
      };
    } catch (error) {
      // Not a git repository or git commands failed
      gitRepository = undefined;
    }

    // Detect project type
    const projectType = this.detectProjectType(normalizedPath);

    const projectData: UnifiedProjectData = {
      id: projectId,
      name: projectName,
      path: normalizedPath,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      gitRepository,
      agentIds: [],
      maxAgents: 10,
      taskMasterEnabled: false,
      projectType,
      description: `Auto-created project for ${projectName}`,
      tags: ['auto-created'],
      metadata: {
        autoCreated: true,
        createdBy: 'docker-agent-manager',
      },
    };

    try {
      const createdProject = await this.databaseService.projects.create(projectData);
      ui.success(`✓ Auto-created project '${projectName}' (${projectId})`);
      return createdProject;
    } catch (error) {
      ui.error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Detect project type based on files in the directory
   */
  private detectProjectType(projectPath: string): UnifiedProjectData['projectType'] {
    const now = new Date();
    
    try {
      // Check for package.json (Node.js)
      if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
        const frameworks = [];
        
        // Detect common frameworks
        if (packageJson.dependencies || packageJson.devDependencies) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          if (deps.react) frameworks.push('React');
          if (deps.vue) frameworks.push('Vue');
          if (deps.angular) frameworks.push('Angular');
          if (deps.express) frameworks.push('Express');
          if (deps.next) frameworks.push('Next.js');
        }

        let packageManager = 'npm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) packageManager = 'yarn';
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) packageManager = 'pnpm';

        return {
          type: 'node',
          packageManager,
          frameworks,
          detectedAt: now,
        };
      }

      // Check for requirements.txt or pyproject.toml (Python)
      if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
          fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
        return {
          type: 'python',
          frameworks: [],
          detectedAt: now,
        };
      }

      // Check for Cargo.toml (Rust)
      if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
        return {
          type: 'rust',
          frameworks: [],
          detectedAt: now,
        };
      }

      // Check for go.mod (Go)
      if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
        return {
          type: 'go',
          frameworks: [],
          detectedAt: now,
        };
      }

      // Check for pom.xml or build.gradle (Java)
      if (fs.existsSync(path.join(projectPath, 'pom.xml')) || 
          fs.existsSync(path.join(projectPath, 'build.gradle'))) {
        return {
          type: 'java',
          frameworks: [],
          detectedAt: now,
        };
      }

      // Default to unknown
      return {
        type: 'unknown',
        frameworks: [],
        detectedAt: now,
      };
    } catch (error) {
      return {
        type: 'unknown',
        frameworks: [],
        detectedAt: now,
      };
    }
  }

  /**
   * Get or create project for the given path
   */
  private async getOrCreateProject(projectPath: string): Promise<{ project: UnifiedProjectData; wasCreated: boolean }> {
    // First try to detect existing project
    const existingProject = await this.detectExistingProject(projectPath);
    if (existingProject) {
      return { project: existingProject, wasCreated: false };
    }

    // Create new project
    const newProject = await this.autoCreateProject(projectPath);
    return { project: newProject, wasCreated: true };
  }

  /**
   * Update project to include the agent in its agentIds array
   */
  private async updateProjectWithAgent(projectId: string, agentId: string): Promise<void> {
    await this.databaseService.initialize();
    
    const project = await this.databaseService.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Add agent to project if not already present
    const agentIds = project.agentIds || [];
    if (!agentIds.includes(agentId)) {
      agentIds.push(agentId);
      
      await this.databaseService.projects.update(projectId, {
        agentIds,
        updatedAt: new Date(),
      });
      
      ui.info(`🔗 Linked agent ${agentId} to project ${project.name}`);
    }
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
      
      // Auto-detect or create project if projectId not provided
      let projectId = options.projectId;
      let project: UnifiedProjectData | undefined;
      let wasProjectCreated = false;
      
      if (!projectId) {
        const result = await this.getOrCreateProject(repoRoot);
        project = result.project;
        projectId = project.id;
        wasProjectCreated = result.wasCreated;
        
        if (wasProjectCreated) {
          ui.info(`📁 Created new project: ${project.name} (${project.id})`);
        } else {
          ui.info(`📁 Using existing project: ${project.name} (${project.id})`);
        }
      }
      
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
        projectId,
        containerName,
        repoRoot,
        status: 'RUNNING',
        createdAt: new Date()
      });

      // Update project to include this agent
      try {
        await this.updateProjectWithAgent(projectId, agentId);
      } catch (error) {
        ui.info(`Could not update project with agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

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
      
      return records.map(record => {
        // Handle both old format (with tmuxSession) and new format (with containerName)
        const containerName = record.containerName || record.tmuxSession;
        const worktreePath = record.worktreePath || record.repoRoot;
        
        return {
          id: record.id,
          branch: record.branch,
          status: containerName ? this.getContainerStatus(containerName) : (record.status as AgentStatus || 'STOPPED'),
          worktreePath: worktreePath,
          tmuxSession: containerName || record.tmuxSession,
          createdAt: new Date(record.createdAt),
          projectId: record.projectId, // Include projectId if it exists
          useDocker: record.useDocker !== false // Default to true
        } as Agent;
      });
    } catch (error) {
      console.error('Error reading active agents:', error);
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

    // Determine which Docker image to use
    const config = this.configManager.loadConfig();
    let dockerImage = this.dockerImage;
    
    // Check for Task Master variant if enabled
    if (config.TASK_MASTER_ENABLED && config.TASKMASTER_AUTO_INSTALL) {
      // Use Task Master variant of the image
      if (dockerImage.includes(':')) {
        dockerImage = dockerImage.replace(/:(\w+)$/, ':$1-taskmaster');
      } else {
        dockerImage += '-taskmaster';
      }
    }
    
    // Override with Claude image if auth volume exists
    if (hasClaudeAuth) {
      dockerImage = 'magents/claude:dev';
    }
    
    // For Claude image, we need to override the entrypoint
    const entrypointOverride = hasClaudeAuth ? '--entrypoint /bin/bash' : '';
    
    // Command to initialize tmux and keep container running
    const initCommand = this.buildTmuxInitCommand(options.agentId, hasClaudeAuth);
    const runCommand = hasClaudeAuth ? `-c "${initCommand}"` : `bash -c "${initCommand}"`;

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
      -e TASK_MASTER_ENABLED="${config.TASK_MASTER_ENABLED || false}" \
      ${entrypointOverride} \
      ${dockerImage} \
      ${runCommand}`;
  }

  private buildTmuxInitCommand(agentId: string, hasClaudeAuth: boolean): string {
    // Create a tmux session with windows similar to old TmuxService
    // Use simpler command structure to avoid escaping issues
    const commands = [
      `tmux new-session -d -s '${agentId}' -n 'main' -c /workspace`,
      `tmux new-window -t '${agentId}' -n 'claude' -c /workspace`,
      `tmux new-window -t '${agentId}' -n 'git' -c /workspace`,
      `tmux send-keys -t '${agentId}:git' 'echo Git commands for this workspace:' Enter`,
      `tmux send-keys -t '${agentId}:git' 'echo   git status' Enter`,
      `tmux send-keys -t '${agentId}:git' 'echo   git add . and git commit -m message' Enter`,
      `tmux send-keys -t '${agentId}:git' 'echo   git push' Enter`,
      `tmux send-keys -t '${agentId}:git' '' Enter`,
      `tmux select-window -t '${agentId}:claude'`,
      `while true; do sleep 3600; done`
    ];
    
    return commands.join(' && ');
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
    const config = this.configManager.loadConfig();
    
    // Copy Task Master configuration only if enabled
    if (config.TASK_MASTER_ENABLED) {
      const taskMasterSource = path.join(sourceRepo, '.taskmaster');
      const taskMasterDest = path.join(sharedConfigDir, '.taskmaster');
      
      if (fs.existsSync(taskMasterSource)) {
        this.copyDirectory(taskMasterSource, taskMasterDest);
        ui.muted('  ✓ Copied Task Master configuration');
      } else if (config.TASK_MASTER_ENABLED) {
        ui.muted('  ⚠ Task Master enabled but no .taskmaster directory found');
      }
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