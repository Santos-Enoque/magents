"use strict";
/**
 * Auto-Configuration System for Magents
 *
 * Provides intelligent defaults and automatic configuration detection
 * for different project types, environments, and user preferences.
 */
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
exports.autoConfig = exports.AutoConfigService = exports.ConfigLevel = exports.PORT_RANGES = exports.PROJECT_PATTERNS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
exports.PROJECT_PATTERNS = [
    {
        name: 'react',
        description: 'React.js Application',
        files: ['package.json'],
        directories: ['src', 'public'],
        packageManagers: ['npm', 'yarn', 'pnpm'],
        priority: 1
    },
    {
        name: 'nextjs',
        description: 'Next.js Application',
        files: ['package.json', 'next.config.js', 'next.config.ts'],
        directories: ['pages', 'app'],
        packageManagers: ['npm', 'yarn', 'pnpm'],
        priority: 2
    },
    {
        name: 'nodejs',
        description: 'Node.js Project',
        files: ['package.json'],
        directories: ['src', 'lib'],
        packageManagers: ['npm', 'yarn', 'pnpm'],
        priority: 3
    },
    {
        name: 'python',
        description: 'Python Project',
        files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
        directories: ['src', 'app'],
        packageManagers: ['pip', 'poetry', 'pipenv'],
        priority: 1
    },
    {
        name: 'django',
        description: 'Django Application',
        files: ['manage.py', 'requirements.txt'],
        directories: ['apps', 'templates'],
        packageManagers: ['pip', 'poetry'],
        priority: 2
    },
    {
        name: 'fastapi',
        description: 'FastAPI Application',
        files: ['main.py', 'requirements.txt'],
        directories: ['app', 'api'],
        packageManagers: ['pip', 'poetry'],
        priority: 2
    },
    {
        name: 'rust',
        description: 'Rust Project',
        files: ['Cargo.toml'],
        directories: ['src'],
        packageManagers: ['cargo'],
        priority: 1
    },
    {
        name: 'go',
        description: 'Go Project',
        files: ['go.mod', 'go.sum'],
        directories: ['cmd', 'internal'],
        packageManagers: ['go'],
        priority: 1
    },
    {
        name: 'java',
        description: 'Java Project',
        files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        directories: ['src/main', 'src/test'],
        packageManagers: ['maven', 'gradle'],
        priority: 1
    },
    {
        name: 'spring',
        description: 'Spring Boot Application',
        files: ['pom.xml', 'application.properties', 'application.yml'],
        directories: ['src/main/java'],
        packageManagers: ['maven', 'gradle'],
        priority: 2
    },
    {
        name: 'docker',
        description: 'Dockerized Project',
        files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
        priority: 0
    },
    {
        name: 'taskmaster',
        description: 'Task Master Project',
        files: ['.taskmaster/tasks.json', '.taskmaster/config.json'],
        directories: ['.taskmaster'],
        priority: 3
    }
];
// Port allocation ranges
exports.PORT_RANGES = {
    WEB_DEVELOPMENT: { start: 3000, end: 3999 },
    API_SERVICES: { start: 4000, end: 4999 },
    DATABASES: { start: 5000, end: 5999 },
    TOOLS_UTILITIES: { start: 6000, end: 6999 },
    CUSTOM: { start: 8000, end: 8999 }
};
// Configuration inheritance levels
var ConfigLevel;
(function (ConfigLevel) {
    ConfigLevel["GLOBAL"] = "global";
    ConfigLevel["PROJECT"] = "project";
    ConfigLevel["AGENT"] = "agent";
})(ConfigLevel || (exports.ConfigLevel = ConfigLevel = {}));
/**
 * Main Auto-Configuration Service
 */
