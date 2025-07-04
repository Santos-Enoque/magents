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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerAgentManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const ConfigManager_1 = require("../config/ConfigManager");
const GitService_1 = require("./GitService");
const UIService_1 = require("../ui/UIService");
const crypto_1 = require("crypto");
const shared_1 = require("@magents/shared");
/**
 * Docker-based Agent Manager for Magents
 * Creates and manages AI agents as Docker containers
 */
class DockerAgentManager {
    constructor() {
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
        this.gitService = new GitService_1.GitService();
        this.activeAgentsFile = path.join(this.configManager.getAgentsDir(), 'docker_agents.json');
        const config = this.configManager.loadConfig();
        // Always check for Claude auth volume to determine image
        this.dockerImage = config.DOCKER_IMAGE || 'magents/agent:latest';
        this.databaseService = new shared_1.UnifiedDatabaseService();
    }
    /**
     * Generate a consistent project ID based on the project path
     */
    generateProjectId(projectPath) {
        const normalizedPath = path.resolve(projectPath);
        const projectName = path.basename(normalizedPath);
        // Create a short hash from the full path for uniqueness
        const hash = (0, crypto_1.createHash)('md5').update(normalizedPath).digest('hex').substring(0, 8);
        return `${projectName}-${hash}`;
    }
    /**
     * Detect if a project exists in the database
     */
    async detectExistingProject(projectPath) {
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
        }
        catch (error) {
            UIService_1.ui.info(`Could not check for existing project: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }
    /**
     * Auto-create a project for the given path
     */
    async autoCreateProject(projectPath) {
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
            }
            catch {
                gitRemote = undefined;
            }
            gitRepository = {
                branch: gitBranch,
                remote: gitRemote,
                isClean: true,
            };
        }
        catch (error) {
            // Not a git repository or git commands failed
            gitRepository = undefined;
        }
        // Detect project type
        const projectType = this.detectProjectType(normalizedPath);
        const projectData = {
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
            UIService_1.ui.success(`✓ Auto-created project '${projectName}' (${projectId})`);
            return createdProject;
        }
        catch (error) {
            UIService_1.ui.error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    /**
     * Detect project type based on files in the directory
     */
    detectProjectType(projectPath) {
        const now = new Date();
        try {
            // Check for package.json (Node.js)
            if (fs.existsSync(path.join(projectPath, 'package.json'))) {
                const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
                const frameworks = [];
                // Detect common frameworks
                if (packageJson.dependencies || packageJson.devDependencies) {
                    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    if (deps.react)
                        frameworks.push('React');
                    if (deps.vue)
                        frameworks.push('Vue');
                    if (deps.angular)
                        frameworks.push('Angular');
                    if (deps.express)
                        frameworks.push('Express');
                    if (deps.next)
                        frameworks.push('Next.js');
                }
                let packageManager = 'npm';
                if (fs.existsSync(path.join(projectPath, 'yarn.lock')))
                    packageManager = 'yarn';
                if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml')))
                    packageManager = 'pnpm';
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
        }
        catch (error) {
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
    async getOrCreateProject(projectPath) {
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
    async updateProjectWithAgent(projectId, agentId) {
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
            UIService_1.ui.info(`🔗 Linked agent ${agentId} to project ${project.name}`);
        }
    }
    // Compatibility method for CLI that might check for TmuxService
    getTmuxService() {
        return {
            listSessions: () => this.getActiveAgents().map(a => a.tmuxSession),
            sessionExists: (session) => {
                const containerName = session; // tmuxSession is containerName for Docker agents
                return this.getContainerStatus(containerName) === 'RUNNING';
            }
        };
    }
    async createAgent(options) {
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
            let project;
            let wasProjectCreated = false;
            if (!projectId) {
                const result = await this.getOrCreateProject(repoRoot);
                project = result.project;
                projectId = project.id;
                wasProjectCreated = result.wasCreated;
                if (wasProjectCreated) {
                    UIService_1.ui.info(`📁 Created new project: ${project.name} (${project.id})`);
                }
                else {
                    UIService_1.ui.info(`📁 Using existing project: ${project.name} (${project.id})`);
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
            UIService_1.ui.info(`Starting Docker container for agent '${agentId}'...`);
            (0, child_process_1.execSync)(dockerCmd);
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
            }
            catch (error) {
                UIService_1.ui.info(`Could not update project with agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to create Docker agent: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    getActiveAgents() {
        if (!fs.existsSync(this.activeAgentsFile)) {
            return [];
        }
        try {
            const content = fs.readFileSync(this.activeAgentsFile, 'utf8');
            const records = JSON.parse(content);
            return records.map(record => {
                // Handle both old format (with tmuxSession) and new format (with containerName)
                const containerName = record.containerName || record.tmuxSession;
                const worktreePath = record.worktreePath || record.repoRoot;
                return {
                    id: record.id,
                    branch: record.branch,
                    status: containerName ? this.getContainerStatus(containerName) : (record.status || 'STOPPED'),
                    worktreePath: worktreePath,
                    tmuxSession: containerName || record.tmuxSession,
                    createdAt: new Date(record.createdAt),
                    projectId: record.projectId, // Include projectId if it exists
                    useDocker: record.useDocker !== false // Default to true
                };
            });
        }
        catch (error) {
            console.error('Error reading active agents:', error);
            return [];
        }
    }
    async attachToAgent(agentId) {
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
                (0, child_process_1.execSync)(`docker start ${containerName}`);
                await this.waitForHealthy(containerName);
            }
            // Attach to container
            UIService_1.ui.info(`Attaching to Docker agent '${agentId}'...`);
            UIService_1.ui.info(`Run 'exit' to detach from the agent without stopping it.`);
            // This will replace current process with docker attach
            (0, child_process_1.execSync)(`docker exec -it ${containerName} bash`, { stdio: 'inherit' });
            return {
                success: true,
                message: `Detached from agent '${agentId}'`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to attach to agent: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    async stopAgent(agentId, removeContainer = false) {
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
            (0, child_process_1.execSync)(`docker stop ${containerName}`, { stdio: 'pipe' });
            // Remove container if requested
            if (removeContainer) {
                (0, child_process_1.execSync)(`docker rm ${containerName}`, { stdio: 'pipe' });
            }
            // Update agent record
            this.updateAgentStatus(agentId, removeContainer ? 'REMOVED' : 'STOPPED');
            return {
                success: true,
                message: `Agent '${agentId}' ${removeContainer ? 'removed' : 'stopped'}`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    async cleanupAllAgents(removeContainers = false) {
        const agents = this.getActiveAgents();
        if (agents.length === 0) {
            return {
                success: true,
                message: 'No active Docker agents to cleanup'
            };
        }
        let stopped = 0;
        const errors = [];
        for (const agent of agents) {
            try {
                // For Docker agents, tmuxSession is the container name
                const containerName = agent.tmuxSession;
                // Stop container
                (0, child_process_1.execSync)(`docker stop ${containerName}`, { stdio: 'pipe' });
                // Remove container if requested
                if (removeContainers) {
                    (0, child_process_1.execSync)(`docker rm ${containerName}`, { stdio: 'pipe' });
                }
                stopped++;
            }
            catch (error) {
                errors.push(`Failed to stop ${agent.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // Clear or update agents file
        if (removeContainers) {
            fs.writeFileSync(this.activeAgentsFile, '[]');
        }
        else {
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
    buildDockerCommand(options) {
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
            }
            else {
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
    buildTmuxInitCommand(agentId, hasClaudeAuth) {
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
    getApiKeys() {
        const keys = {};
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
    async setupSharedConfiguration(sourceRepo, sharedConfigDir) {
        const config = this.configManager.loadConfig();
        // Copy Task Master configuration only if enabled
        if (config.TASK_MASTER_ENABLED) {
            const taskMasterSource = path.join(sourceRepo, '.taskmaster');
            const taskMasterDest = path.join(sharedConfigDir, '.taskmaster');
            if (fs.existsSync(taskMasterSource)) {
                this.copyDirectory(taskMasterSource, taskMasterDest);
                UIService_1.ui.muted('  ✓ Copied Task Master configuration');
            }
            else if (config.TASK_MASTER_ENABLED) {
                UIService_1.ui.muted('  ⚠ Task Master enabled but no .taskmaster directory found');
            }
        }
        // Copy CLAUDE.md
        const claudeMdSource = path.join(sourceRepo, 'CLAUDE.md');
        const claudeMdDest = path.join(sharedConfigDir, 'CLAUDE.md');
        if (fs.existsSync(claudeMdSource)) {
            fs.copyFileSync(claudeMdSource, claudeMdDest);
            UIService_1.ui.muted('  ✓ Copied CLAUDE.md');
        }
        // Copy MCP configuration
        const mcpSource = path.join(sourceRepo, '.mcp.json');
        const mcpDest = path.join(sharedConfigDir, '.mcp.json');
        if (fs.existsSync(mcpSource)) {
            fs.copyFileSync(mcpSource, mcpDest);
            UIService_1.ui.muted('  ✓ Copied MCP configuration');
        }
    }
    copyDirectory(source, destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }
        const files = fs.readdirSync(source);
        files.forEach(file => {
            const sourcePath = path.join(source, file);
            const destPath = path.join(destination, file);
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            }
            else {
                fs.copyFileSync(sourcePath, destPath);
            }
        });
    }
    getContainerStatus(containerName) {
        try {
            const result = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Status}}'`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();
            return result === 'running' ? 'RUNNING' : 'STOPPED';
        }
        catch {
            return 'STOPPED';
        }
    }
    async waitForHealthy(containerName, timeout = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                // First check if container is running
                const status = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Status}}'`, { encoding: 'utf8', stdio: 'pipe' }).trim();
                if (status !== 'running') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                // Then check health if available
                try {
                    const health = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Health.Status}}'`, { encoding: 'utf8', stdio: 'pipe' }).trim();
                    // If healthy, we're good
                    if (health === 'healthy') {
                        return;
                    }
                }
                catch (healthError) {
                    // No health check configured - that's OK, container is running
                    return;
                }
            }
            catch {
                // Container might not exist yet
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error(`Container ${containerName} did not become healthy within ${timeout}ms`);
    }
    ensureDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    agentExists(agentId) {
        const agents = this.getActiveAgents();
        return agents.some(agent => agent.id === agentId);
    }
    recordAgent(agent) {
        const existingRecords = fs.existsSync(this.activeAgentsFile)
            ? JSON.parse(fs.readFileSync(this.activeAgentsFile, 'utf8'))
            : [];
        existingRecords.push(agent);
        fs.writeFileSync(this.activeAgentsFile, JSON.stringify(existingRecords, null, 2));
    }
    updateAgentStatus(agentId, status) {
        const agents = this.getActiveAgents();
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            agent.status = status;
            fs.writeFileSync(this.activeAgentsFile, JSON.stringify(agents, null, 2));
        }
    }
    checkClaudeAuthVolume() {
        try {
            const result = (0, child_process_1.execSync)('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
                stdio: 'pipe'
            });
            return true;
        }
        catch {
            return false;
        }
    }
    checkClaudeAuthVolumeStatic() {
        try {
            const result = (0, child_process_1.execSync)('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
                stdio: 'pipe'
            });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.DockerAgentManager = DockerAgentManager;
//# sourceMappingURL=DockerAgentManager.js.map