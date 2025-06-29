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
exports.DockerService = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class DockerService {
    constructor() {
        // Get the templates directory relative to the current file
        this.templatesDir = path.resolve(__dirname, '../../templates');
    }
    async createContainer(options) {
        try {
            // Generate docker-compose file
            const composeFile = this.generateDockerComposeFile(options);
            const composeFilePath = path.join(options.projectPath, `docker-compose.${options.agentId}.yml`);
            // Write docker-compose file
            fs.writeFileSync(composeFilePath, composeFile);
            // Build and create container
            (0, child_process_1.execSync)(`docker-compose -f "${composeFilePath}" build`, {
                cwd: options.projectPath,
                stdio: 'pipe'
            });
            console.log(`  ✓ Docker container built for agent ${options.agentId}`);
        }
        catch (error) {
            throw new Error(`Failed to create Docker container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async startContainer(agentId, projectPath) {
        try {
            const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
            if (!fs.existsSync(composeFilePath)) {
                throw new Error(`Docker compose file not found: ${composeFilePath}`);
            }
            (0, child_process_1.execSync)(`docker-compose -f "${composeFilePath}" up -d`, {
                cwd: projectPath,
                stdio: 'pipe'
            });
            console.log(`  ✓ Docker container started for agent ${agentId}`);
        }
        catch (error) {
            throw new Error(`Failed to start Docker container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async stopContainer(agentId, projectPath) {
        try {
            const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
            if (!fs.existsSync(composeFilePath)) {
                // Container already cleaned up
                return;
            }
            (0, child_process_1.execSync)(`docker-compose -f "${composeFilePath}" down`, {
                cwd: projectPath,
                stdio: 'pipe'
            });
            console.log(`  ✓ Docker container stopped for agent ${agentId}`);
        }
        catch (error) {
            throw new Error(`Failed to stop Docker container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async removeContainer(agentId, projectPath) {
        try {
            const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
            if (!fs.existsSync(composeFilePath)) {
                return;
            }
            // Stop and remove containers, networks, and volumes
            (0, child_process_1.execSync)(`docker-compose -f "${composeFilePath}" down -v --remove-orphans`, {
                cwd: projectPath,
                stdio: 'pipe'
            });
            // Remove the compose file
            fs.unlinkSync(composeFilePath);
            console.log(`  ✓ Docker container removed for agent ${agentId}`);
        }
        catch (error) {
            throw new Error(`Failed to remove Docker container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async execInContainer(agentId, projectPath, command) {
        try {
            const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
            const containerName = `magents-${agentId}`;
            // Build the docker exec command
            const dockerCommand = ['docker', 'exec', containerName, ...command];
            const result = (0, child_process_1.execSync)(dockerCommand.join(' '), {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return result.trim();
        }
        catch (error) {
            throw new Error(`Failed to execute command in container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    containerExists(agentId) {
        try {
            const containerName = `magents-${agentId}`;
            (0, child_process_1.execSync)(`docker inspect ${containerName}`, { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    getContainerStatus(agentId) {
        try {
            const containerName = `magents-${agentId}`;
            const result = (0, child_process_1.execSync)(`docker inspect -f '{{.State.Status}}' ${containerName}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return result.trim();
        }
        catch {
            return null;
        }
    }
    isDockerAvailable() {
        try {
            (0, child_process_1.execSync)('docker --version', { stdio: 'pipe' });
            (0, child_process_1.execSync)('docker-compose --version', { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    generateDockerComposeFile(options) {
        const templatePath = path.join(this.templatesDir, 'docker-compose.template.yml');
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Docker compose template not found: ${templatePath}`);
        }
        let template = fs.readFileSync(templatePath, 'utf8');
        // Generate unique subnet for this agent (172.20.x.0/24)
        const subnetSuffix = Math.floor(Math.random() * 254) + 1;
        const subnet = `172.20.${subnetSuffix}.0/24`;
        // Get Claude config directory
        const homeDir = os.homedir();
        const claudeConfigDir = path.join(homeDir, '.claude');
        const agentDataDir = path.join(homeDir, '.magents', options.agentId);
        // Ensure agent data directory exists
        if (!fs.existsSync(agentDataDir)) {
            fs.mkdirSync(agentDataDir, { recursive: true });
        }
        // Replace template variables
        const replacements = {
            '{{AGENT_ID}}': options.agentId,
            '{{PROJECT_PATH}}': options.projectPath,
            '{{TEMPLATES_DIR}}': this.templatesDir,
            '{{CLAUDE_CONFIG_DIR}}': claudeConfigDir,
            '{{AGENT_DATA_DIR}}': agentDataDir,
            '{{PORT_RANGE}}': options.portRange,
            '{{PROJECT_NAME}}': options.projectName,
            '{{BRANCH}}': options.branch,
            '{{ISOLATION_MODE}}': options.isolationMode || 'strict',
            '{{SUBNET}}': subnet
        };
        Object.entries(replacements).forEach(([placeholder, value]) => {
            template = template.replace(new RegExp(placeholder, 'g'), value);
        });
        return template;
    }
    async attachToContainer(agentId, projectPath) {
        try {
            const containerName = `magents-${agentId}`;
            // Start tmux session inside the container
            await this.execInContainer(agentId, projectPath, [
                'tmux', 'new-session', '-d', '-s', 'main'
            ]);
            // Attach to the container with tmux
            const attachCommand = `docker exec -it ${containerName} tmux attach-session -t main`;
            // This will replace the current process, similar to tmux attach
            (0, child_process_1.execSync)(attachCommand, { stdio: 'inherit' });
        }
        catch (error) {
            throw new Error(`Failed to attach to container: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.DockerService = DockerService;
//# sourceMappingURL=DockerService.js.map