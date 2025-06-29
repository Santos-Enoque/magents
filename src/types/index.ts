export interface MagentsConfig {
    DEFAULT_BASE_BRANCH: string;
    TMUX_SESSION_PREFIX: string;
    WORKTREE_PREFIX: string;
    MAX_AGENTS: number;
    CLAUDE_CODE_PATH: string;
    CLAUDE_AUTO_ACCEPT: boolean;
  }
  
  export interface Agent {
    id: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
    status: AgentStatus;
    createdAt: Date;
    environment?: AgentEnvironment;
    context?: AgentContext;
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
    autoAccept?: boolean;
    environment?: Partial<AgentEnvironment>;
    context?: AgentContext;
  }
  
  export interface AgentRecord {
    id: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
    environment?: AgentEnvironment;
    context?: AgentContext;
  }
  
  export interface CreateAgentResult {
    agentId: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
  }

  export interface CleanupResult {
    stopped: number;
    errors: string[];
  }

  export interface CommandResult<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
  }
  
  export interface GitWorktreeInfo {
    path: string;
    branch: string;
    head: string;
  }