class AutoConfigService {
    static getInstance() {
        if (!AutoConfigService.instance) {
            AutoConfigService.instance = new AutoConfigService();
        }
        return AutoConfigService.instance;
    }
    /**
     * Detect project type and characteristics
     */
    async detectProjectType(projectPath) {
        const matches = [];
        for (const pattern of exports.PROJECT_PATTERNS) {
            const evidence = [];
            let score = 0;
            // Check for required files
            if (pattern.files) {
                for (const file of pattern.files) {
                    const filePath = path.join(projectPath, file);
                    if (await this.fileExists(filePath)) {
                        evidence.push(`Found ${file}`);
                        score += 2;
                    }
                }
            }
            // Check for directories
            if (pattern.directories) {
                for (const dir of pattern.directories) {
                    const dirPath = path.join(projectPath, dir);
                    if (await this.directoryExists(dirPath)) {
                        evidence.push(`Found ${dir}/ directory`);
                        score += 1;
                    }
                }
            }
            // Check for package managers
            if (pattern.packageManagers) {
                for (const pm of pattern.packageManagers) {
                    if (await this.packageManagerAvailable(pm)) {
                        evidence.push(`${pm} available`);
                        score += 0.5;
                    }
                }
            }
            if (score > 0) {
                const confidence = Math.min(score / (pattern.files?.length || 1) * pattern.priority, 1);
                matches.push({
                    type: pattern.name,
                    confidence,
                    evidence
                });
            }
        }
        // Sort by confidence
        matches.sort((a, b) => b.confidence - a.confidence);
        const primaryType = matches[0]?.type || 'generic';
        const primaryConfidence = matches[0]?.confidence || 0;
        // Generate suggestions based on detected type
        const suggestions = await this.generateProjectSuggestions(primaryType, projectPath);
        return {
            primaryType,
            confidence: primaryConfidence,
            allMatches: matches,
            suggestions
        };
    }
    /**
     * Allocate available ports with conflict detection
     */
    async allocateAvailablePorts(count = 3, context) {
        const allocatedPorts = [];
        const usedPorts = await this.getUsedPorts();
        const excludePorts = context?.constraints?.excludePorts || [];
        const { start, end } = context?.constraints?.portRange || exports.PORT_RANGES.WEB_DEVELOPMENT;
        for (let port = start; port <= end && allocatedPorts.length < count; port++) {
            if (!usedPorts.includes(port) && !excludePorts.includes(port)) {
                if (await this.isPortAvailable(port)) {
                    allocatedPorts.push(port);
                }
            }
        }
        return allocatedPorts;
    }
    /**
     * Discover MCP servers in project and system
     */
    async discoverMCPServers(projectPath) {
        const servers = [];
        // Check project-level .mcp.json
        const projectMcpPath = path.join(projectPath, '.mcp.json');
        if (await this.fileExists(projectMcpPath)) {
            const projectServers = await this.parseMCPConfig(projectMcpPath);
            servers.push(...projectServers);
        }
        // Check global .mcp.json
        const globalMcpPath = path.join(require('os').homedir(), '.mcp.json');
        if (await this.fileExists(globalMcpPath)) {
            const globalServers = await this.parseMCPConfig(globalMcpPath);
            servers.push(...globalServers);
        }
        // Check common MCP server locations
        const commonPaths = [
            path.join(projectPath, '.claude', 'mcp.json'),
            path.join(require('os').homedir(), '.claude', 'mcp.json'),
            '/usr/local/etc/mcp.json'
        ];
        for (const mcpPath of commonPaths) {
            if (await this.fileExists(mcpPath)) {
                try {
                    const servers_found = await this.parseMCPConfig(mcpPath);
                    servers.push(...servers_found);
                }
                catch (error) {
                    console.warn(`Failed to parse MCP config at ${mcpPath}:`, error);
                }
            }
        }
        // Remove duplicates based on name
        const uniqueServers = servers.filter((server, index, self) => self.findIndex(s => s.name === server.name) === index);
        return uniqueServers;
    }
    /**
     * Build configuration with inheritance
     */
    async buildConfigWithInheritance(context) {
        const configs = [];
        // Load global config
        const globalConfig = await this.loadGlobalConfig();
        if (globalConfig) {
            configs.push(globalConfig);
        }
        // Load project config
        const projectConfig = await this.loadProjectConfig(context.projectPath);
        if (projectConfig) {
            configs.push(projectConfig);
        }
        // Add existing/provided config
        if (context.existingConfig) {
            configs.push(context.existingConfig);
        }
        // Merge configurations with precedence
        const mergedConfig = this.mergeConfigurations(configs);
        // Apply auto-detected settings
        const detectionResult = await this.detectProjectType(context.projectPath);
        const autoConfig = await this.generateAutoConfig(detectionResult, context);
        return { ...mergedConfig, ...autoConfig };
    }
    /**
     * Encrypt sensitive values (using modern crypto API)
     */
    encryptValue(value, password) {
        const salt = crypto.randomBytes(16);
        const key = password ?
            crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256') :
            this.getOrCreateEncryptionKey();
        const algorithm = 'aes-256-cbc';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted: iv.toString('hex') + ':' + encrypted,
            salt: salt.toString('hex'),
            algorithm
        };
    }
    /**
     * Decrypt sensitive values (using modern crypto API)
     */
    decryptValue(encryptedValue, password) {
        const salt = Buffer.from(encryptedValue.salt, 'hex');
        const key = password ?
            crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256') :
            this.getOrCreateEncryptionKey();
        const [ivHex, encrypted] = encryptedValue.encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(encryptedValue.algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    // Private helper methods
    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    async directoryExists(dirPath) {
        try {
            const stat = await fs.promises.stat(dirPath);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
    async packageManagerAvailable(pm) {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec(`${pm} --version`, (error) => {
                    resolve(!error);
                });
            });
        }
        catch {
            return false;
        }
    }
    async generateProjectSuggestions(projectType, projectPath) {
        const suggestions = {
            ports: await this.allocateAvailablePorts(3),
            environment: {},
            commands: [],
            extensions: []
        };
        switch (projectType) {
            case 'react':
            case 'nextjs':
                suggestions.environment = {
                    NODE_ENV: 'development',
                    BROWSER: 'none'
                };
                suggestions.commands = ['npm start', 'npm run dev', 'npm run build'];
                suggestions.extensions = ['.jsx', '.tsx', '.js', '.ts'];
                break;
            case 'python':
            case 'django':
            case 'fastapi':
                suggestions.environment = {
                    PYTHONPATH: projectPath,
                    DJANGO_SETTINGS_MODULE: 'settings'
                };
                suggestions.commands = ['python manage.py runserver', 'python -m uvicorn main:app', 'python app.py'];
                suggestions.extensions = ['.py', '.pyx'];
                break;
            case 'rust':
                suggestions.commands = ['cargo run', 'cargo build', 'cargo test'];
                suggestions.extensions = ['.rs'];
                break;
            case 'go':
                suggestions.commands = ['go run .', 'go build', 'go test'];
                suggestions.extensions = ['.go'];
                break;
        }
        return suggestions;
    }
    async getUsedPorts() {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec('netstat -tuln', (error, stdout) => {
                    if (error) {
                        resolve([]);
                        return;
                    }
                    const ports = [];
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        const match = line.match(/:(\d+)\s/);
                        if (match) {
                            const port = parseInt(match[1], 10);
                            if (port >= 1000 && port <= 65535) {
                                ports.push(port);
                            }
                        }
                    }
                    resolve(ports);
                });
            });
        }
        catch {
            return [];
        }
    }
    async isPortAvailable(port) {
        try {
            const net = require('net');
            return new Promise((resolve) => {
                const server = net.createServer();
                server.listen(port, () => {
                    server.close();
                    resolve(true);
                });
                server.on('error', () => {
                    resolve(false);
                });
            });
        }
        catch {
            return false;
        }
    }
    async parseMCPConfig(configPath) {
        try {
            const content = await fs.promises.readFile(configPath, 'utf8');
            const config = JSON.parse(content);
            const servers = [];
            if (config.mcpServers) {
                for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
                    const typedConfig = serverConfig;
                    servers.push({
                        name,
                        command: typedConfig.command || '',
                        args: typedConfig.args || [],
                        env: typedConfig.env || {},
                        configPath
                    });
                }
            }
            return servers;
        }
        catch (error) {
            console.warn(`Failed to parse MCP config at ${configPath}:`, error);
            return [];
        }
    }
    async loadGlobalConfig() {
        try {
            const configPath = path.join(require('os').homedir(), '.magents', 'config.json');
            if (await this.fileExists(configPath)) {
                const content = await fs.promises.readFile(configPath, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.warn('Failed to load global config:', error);
        }
        return null;
    }
    async loadProjectConfig(projectPath) {
        try {
            const configPath = path.join(projectPath, '.magents', 'config.json');
            if (await this.fileExists(configPath)) {
                const content = await fs.promises.readFile(configPath, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.warn('Failed to load project config:', error);
        }
        return null;
    }
    mergeConfigurations(configs) {
        return configs.reduce((merged, config) => {
            return { ...merged, ...config };
        }, {});
    }
    async generateAutoConfig(detection, context) {
        const config = {};
        // Set mode based on project complexity
        if (detection.confidence > 0.8) {
            config.MODE = detection.allMatches.length > 2 ? 'advanced' : 'standard';
        }
        else {
            config.MODE = 'simple';
        }
        // Enable features based on detection
        if (detection.allMatches.some(m => m.type === 'taskmaster')) {
            config.TASK_MASTER_ENABLED = true;
        }
        if (detection.allMatches.some(m => m.type === 'docker')) {
            config.DOCKER_ENABLED = true;
        }
        // Set defaults based on project type
        const primaryType = detection.primaryType;
        switch (primaryType) {
            case 'react':
            case 'nextjs':
                config.CLAUDE_AUTO_ACCEPT = false; // Interactive development
                break;
            case 'python':
            case 'django':
            case 'fastapi':
                config.CLAUDE_AUTO_ACCEPT = true; // Batch processing friendly
                break;
            default:
                config.CLAUDE_AUTO_ACCEPT = false;
        }
        return config;
    }
    getOrCreateEncryptionKey() {
        if (!this.encryptionKey) {
            // In production, this should come from secure key management
            this.encryptionKey = crypto.randomBytes(32);
        }
        return this.encryptionKey;
    }
}
exports.AutoConfigService = AutoConfigService;
// Export singleton instance
exports.autoConfig = AutoConfigService.getInstance();
//# sourceMappingURL=index.js.map