export declare const DEFAULT_CONFIG: {
    readonly DEFAULT_BASE_BRANCH: "main";
    readonly TMUX_SESSION_PREFIX: "magents";
    readonly WORKTREE_PREFIX: "magents";
    readonly MAX_AGENTS: 10;
    readonly CLAUDE_CODE_PATH: "claude";
    readonly CLAUDE_AUTO_ACCEPT: true;
    readonly DOCKER_ENABLED: false;
    readonly DOCKER_IMAGE: "node:18-alpine";
};
export declare const PORT_RANGES: {
    readonly DEFAULT_START: 3000;
    readonly DEFAULT_END: 3999;
    readonly BACKEND_DEFAULT: 3001;
    readonly FRONTEND_DEFAULT: 4000;
    readonly WS_DEFAULT: 3002;
};
export declare const AGENT_STATUS: {
    readonly RUNNING: "RUNNING";
    readonly STOPPED: "STOPPED";
    readonly ERROR: "ERROR";
};
export declare const PROJECT_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
};
export declare const TASK_STATUS: {
    readonly PENDING: "pending";
    readonly IN_PROGRESS: "in-progress";
    readonly DONE: "done";
    readonly BLOCKED: "blocked";
    readonly CANCELLED: "cancelled";
};
export declare const TASK_PRIORITY: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
export declare const DOCKER_DEFAULTS: {
    readonly IMAGE: "node:18-alpine";
    readonly NETWORK: "magents-network";
    readonly VOLUME_PREFIX: "magents-vol";
};
export declare const ENVIRONMENT_TYPES: {
    readonly LOCAL: "local";
    readonly CODESPACES: "codespaces";
    readonly GITPOD: "gitpod";
    readonly REMOTE_DOCKER: "remote-docker";
    readonly UNKNOWN: "unknown";
};
export declare const FILE_PATTERNS: {
    readonly CLAUDE_CONFIG: readonly [".claude/**/*", "**/.claude/**/*"];
    readonly MCP_CONFIG: readonly [".mcp.json", "**/mcp.json"];
    readonly VSCODE_CONFIG: readonly [".vscode/**/*", "**/.vscode/**/*"];
    readonly TASK_MASTER: readonly [".taskmaster/**/*"];
};
export declare const API_ENDPOINTS: {
    readonly AGENTS: "/api/agents";
    readonly PROJECTS: "/api/projects";
    readonly CONFIG: "/api/config";
    readonly HEALTH: "/api/health";
    readonly WS: "/ws";
};
export declare const WS_EVENTS: {
    readonly AGENT_CREATED: "agent:created";
    readonly AGENT_STARTED: "agent:started";
    readonly AGENT_STOPPED: "agent:stopped";
    readonly AGENT_ERROR: "agent:error";
    readonly AGENT_PROGRESS: "agent:progress";
    readonly AGENT_LOG: "agent:log";
    readonly PROJECT_UPDATED: "project:updated";
    readonly CONFIG_CHANGED: "config:changed";
};
export declare const ERROR_CODES: {
    readonly AGENT_NOT_FOUND: "AGENT_NOT_FOUND";
    readonly AGENT_ALREADY_EXISTS: "AGENT_ALREADY_EXISTS";
    readonly PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND";
    readonly INVALID_CONFIG: "INVALID_CONFIG";
    readonly DOCKER_ERROR: "DOCKER_ERROR";
    readonly GIT_ERROR: "GIT_ERROR";
    readonly TMUX_ERROR: "TMUX_ERROR";
    readonly PORT_UNAVAILABLE: "PORT_UNAVAILABLE";
    readonly MAX_AGENTS_REACHED: "MAX_AGENTS_REACHED";
};
export declare const VALIDATION: {
    readonly AGENT_ID_MIN_LENGTH: 3;
    readonly AGENT_ID_MAX_LENGTH: 50;
    readonly BRANCH_NAME_MAX_LENGTH: 100;
    readonly PROJECT_NAME_MAX_LENGTH: 50;
    readonly MAX_PORT_RANGE_SIZE: 1000;
};
export declare const TIMEOUTS: {
    readonly COMMAND_DEFAULT: 30000;
    readonly DOCKER_START: 60000;
    readonly GIT_OPERATION: 30000;
    readonly TMUX_ATTACH: 5000;
    readonly HEALTH_CHECK: 10000;
};
export declare const REGEX: {
    readonly AGENT_ID: RegExp;
    readonly BRANCH_NAME: RegExp;
    readonly PORT_RANGE: RegExp;
    readonly EMAIL: RegExp;
    readonly SEMANTIC_VERSION: RegExp;
};
export declare const COLORS: {
    readonly PRIMARY: "#4ECDC4";
    readonly SUCCESS: "#26de81";
    readonly WARNING: "#FED330";
    readonly ERROR: "#FC5C65";
    readonly INFO: "#45B7D1";
    readonly MUTED: "#6c757d";
    readonly HIGHLIGHT: "#A55EEA";
};
export declare const LOG_LEVELS: {
    readonly ERROR: 0;
    readonly WARN: 1;
    readonly INFO: 2;
    readonly DEBUG: 3;
    readonly TRACE: 4;
};
export declare const FEATURES: {
    readonly DOCKER_SUPPORT: true;
    readonly WEB_DASHBOARD: true;
    readonly TASK_MASTER_INTEGRATION: true;
    readonly MULTI_PROJECT: true;
    readonly PORT_MANAGEMENT: true;
    readonly SETTINGS_SYNC: true;
};
//# sourceMappingURL=constants.d.ts.map