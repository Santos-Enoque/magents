"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
const child_process_1 = require("child_process");
class GitService {
    getRepoRoot() {
        try {
            const result = (0, child_process_1.execSync)('git rev-parse --show-toplevel', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            return result.trim();
        }
        catch (error) {
            throw new Error('Not in a git repository');
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async prepareBranch(branchName, baseBranch) {
        try {
            // Check if branch exists locally
            const branchExists = this.branchExists(branchName);
            if (branchExists) {
                // Branch exists, just use it
                return;
            }
            // Check if branch exists on remote
            const remoteBranchExists = this.remoteBranchExists(branchName);
            if (remoteBranchExists) {
                // Branch exists on remote but not locally - worktree will fetch it
                return;
            }
            // Create new branch without switching to it
            // Use the worktree command to create the branch when creating the worktree
            // This avoids switching branches in the main repository
        }
        catch (error) {
            throw new Error(`Failed to prepare branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async createWorktree(worktreePath, branchName, baseBranch) {
        try {
            // Check if branch is already checked out in another worktree
            const worktrees = this.getWorktrees();
            const branchInUse = worktrees.find(wt => wt.branch === branchName);
            if (branchInUse) {
                throw new Error(`Branch '${branchName}' is already checked out at '${branchInUse.path}'`);
            }
            // If branch doesn't exist locally or remotely, create it from base branch
            const localExists = this.branchExists(branchName);
            const remoteExists = this.remoteBranchExists(branchName);
            if (!localExists && !remoteExists && baseBranch) {
                // Create new branch in the worktree directly from base branch
                (0, child_process_1.execSync)(`git worktree add -b ${branchName} "${worktreePath}" ${baseBranch}`, { stdio: 'pipe' });
            }
            else {
                // Branch exists, just create the worktree
                (0, child_process_1.execSync)(`git worktree add "${worktreePath}" ${branchName}`, { stdio: 'pipe' });
            }
        }
        catch (error) {
            throw new Error(`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async removeWorktree(worktreePath) {
        try {
            // Get the parent directory of the worktree path
            const parentDir = worktreePath.split('/').slice(0, -1).join('/');
            // Try to find git repository by checking parent directories
            let gitRoot = null;
            let currentDir = parentDir;
            // Walk up the directory tree to find a git repository
            while (currentDir && currentDir !== '/' && currentDir !== '.') {
                try {
                    const result = (0, child_process_1.execSync)('git rev-parse --show-toplevel', {
                        cwd: currentDir,
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim();
                    if (result) {
                        gitRoot = result;
                        break;
                    }
                }
                catch {
                    // Not a git repo, try parent directory
                    const parts = currentDir.split('/');
                    parts.pop();
                    currentDir = parts.join('/') || '/';
                }
            }
            if (!gitRoot) {
                throw new Error('Could not find git repository for worktree');
            }
            // Execute the worktree remove command from the git repository root
            (0, child_process_1.execSync)(`git worktree remove "${worktreePath}" --force`, {
                cwd: gitRoot,
                stdio: 'pipe'
            });
        }
        catch (error) {
            throw new Error(`Failed to remove worktree: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getWorktrees() {
        try {
            const result = (0, child_process_1.execSync)('git worktree list --porcelain', { encoding: 'utf8', stdio: 'pipe' });
            const worktrees = [];
            const entries = result.split('\n\n').filter(entry => entry.trim());
            entries.forEach(entry => {
                const lines = entry.split('\n');
                const worktree = {};
                lines.forEach(line => {
                    if (line.startsWith('worktree ')) {
                        worktree.path = line.substring('worktree '.length);
                    }
                    else if (line.startsWith('branch ')) {
                        worktree.branch = line.substring('branch refs/heads/'.length);
                    }
                    else if (line.startsWith('HEAD ')) {
                        worktree.head = line.substring('HEAD '.length);
                    }
                });
                if (worktree.path && worktree.branch && worktree.head) {
                    worktrees.push({
                        path: worktree.path,
                        branch: worktree.branch,
                        head: worktree.head
                    });
                }
            });
            return worktrees;
        }
        catch (error) {
            throw new Error(`Failed to list worktrees: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    branchExists(branchName) {
        try {
            (0, child_process_1.execSync)(`git show-ref --verify --quiet refs/heads/${branchName}`, { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    remoteBranchExists(branchName) {
        try {
            (0, child_process_1.execSync)(`git ls-remote --exit-code --heads origin ${branchName}`, { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=GitService.js.map