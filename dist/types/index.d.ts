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
    projectId?: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
    status: AgentStatus;
    createdAt: Date;
}
export type AgentStatus = 'RUNNING' | 'STOPPED' | 'ERROR';
export interface CreateAgentOptions {
    branch: string;
    agentId?: string;
    autoAccept?: boolean;
}
export interface AgentRecord {
    id: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
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
export interface Project {
    id: string;
    path: string;
    name: string;
    container?: string;
    agents: string[];
    portRange: [number, number];
    status: ProjectStatus;
    createdAt: Date;
}
export type ProjectStatus = 'ACTIVE' | 'STOPPED' | 'ERROR';
export interface CreateProjectOptions {
    path: string;
    name?: string;
    portRange?: [number, number];
}
//# sourceMappingURL=index.d.ts.map