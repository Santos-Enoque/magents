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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ConfigManager {
    constructor() {
        this.config = null;
        this.configFile = path.join(os.homedir(), '.magents-config');
        this.agentsDir = path.join(os.homedir(), '.magents');
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getConfigPath() {
        return this.configFile;
    }
    getAgentsDir() {
        return this.agentsDir;
    }
    initializeConfig() {
        // Create agents directory
        if (!fs.existsSync(this.agentsDir)) {
            fs.mkdirSync(this.agentsDir, { recursive: true });
        }
        // Create default config if it doesn't exist
        if (!fs.existsSync(this.configFile)) {
            const defaultConfig = `# magents Configuration
DEFAULT_BASE_BRANCH=main
TMUX_SESSION_PREFIX=magent
WORKTREE_PREFIX=agent
MAX_AGENTS=5
CLAUDE_CODE_PATH=claude
CLAUDE_AUTO_ACCEPT=true
DOCKER_ENABLED=true
DOCKER_IMAGE=magents/agent:latest
MODE=simple
`;
            fs.writeFileSync(this.configFile, defaultConfig);
        }
    }
    loadConfig() {
        if (this.config) {
            return this.config;
        }
        if (!fs.existsSync(this.configFile)) {
            this.initializeConfig();
        }
        const configContent = fs.readFileSync(this.configFile, 'utf8');
        const config = {};
        // Parse simple key=value format
        configContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    const cleanKey = key.trim();
                    const cleanValue = value.trim();
                    switch (cleanKey) {
                        case 'MAX_AGENTS':
                            config[cleanKey] = parseInt(cleanValue, 10);
                            break;
                        case 'CLAUDE_AUTO_ACCEPT':
                        case 'DOCKER_ENABLED':
                        case 'TASK_MASTER_ENABLED':
                        case 'GITHUB_INTEGRATION':
                        case 'MCP_ENABLED':
                        case 'CUSTOM_COMMANDS_ENABLED':
                        case 'MCP_DEVELOPMENT_MODE':
                        case 'ADVANCED_DOCKER_CONFIG':
                            config[cleanKey] = cleanValue.toLowerCase() === 'true';
                            break;
                        case 'DEFAULT_BASE_BRANCH':
                        case 'TMUX_SESSION_PREFIX':
                        case 'WORKTREE_PREFIX':
                        case 'CLAUDE_CODE_PATH':
                        case 'DOCKER_IMAGE':
                        case 'MODE':
                            config[cleanKey] = cleanValue;
                            break;
                    }
                }
            }
        });
        // Set defaults for missing values
        this.config = {
            DEFAULT_BASE_BRANCH: config.DEFAULT_BASE_BRANCH || 'main',
            TMUX_SESSION_PREFIX: config.TMUX_SESSION_PREFIX || 'magent',
            WORKTREE_PREFIX: config.WORKTREE_PREFIX || 'agent',
            MAX_AGENTS: config.MAX_AGENTS || 5,
            CLAUDE_CODE_PATH: config.CLAUDE_CODE_PATH || 'claude',
            CLAUDE_AUTO_ACCEPT: config.CLAUDE_AUTO_ACCEPT !== undefined ? config.CLAUDE_AUTO_ACCEPT : true,
            DOCKER_ENABLED: config.DOCKER_ENABLED !== undefined ? config.DOCKER_ENABLED : false,
            DOCKER_IMAGE: config.DOCKER_IMAGE || 'magents/agent:latest',
        };
        return this.config;
    }
    updateConfig(updates) {
        const currentConfig = this.loadConfig();
        const newConfig = { ...currentConfig, ...updates };
        const configLines = [
            '# magents Configuration',
            `DEFAULT_BASE_BRANCH=${newConfig.DEFAULT_BASE_BRANCH}`,
            `TMUX_SESSION_PREFIX=${newConfig.TMUX_SESSION_PREFIX}`,
            `WORKTREE_PREFIX=${newConfig.WORKTREE_PREFIX}`,
            `MAX_AGENTS=${newConfig.MAX_AGENTS}`,
            `CLAUDE_CODE_PATH=${newConfig.CLAUDE_CODE_PATH}`,
            `CLAUDE_AUTO_ACCEPT=${newConfig.CLAUDE_AUTO_ACCEPT}`,
            `DOCKER_ENABLED=${newConfig.DOCKER_ENABLED}`,
            `DOCKER_IMAGE=${newConfig.DOCKER_IMAGE}`,
            `MODE=${newConfig.MODE || 'simple'}`,
        ];
        // Add optional fields if they exist
        if (newConfig.TASK_MASTER_ENABLED !== undefined) {
            configLines.push(`TASK_MASTER_ENABLED=${newConfig.TASK_MASTER_ENABLED}`);
        }
        if (newConfig.GITHUB_INTEGRATION !== undefined) {
            configLines.push(`GITHUB_INTEGRATION=${newConfig.GITHUB_INTEGRATION}`);
        }
        if (newConfig.MCP_ENABLED !== undefined) {
            configLines.push(`MCP_ENABLED=${newConfig.MCP_ENABLED}`);
        }
        if (newConfig.CUSTOM_COMMANDS_ENABLED !== undefined) {
            configLines.push(`CUSTOM_COMMANDS_ENABLED=${newConfig.CUSTOM_COMMANDS_ENABLED}`);
        }
        if (newConfig.MCP_DEVELOPMENT_MODE !== undefined) {
            configLines.push(`MCP_DEVELOPMENT_MODE=${newConfig.MCP_DEVELOPMENT_MODE}`);
        }
        if (newConfig.ADVANCED_DOCKER_CONFIG !== undefined) {
            configLines.push(`ADVANCED_DOCKER_CONFIG=${newConfig.ADVANCED_DOCKER_CONFIG}`);
        }
        fs.writeFileSync(this.configFile, configLines.join('\n') + '\n');
        this.config = newConfig;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map