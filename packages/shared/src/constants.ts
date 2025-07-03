// Default database configuration
export const DEFAULT_DATABASE_CONFIG = {
  enabled: true,
  autoMigrate: true,
  backupOnMigration: true,
  healthCheckInterval: 30, // 30 seconds
  connectionTimeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  DEFAULT_BASE_BRANCH: 'main',
  TMUX_SESSION_PREFIX: 'magents',
  WORKTREE_PREFIX: 'magents',
  MAX_AGENTS: 10,
  CLAUDE_CODE_PATH: 'claude',
  CLAUDE_AUTO_ACCEPT: true,
  DOCKER_ENABLED: false,
  DOCKER_IMAGE: 'node:18-alpine',
  DATABASE_CONFIG: DEFAULT_DATABASE_CONFIG as any,
} as const;

// Port ranges
export const PORT_RANGES = {
  DEFAULT_START: 3000,
  DEFAULT_END: 3999,
  BACKEND_DEFAULT: 3001,
  FRONTEND_DEFAULT: 4000,
  WS_DEFAULT: 3002,
} as const;

// Agent statuses
export const AGENT_STATUS = {
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
} as const;

// Project statuses
export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

// Task Master statuses
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
} as const;

// Task priorities
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// Docker defaults
export const DOCKER_DEFAULTS = {
  IMAGE: 'node:18-alpine',
  NETWORK: 'magents-network',
  VOLUME_PREFIX: 'magents-vol',
} as const;

// Environment types
export const ENVIRONMENT_TYPES = {
  LOCAL: 'local',
  CODESPACES: 'codespaces',
  GITPOD: 'gitpod',
  REMOTE_DOCKER: 'remote-docker',
  UNKNOWN: 'unknown',
} as const;

// File patterns
export const FILE_PATTERNS = {
  CLAUDE_CONFIG: ['.claude/**/*', '**/.claude/**/*'],
  MCP_CONFIG: ['.mcp.json', '**/mcp.json'],
  VSCODE_CONFIG: ['.vscode/**/*', '**/.vscode/**/*'],
  TASK_MASTER: ['.taskmaster/**/*'],
} as const;

// API endpoints (for backend/web communication)
export const API_ENDPOINTS = {
  AGENTS: '/api/agents',
  PROJECTS: '/api/projects',
  CONFIG: '/api/config',
  HEALTH: '/api/health',
  WS: '/ws',
} as const;

// WebSocket event types
export const WS_EVENTS = {
  AGENT_CREATED: 'agent:created',
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  AGENT_PROGRESS: 'agent:progress',
  AGENT_LOG: 'agent:log',
  PROJECT_UPDATED: 'project:updated',
  CONFIG_CHANGED: 'config:changed',
} as const;

// Error codes
export const ERROR_CODES = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  DOCKER_ERROR: 'DOCKER_ERROR',
  GIT_ERROR: 'GIT_ERROR',
  TMUX_ERROR: 'TMUX_ERROR',
  PORT_UNAVAILABLE: 'PORT_UNAVAILABLE',
  MAX_AGENTS_REACHED: 'MAX_AGENTS_REACHED',
} as const;

// Validation rules
export const VALIDATION = {
  AGENT_ID_MIN_LENGTH: 3,
  AGENT_ID_MAX_LENGTH: 50,
  BRANCH_NAME_MAX_LENGTH: 100,
  PROJECT_NAME_MAX_LENGTH: 50,
  MAX_PORT_RANGE_SIZE: 1000,
} as const;

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  COMMAND_DEFAULT: 30000,
  DOCKER_START: 60000,
  GIT_OPERATION: 30000,
  TMUX_ATTACH: 5000,
  HEALTH_CHECK: 10000,
} as const;

// Regular expressions
export const REGEX = {
  AGENT_ID: /^[a-z0-9-]+$/,
  BRANCH_NAME: /^[a-zA-Z0-9/_-]+$/,
  PORT_RANGE: /^\d+-\d+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SEMANTIC_VERSION: /^\d+\.\d+\.\d+$/,
} as const;

// CLI colors and themes
export const COLORS = {
  PRIMARY: '#4ECDC4',
  SUCCESS: '#26de81',
  WARNING: '#FED330',
  ERROR: '#FC5C65',
  INFO: '#45B7D1',
  MUTED: '#6c757d',
  HIGHLIGHT: '#A55EEA',
} as const;

// Log levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
} as const;

// Feature flags
export const FEATURES = {
  DOCKER_SUPPORT: true,
  WEB_DASHBOARD: true,
  TASK_MASTER_INTEGRATION: true,
  MULTI_PROJECT: true,
  PORT_MANAGEMENT: true,
  SETTINGS_SYNC: true,
} as const;