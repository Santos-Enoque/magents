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
const shared_1 = require("@magents/shared");
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
            const defaultConfig = `# Magents Configuration - Docker-based AI Agent Management
DEFAULT_BASE_BRANCH=main
WORKTREE_PREFIX=agent
MAX_AGENTS=5
CLAUDE_CODE_PATH=claude
CLAUDE_AUTO_ACCEPT=true
DOCKER_IMAGE=magents/agent:latest
MODE=simple
# Task Master Integration (Optional)
TASK_MASTER_ENABLED=false
TASKMASTER_AUTO_INSTALL=false
# Advanced Features
GITHUB_INTEGRATION=false
MCP_ENABLED=false
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
                        case 'TASKMASTER_AUTO_INSTALL':
                        case 'GITHUB_INTEGRATION':
                        case 'MCP_ENABLED':
                        case 'CUSTOM_COMMANDS_ENABLED':
                        case 'MCP_DEVELOPMENT_MODE':
                        case 'ADVANCED_DOCKER_CONFIG':
                            config[cleanKey] = cleanValue.toLowerCase() === 'true';
                            break;
                        case 'DEFAULT_BASE_BRANCH':
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
            TMUX_SESSION_PREFIX: 'docker', // Kept for backward compatibility but not used
            WORKTREE_PREFIX: config.WORKTREE_PREFIX || 'agent',
            MAX_AGENTS: config.MAX_AGENTS || 5,
            CLAUDE_CODE_PATH: config.CLAUDE_CODE_PATH || 'claude',
            CLAUDE_AUTO_ACCEPT: config.CLAUDE_AUTO_ACCEPT !== undefined ? config.CLAUDE_AUTO_ACCEPT : true,
            DOCKER_ENABLED: true, // Docker is always enabled now
            DOCKER_IMAGE: config.DOCKER_IMAGE || 'magents/agent:latest',
            MODE: config.MODE || 'simple',
            TASK_MASTER_ENABLED: config.TASK_MASTER_ENABLED || false,
            TASKMASTER_AUTO_INSTALL: config.TASKMASTER_AUTO_INSTALL || false,
            DATABASE_CONFIG: {
                enabled: config.DATABASE_ENABLED !== undefined ? config.DATABASE_ENABLED : shared_1.DEFAULT_DATABASE_CONFIG.enabled,
                path: config.DATABASE_PATH,
                autoMigrate: config.DATABASE_AUTO_MIGRATE !== undefined ? config.DATABASE_AUTO_MIGRATE : shared_1.DEFAULT_DATABASE_CONFIG.autoMigrate,
                backupOnMigration: config.DATABASE_BACKUP_ON_MIGRATION !== undefined ? config.DATABASE_BACKUP_ON_MIGRATION : shared_1.DEFAULT_DATABASE_CONFIG.backupOnMigration,
                healthCheckInterval: config.DATABASE_HEALTH_CHECK_INTERVAL || shared_1.DEFAULT_DATABASE_CONFIG.healthCheckInterval,
                connectionTimeout: config.DATABASE_CONNECTION_TIMEOUT || shared_1.DEFAULT_DATABASE_CONFIG.connectionTimeout,
                retryAttempts: config.DATABASE_RETRY_ATTEMPTS || shared_1.DEFAULT_DATABASE_CONFIG.retryAttempts,
                retryDelay: config.DATABASE_RETRY_DELAY || shared_1.DEFAULT_DATABASE_CONFIG.retryDelay,
            },
        };
        return this.config;
    }
    updateConfig(updates) {
        const currentConfig = this.loadConfig();
        const newConfig = { ...currentConfig, ...updates };
        const configLines = [
            '# Magents Configuration - Docker-based AI Agent Management',
            `DEFAULT_BASE_BRANCH=${newConfig.DEFAULT_BASE_BRANCH}`,
            `WORKTREE_PREFIX=${newConfig.WORKTREE_PREFIX}`,
            `MAX_AGENTS=${newConfig.MAX_AGENTS}`,
            `CLAUDE_CODE_PATH=${newConfig.CLAUDE_CODE_PATH}`,
            `CLAUDE_AUTO_ACCEPT=${newConfig.CLAUDE_AUTO_ACCEPT}`,
            `DOCKER_IMAGE=${newConfig.DOCKER_IMAGE}`,
            `MODE=${newConfig.MODE || 'simple'}`,
            '',
            '# Task Master Integration (Optional)',
            `TASK_MASTER_ENABLED=${newConfig.TASK_MASTER_ENABLED || false}`,
            `TASKMASTER_AUTO_INSTALL=${newConfig.TASKMASTER_AUTO_INSTALL || false}`,
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
        // Add database configuration section
        if (newConfig.DATABASE_CONFIG) {
            configLines.push('');
            configLines.push('# Database Configuration');
            configLines.push(`DATABASE_ENABLED=${newConfig.DATABASE_CONFIG.enabled}`);
            if (newConfig.DATABASE_CONFIG.path) {
                configLines.push(`DATABASE_PATH=${newConfig.DATABASE_CONFIG.path}`);
            }
            configLines.push(`DATABASE_AUTO_MIGRATE=${newConfig.DATABASE_CONFIG.autoMigrate}`);
            configLines.push(`DATABASE_BACKUP_ON_MIGRATION=${newConfig.DATABASE_CONFIG.backupOnMigration}`);
            configLines.push(`DATABASE_HEALTH_CHECK_INTERVAL=${newConfig.DATABASE_CONFIG.healthCheckInterval}`);
            configLines.push(`DATABASE_CONNECTION_TIMEOUT=${newConfig.DATABASE_CONFIG.connectionTimeout}`);
            configLines.push(`DATABASE_RETRY_ATTEMPTS=${newConfig.DATABASE_CONFIG.retryAttempts}`);
            configLines.push(`DATABASE_RETRY_DELAY=${newConfig.DATABASE_CONFIG.retryDelay}`);
        }
        fs.writeFileSync(this.configFile, configLines.join('\n') + '\n');
        this.config = newConfig;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map