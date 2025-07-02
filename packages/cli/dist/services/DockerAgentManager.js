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
        this.dockerImage = config.DOCKER_IMAGE || 'magents/agent:latest';
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
            return records.map(record => ({
                id: record.id,
                branch: record.branch,
                status: this.getContainerStatus(record.containerName),
                worktreePath: record.repoRoot, // For compatibility
                tmuxSession: record.containerName, // For compatibility
                createdAt: new Date(record.createdAt),
                useDocker: true
            }));
        }
        catch {
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
        return `docker run -d \
      --name ${options.containerName} \
      --label magents.agent.id=${options.agentId} \
      --label magents.agent.branch=${options.branch} \
      -v "${options.repoRoot}:/workspace" \
      -v "${options.sharedConfigDir}:/shared" \
      -v "${options.agentStateDir}:/agent" \
      ${bridgeMount} \
      -e AGENT_ID="${options.agentId}" \
      -e AGENT_BRANCH="${options.branch}" \
      -e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock \
      ${envVars} \
      ${this.dockerImage} \
      tail -f /dev/null`;
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
        // Copy Task Master configuration
        const taskMasterSource = path.join(sourceRepo, '.taskmaster');
        const taskMasterDest = path.join(sharedConfigDir, '.taskmaster');
        if (fs.existsSync(taskMasterSource)) {
            this.copyDirectory(taskMasterSource, taskMasterDest);
            UIService_1.ui.muted('  ✓ Copied Task Master configuration');
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
                const health = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Health.Status}}'`, { encoding: 'utf8', stdio: 'pipe' }).trim();
                if (health === 'healthy' || health === '') {
                    // No health check or healthy
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
}
exports.DockerAgentManager = DockerAgentManager;
//# sourceMappingURL=DockerAgentManager.js.map