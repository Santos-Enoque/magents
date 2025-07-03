"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURES = exports.LOG_LEVELS = exports.COLORS = exports.REGEX = exports.TIMEOUTS = exports.VALIDATION = exports.ERROR_CODES = exports.WS_EVENTS = exports.API_ENDPOINTS = exports.FILE_PATTERNS = exports.ENVIRONMENT_TYPES = exports.DOCKER_DEFAULTS = exports.TASK_PRIORITY = exports.TASK_STATUS = exports.PROJECT_STATUS = exports.AGENT_STATUS = exports.PORT_RANGES = exports.DEFAULT_CONFIG = void 0;
// Default configuration values
exports.DEFAULT_CONFIG = {
    DEFAULT_BASE_BRANCH: 'main',
    TMUX_SESSION_PREFIX: 'magents',
    WORKTREE_PREFIX: 'magents',
    MAX_AGENTS: 10,
    CLAUDE_CODE_PATH: 'claude',
    CLAUDE_AUTO_ACCEPT: true,
    DOCKER_ENABLED: false,
    DOCKER_IMAGE: 'node:18-alpine',
};
// Port ranges
exports.PORT_RANGES = {
    DEFAULT_START: 3000,
    DEFAULT_END: 3999,
    BACKEND_DEFAULT: 3001,
    FRONTEND_DEFAULT: 4000,
    WS_DEFAULT: 3002,
};
// Agent statuses
exports.AGENT_STATUS = {
    RUNNING: 'RUNNING',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR',
};
// Project statuses
exports.PROJECT_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
};
// Task Master statuses
exports.TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    DONE: 'done',
    BLOCKED: 'blocked',
    CANCELLED: 'cancelled',
};
// Task priorities
exports.TASK_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};
// Docker defaults
exports.DOCKER_DEFAULTS = {
    IMAGE: 'node:18-alpine',
    NETWORK: 'magents-network',
    VOLUME_PREFIX: 'magents-vol',
};
// Environment types
exports.ENVIRONMENT_TYPES = {
    LOCAL: 'local',
    CODESPACES: 'codespaces',
    GITPOD: 'gitpod',
    REMOTE_DOCKER: 'remote-docker',
    UNKNOWN: 'unknown',
};
// File patterns
exports.FILE_PATTERNS = {
    CLAUDE_CONFIG: ['.claude/**/*', '**/.claude/**/*'],
    MCP_CONFIG: ['.mcp.json', '**/mcp.json'],
    VSCODE_CONFIG: ['.vscode/**/*', '**/.vscode/**/*'],
    TASK_MASTER: ['.taskmaster/**/*'],
};
// API endpoints (for backend/web communication)
exports.API_ENDPOINTS = {
    AGENTS: '/api/agents',
    PROJECTS: '/api/projects',
    CONFIG: '/api/config',
    HEALTH: '/api/health',
    WS: '/ws',
};
// WebSocket event types
exports.WS_EVENTS = {
    AGENT_CREATED: 'agent:created',
    AGENT_STARTED: 'agent:started',
    AGENT_STOPPED: 'agent:stopped',
    AGENT_ERROR: 'agent:error',
    AGENT_PROGRESS: 'agent:progress',
    AGENT_LOG: 'agent:log',
    PROJECT_UPDATED: 'project:updated',
    CONFIG_CHANGED: 'config:changed',
};
// Error codes
exports.ERROR_CODES = {
    AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
    AGENT_ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
    PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
    INVALID_CONFIG: 'INVALID_CONFIG',
    DOCKER_ERROR: 'DOCKER_ERROR',
    GIT_ERROR: 'GIT_ERROR',
    TMUX_ERROR: 'TMUX_ERROR',
    PORT_UNAVAILABLE: 'PORT_UNAVAILABLE',
    MAX_AGENTS_REACHED: 'MAX_AGENTS_REACHED',
};
// Validation rules
exports.VALIDATION = {
    AGENT_ID_MIN_LENGTH: 3,
    AGENT_ID_MAX_LENGTH: 50,
    BRANCH_NAME_MAX_LENGTH: 100,
    PROJECT_NAME_MAX_LENGTH: 50,
    MAX_PORT_RANGE_SIZE: 1000,
};
// Timeouts (in milliseconds)
exports.TIMEOUTS = {
    COMMAND_DEFAULT: 30000,
    DOCKER_START: 60000,
    GIT_OPERATION: 30000,
    TMUX_ATTACH: 5000,
    HEALTH_CHECK: 10000,
};
// Regular expressions
exports.REGEX = {
    AGENT_ID: /^[a-z0-9-]+$/,
    BRANCH_NAME: /^[a-zA-Z0-9/_-]+$/,
    PORT_RANGE: /^\d+-\d+$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    SEMANTIC_VERSION: /^\d+\.\d+\.\d+$/,
};
// CLI colors and themes
exports.COLORS = {
    PRIMARY: '#4ECDC4',
    SUCCESS: '#26de81',
    WARNING: '#FED330',
    ERROR: '#FC5C65',
    INFO: '#45B7D1',
    MUTED: '#6c757d',
    HIGHLIGHT: '#A55EEA',
};
// Log levels
exports.LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
};
// Feature flags
exports.FEATURES = {
    DOCKER_SUPPORT: true,
    WEB_DASHBOARD: true,
    TASK_MASTER_INTEGRATION: true,
    MULTI_PROJECT: true,
    PORT_MANAGEMENT: true,
    SETTINGS_SYNC: true,
};
//# sourceMappingURL=constants.js.map