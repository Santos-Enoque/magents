"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = exports.StartCommand = void 0;
const UIService_1 = require("../ui/UIService");
const ConfigManager_1 = require("../config/ConfigManager");
const AgentManager_1 = require("../services/AgentManager");
const DockerAgentManager_1 = require("../services/DockerAgentManager");
const child_process_1 = require("child_process");
const inquirer_1 = __importDefault(require("inquirer"));
class StartCommand {
    constructor() {
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
        this.agentManager = new AgentManager_1.AgentManager();
        this.dockerManager = new DockerAgentManager_1.DockerAgentManager();
    }
    async execute(agentId, options = {}) {
        try {
            // Check if Docker is available
            if (options.docker || this.configManager.loadConfig().DOCKER_ENABLED) {
                const dockerAvailable = await this.checkDocker();
                if (!dockerAvailable) {
                    UIService_1.ui.error('Docker is not available. Please install Docker or use tmux mode.');
                    process.exit(1);
                }
            }
            // Handle different start scenarios
            if (options.all) {
                await this.startAllAgents(options);
            }
            else if (agentId) {
                await this.startSpecificAgent(agentId, options);
            }
            else {
                // Interactive mode - select agent to start
                await this.startInteractive(options);
            }
        }
        catch (error) {
            UIService_1.ui.error(`Failed to start agent: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
    async checkDocker() {
        try {
            (0, child_process_1.execSync)('docker --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async startAllAgents(options) {
        const agents = this.agentManager.getActiveAgents();
        const stoppedAgents = agents.filter(a => a.status !== 'RUNNING');
        if (stoppedAgents.length === 0) {
            UIService_1.ui.info('All agents are already running');
            return;
        }
        UIService_1.ui.header(`Starting ${stoppedAgents.length} agents`);
        for (const agent of stoppedAgents) {
            await this.startAgent(agent, options);
        }
        UIService_1.ui.success(`Started ${stoppedAgents.length} agents`);
    }
    async startSpecificAgent(agentId, options) {
        const agents = this.agentManager.getActiveAgents();
        const agent = agents.find(a => a.id === agentId || a.id.startsWith(agentId));
        if (!agent) {
            UIService_1.ui.error(`Agent '${agentId}' not found`);
            // Suggest creating the agent
            const create = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'create',
                    message: `Would you like to create agent '${agentId}'?`,
                    default: true
                }]);
            if (create.create) {
                UIService_1.ui.info('Redirecting to create command...');
                (0, child_process_1.execSync)(`node ${__dirname}/../../bin/magents.js create ${agentId} --docker`, { stdio: 'inherit' });
            }
            return;
        }
        if (agent.status === 'RUNNING') {
            UIService_1.ui.info(`Agent '${agent.id}' is already running`);
            if (options.logs) {
                await this.showLogs(agent, options);
            }
            else if (options.shell) {
                await this.attachShell(agent, options);
            }
            else {
                const action = await inquirer_1.default.prompt([{
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
                        (0, child_process_1.execSync)(`node ${__dirname}/../../bin/magents.js attach ${agent.id}`, { stdio: 'inherit' });
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
    async startInteractive(options) {
        const agents = this.agentManager.getActiveAgents();
        if (agents.length === 0) {
            UIService_1.ui.warning('No agents found');
            const create = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'create',
                    message: 'Would you like to create a new agent?',
                    default: true
                }]);
            if (create.create) {
                (0, child_process_1.execSync)(`node ${__dirname}/../../bin/magents.js create`, { stdio: 'inherit' });
            }
            return;
        }
        const stoppedAgents = agents.filter(a => a.status !== 'RUNNING');
        if (stoppedAgents.length === 0) {
            UIService_1.ui.info('All agents are already running');
            const choices = agents.map(a => ({
                name: `${a.id} (${a.branch}) - Running`,
                value: a.id
            }));
            const selected = await inquirer_1.default.prompt([{
                    type: 'list',
                    name: 'agent',
                    message: 'Select an agent to manage:',
                    choices: [...choices, { name: 'Cancel', value: null }]
                }]);
            if (selected.agent) {
                await this.startSpecificAgent(selected.agent, options);
            }
            return;
        }
        const choices = stoppedAgents.map(a => ({
            name: `${a.id} (${a.branch}) - Stopped`,
            value: a.id
        }));
        choices.push({ name: 'Start all stopped agents', value: 'all' });
        choices.push({ name: 'Cancel', value: null });
        const selected = await inquirer_1.default.prompt([{
                type: 'list',
                name: 'agent',
                message: 'Select agent to start:',
                choices
            }]);
        if (selected.agent === 'all') {
            await this.startAllAgents(options);
        }
        else if (selected.agent) {
            await this.startSpecificAgent(selected.agent, options);
        }
    }
    async startAgent(agent, options) {
        if (options.dryRun) {
            UIService_1.ui.header('Dry Run - Agent Start Preview');
            UIService_1.ui.keyValue('Agent ID', agent.id);
            UIService_1.ui.keyValue('Agent Branch', agent.branch);
            UIService_1.ui.keyValue('Mode', agent.useDocker || options.docker ? 'Docker' : 'tmux');
            if (agent.useDocker || options.docker) {
                UIService_1.ui.keyValue('Container Name', `magents-${agent.id}`);
                UIService_1.ui.keyValue('Docker Image', this.configManager.loadConfig().DOCKER_IMAGE || 'magents/agent:latest');
                if (options.resources?.cpu)
                    UIService_1.ui.keyValue('CPU Limit', options.resources.cpu);
                if (options.resources?.memory)
                    UIService_1.ui.keyValue('Memory Limit', options.resources.memory);
                if (options.network)
                    UIService_1.ui.keyValue('Network', options.network);
                if (options.volumes && options.volumes.length > 0) {
                    UIService_1.ui.keyValue('Additional Volumes', options.volumes.join(', '));
                }
                if (options.env && options.env.length > 0) {
                    UIService_1.ui.keyValue('Environment Variables', options.env.join(', '));
                }
                if (options.restart)
                    UIService_1.ui.keyValue('Restart Policy', options.restart);
            }
            else {
                UIService_1.ui.keyValue('Tmux Session', agent.tmuxSession);
                UIService_1.ui.keyValue('Working Directory', agent.worktreePath);
            }
            UIService_1.ui.info('Use without --dry-run to start the agent');
            return;
        }
        const spinner = UIService_1.ui.spinner(`Starting agent '${agent.id}'...`);
        spinner.start();
        try {
            if (agent.useDocker || options.docker) {
                await this.startDockerAgent(agent, options);
            }
            else {
                await this.startTmuxAgent(agent, options);
            }
            spinner.succeed(`Agent '${agent.id}' started successfully`);
            // Show connection info
            UIService_1.ui.divider('Connection Info');
            UIService_1.ui.command(`magents attach ${agent.id}`, 'Connect to agent');
            if (agent.useDocker || options.docker) {
                UIService_1.ui.command(`docker logs magents-${agent.id}`, 'View container logs');
                UIService_1.ui.command(`docker exec -it magents-${agent.id} bash`, 'Open shell in container');
            }
        }
        catch (error) {
            spinner.fail(`Failed to start agent '${agent.id}'`);
            throw error;
        }
    }
    async startDockerAgent(agent, options) {
        const containerName = `magents-${agent.id}`;
        // Check if container exists
        try {
            const containerInfo = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Status}}'`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();
            if (containerInfo === 'running') {
                UIService_1.ui.info('Container is already running');
                return;
            }
            // Start existing container
            (0, child_process_1.execSync)(`docker start ${containerName}`, { stdio: 'pipe' });
            // Wait for container to be ready
            await this.waitForContainer(containerName);
        }
        catch (error) {
            // Container doesn't exist, create it
            UIService_1.ui.muted('Container not found, creating new one...');
            // Build docker run command with options
            const dockerCmd = this.buildDockerRunCommand(agent, containerName, options);
            (0, child_process_1.execSync)(dockerCmd, { stdio: 'pipe' });
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
    buildDockerRunCommand(agent, containerName, options) {
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
        }
        else {
            cmd += ` ${dockerImage}`;
        }
        return cmd;
    }
    async startTmuxAgent(agent, options) {
        const sessionName = agent.tmuxSession;
        // Check if session exists
        try {
            (0, child_process_1.execSync)(`tmux has-session -t ${sessionName} 2>/dev/null`, { stdio: 'ignore' });
            UIService_1.ui.info('Tmux session already exists');
            return;
        }
        catch {
            // Session doesn't exist, create it
            const worktreePath = agent.worktreePath;
            // Create new tmux session
            (0, child_process_1.execSync)(`tmux new-session -d -s ${sessionName} -c ${worktreePath}`, { stdio: 'pipe' });
            // Set up windows
            (0, child_process_1.execSync)(`tmux rename-window -t ${sessionName}:0 main`, { stdio: 'pipe' });
            (0, child_process_1.execSync)(`tmux new-window -t ${sessionName}:1 -n claude -c ${worktreePath}`, { stdio: 'pipe' });
            (0, child_process_1.execSync)(`tmux new-window -t ${sessionName}:2 -n git -c ${worktreePath}`, { stdio: 'pipe' });
            // Start Claude in the claude window if not detached
            if (!options.detach) {
                const config = this.configManager.loadConfig();
                const claudeCmd = config.CLAUDE_AUTO_ACCEPT
                    ? 'claude --auto-accept'
                    : 'claude';
                (0, child_process_1.execSync)(`tmux send-keys -t ${sessionName}:claude "${claudeCmd}" Enter`, { stdio: 'pipe' });
            }
        }
    }
    async waitForContainer(containerName, timeout = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const status = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='{{.State.Status}}'`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                if (status === 'running') {
                    return;
                }
            }
            catch {
                // Container might not exist yet
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error(`Container ${containerName} did not start within ${timeout}ms`);
    }
    checkClaudeAuthVolume() {
        try {
            (0, child_process_1.execSync)('docker volume ls --format "{{.Name}}" | grep -q "^claude-container-auth$"', {
                stdio: 'pipe'
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async applyResourceLimits(containerName, resources) {
        try {
            if (resources.cpu) {
                (0, child_process_1.execSync)(`docker update --cpus="${resources.cpu}" ${containerName}`, { stdio: 'pipe' });
            }
            if (resources.memory) {
                (0, child_process_1.execSync)(`docker update --memory="${resources.memory}" ${containerName}`, { stdio: 'pipe' });
            }
            UIService_1.ui.muted('Applied resource limits');
        }
        catch (error) {
            UIService_1.ui.warning('Failed to apply some resource limits');
        }
    }
    async setupHealthCheck(containerName) {
        // Docker doesn't support adding health checks to running containers
        // This would need to be part of the image or docker run command
        UIService_1.ui.muted('Health check should be configured in Docker image');
    }
    async showLogs(agent, options) {
        if (agent.useDocker || options.docker) {
            const containerName = `magents-${agent.id}`;
            const follow = options.detach ? '' : '-f';
            (0, child_process_1.spawn)('docker', ['logs', follow, containerName], { stdio: 'inherit' });
        }
        else {
            UIService_1.ui.info('Logs are available in the tmux session');
            UIService_1.ui.command(`magents attach ${agent.id}`, 'View tmux session');
        }
    }
    async attachShell(agent, options) {
        if (agent.useDocker || options.docker) {
            const containerName = `magents-${agent.id}`;
            (0, child_process_1.spawn)('docker', ['exec', '-it', containerName, 'bash'], { stdio: 'inherit' });
        }
        else {
            UIService_1.ui.info('Opening new tmux window...');
            const sessionName = agent.tmuxSession;
            (0, child_process_1.execSync)(`tmux new-window -t ${sessionName} -n shell`, { stdio: 'inherit' });
        }
    }
    async restartAgent(agent, options) {
        const spinner = UIService_1.ui.spinner(`Restarting agent '${agent.id}'...`);
        spinner.start();
        try {
            if (agent.useDocker || options.docker) {
                const containerName = `magents-${agent.id}`;
                (0, child_process_1.execSync)(`docker restart ${containerName}`, { stdio: 'pipe' });
                await this.waitForContainer(containerName);
            }
            else {
                // For tmux, kill and recreate session
                const sessionName = agent.tmuxSession;
                (0, child_process_1.execSync)(`tmux kill-session -t ${sessionName} 2>/dev/null || true`, { stdio: 'ignore' });
                await this.startTmuxAgent(agent, options);
            }
            spinner.succeed(`Agent '${agent.id}' restarted successfully`);
        }
        catch (error) {
            spinner.fail(`Failed to restart agent '${agent.id}'`);
            throw error;
        }
    }
    async getContainerStatus(containerName) {
        try {
            const format = '{{json .}}';
            const output = (0, child_process_1.execSync)(`docker inspect ${containerName} --format='${format}'`, {
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
        }
        catch {
            return null;
        }
    }
}
exports.StartCommand = StartCommand;
// Export singleton instance
exports.startCommand = new StartCommand();
//# sourceMappingURL=start.js.map