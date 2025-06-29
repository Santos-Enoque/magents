export declare class GitService {
    getRepoRoot(): string;
    prepareBranch(branchName: string, baseBranch: string): Promise<void>;
    createWorktree(worktreePath: string, branchName: string, baseBranch?: string): Promise<void>;
    removeWorktree(worktreePath: string): Promise<void>;
    getWorktrees(): Array<{
        path: string;
        branch: string;
        head: string;
    }>;
    private branchExists;
    private remoteBranchExists;
}
//# sourceMappingURL=GitService.d.ts.map