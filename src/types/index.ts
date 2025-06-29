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
    useDocker?: boolean;
    containerId?: string;
    portRange?: string;
  }
  
  export type AgentStatus = 'RUNNING' | 'STOPPED' | 'ERROR';
  
  export interface CreateAgentOptions {
    branch: string;
    agentId?: string;
    autoAccept?: boolean;
    useDocker?: boolean;
    portRange?: string;
    isolationMode?: 'strict' | 'permissive';
  }
  
  export interface AgentRecord {
    id: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
    useDocker?: boolean;
    containerId?: string;
    portRange?: string;
    isolationMode?: 'strict' | 'permissive';
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

  export interface DockerContainerOptions {
    agentId: string;
    projectPath: string;
    portRange: string;
    environment?: Record<string, string>;
    branch: string;
    projectName: string;
    isolationMode?: 'strict' | 'permissive';
  }

  export type ContainerStatus = 'running' | 'stopped' | 'paused' | 'restarting' | 'removing' | 'dead' | 'created' | 'exited';