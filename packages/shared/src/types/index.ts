// Database configuration interfaces
export interface DatabaseConfig {
  enabled: boolean;
  path?: string;
  autoMigrate: boolean;
  backupOnMigration: boolean;
  healthCheckInterval: number; // seconds
  connectionTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

// Core configuration interfaces
export interface MagentsConfig {
  DEFAULT_BASE_BRANCH: string;
  TMUX_SESSION_PREFIX: string; // Deprecated - kept for backward compatibility
  WORKTREE_PREFIX: string;
  MAX_AGENTS: number;
  CLAUDE_CODE_PATH: string;
  CLAUDE_AUTO_ACCEPT: boolean;
  DOCKER_ENABLED: boolean; // Always true in new version
  DOCKER_IMAGE: string;
  MODE?: 'simple' | 'standard' | 'advanced';
  TASK_MASTER_ENABLED?: boolean;
  TASKMASTER_AUTO_INSTALL?: boolean;
  GITHUB_INTEGRATION?: boolean;
  MCP_ENABLED?: boolean;
  CUSTOM_COMMANDS_ENABLED?: boolean;
  MCP_DEVELOPMENT_MODE?: boolean;
  ADVANCED_DOCKER_CONFIG?: boolean;
  DATABASE_CONFIG?: DatabaseConfig;
}

// Agent interfaces
export interface Agent {
  id: string;
  branch: string;
  worktreePath: string;
  tmuxSession: string;
  status: AgentStatus;
  createdAt: Date;
  updatedAt?: Date;
  projectId: string; // Required - agents must be associated with a project
  autoAccept?: boolean;
  useDocker?: boolean;
  config?: Record<string, any>;
}

export type AgentStatus = 'RUNNING' | 'STOPPED' | 'ERROR';

export interface AgentEnvironment {
  PROJECT_ROOT: string;
  PROJECT_NAME: string;
  ALLOWED_PORTS?: string;
  AGENT_ID: string;
  AGENT_TASK?: string;
  ISOLATION_MODE?: 'strict' | 'permissive';
}

export interface AgentContext {
  task?: string;
  services?: Record<string, string>;
  boundaries?: string[];
}

export interface CreateAgentOptions {
  branch: string;
  agentId?: string;
  projectPath?: string;
  autoAccept?: boolean;
  environment?: Partial<AgentEnvironment>;
  context?: AgentContext;
  useDocker?: boolean;
  dockerOptions?: DockerContainerOptions;
  projectId: string; // Required - agents must be associated with a project
}

export interface AgentRecord {
  id: string;
  branch: string;
  worktreePath: string;
  tmuxSession: string;
  environment?: AgentEnvironment;
  context?: AgentContext;
  useDocker?: boolean;
  dockerContainer?: string;
  projectId: string; // Required - agents must be associated with a project
  portRange?: string;
}

export interface CreateAgentResult {
  agentId: string;
  branch: string;
  worktreePath: string;
  tmuxSession: string;
}

// Common result interfaces
export interface CleanupResult {
  stopped: number;
  errors: string[];
}

export interface CommandResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Git interfaces
export interface GitWorktreeInfo {
  path: string;
  branch: string;
  head: string;
}

// Docker interfaces
export interface DockerContainerOptions {
  name: string;
  image?: string;
  ports?: string;
  volumes?: string[];
  env?: Record<string, string>;
  network?: string;
}

export interface ContainerStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  ports: string[];
}

// Project interfaces
export interface Project {
  id: string;
  name: string;
  path: string;
  agents: string[];
  portRange?: [number, number];
  dockerNetwork?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt?: Date;
  description?: string;
  tags?: string[];
}

export type ProjectStatus = 'ACTIVE' | 'INACTIVE';

export interface CreateProjectOptions {
  name?: string;
  path?: string;
  ports?: string;
  docker?: boolean;
  description?: string;
  tags?: string[];
}

// Port management interfaces
export interface PortAllocation {
  port: number;
  service: string;
  projectId: string;
  agentId?: string;
}

export interface PortRange {
  start: number;
  end: number;
}

// Settings interfaces
export interface SettingsFile {
  path: string;
  type: 'claude' | 'mcp' | 'vscode' | 'other';
  priority: number;
}

export interface SettingsSyncResult {
  success: boolean;
  files: string[];
  errors?: string[];
}

// Environment detection interfaces
export interface EnvironmentInfo {
  type: 'local' | 'codespaces' | 'gitpod' | 'remote-docker' | 'unknown';
  isRemote: boolean;
  hasDocker: boolean;
  resourceLimits?: {
    maxAgents: number;
    maxMemory?: string;
    maxCpu?: number;
  };
}

export interface EnvironmentConfig {
  claudeFlags: string[];
  maxAgents: number;
  useDocker: boolean;
  defaultIsolation: 'none' | 'process' | 'container';
}

// API interfaces for backend/web communication
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket interfaces
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  agentId?: string;
}

export interface AgentEvent {
  agentId: string;
  event: 'created' | 'started' | 'stopped' | 'error' | 'progress';
  data?: any;
  timestamp: Date;
}

// Agent creation progress tracking
export interface AgentCreationProgress {
  step: number;
  totalSteps: number;
  currentStep: AgentCreationStep;
  message: string;
  percentage: number;
  error?: string;
}

export interface AgentCreationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ProgressCallback {
  (progress: AgentCreationProgress): void;
}

// Task Master integration interfaces
export interface TaskMasterTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  subtasks?: TaskMasterTask[];
  details?: string;
  testStrategy?: string;
}

export interface TaskMasterConfig {
  apiKey?: string;
  models?: {
    main?: string;
    research?: string;
    fallback?: string;
  };
  research?: boolean;
}

// Project Discovery interfaces
export interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isGitRepo?: boolean;
  children?: DirectoryItem[];
}

export interface ProjectDiscoveryOptions {
  path: string;
  maxDepth?: number;
  includeHidden?: boolean;
}

export interface GitRepositoryInfo {
  path: string;
  isValid: boolean;
  currentBranch?: string;
  branches?: string[];
  remotes?: GitRemote[];
  lastCommit?: GitCommit;
  isClean?: boolean;
  hasTaskMaster?: boolean;
  taskMasterConfig?: TaskMasterConfig;
}

export interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  gitInfo?: GitRepositoryInfo;
}