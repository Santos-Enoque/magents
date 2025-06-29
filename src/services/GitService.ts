import { execSync } from 'child_process';

export class GitService {
  public getRepoRoot(): string {
    try {
      const result = execSync('git rev-parse --show-toplevel', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.trim();
    } catch (error) {
      throw new Error('Not in a git repository');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async prepareBranch(branchName: string, baseBranch: string): Promise<void> {
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
      
    } catch (error) {
      throw new Error(`Failed to prepare branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async createWorktree(worktreePath: string, branchName: string, baseBranch?: string): Promise<void> {
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
        execSync(`git worktree add -b ${branchName} "${worktreePath}" ${baseBranch}`, { stdio: 'pipe' });
      } else {
        // Branch exists, just create the worktree
        execSync(`git worktree add "${worktreePath}" ${branchName}`, { stdio: 'pipe' });
      }
    } catch (error) {
      throw new Error(`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async removeWorktree(worktreePath: string): Promise<void> {
    try {
      execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to remove worktree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getWorktrees(): Array<{ path: string; branch: string; head: string }> {
    try {
      const result = execSync('git worktree list --porcelain', { encoding: 'utf8', stdio: 'pipe' });
      const worktrees: Array<{ path: string; branch: string; head: string }> = [];
      
      const entries = result.split('\n\n').filter(entry => entry.trim());
      
      entries.forEach(entry => {
        const lines = entry.split('\n');
        const worktree: { path?: string; branch?: string; head?: string } = {};
        
        lines.forEach(line => {
          if (line.startsWith('worktree ')) {
            worktree.path = line.substring('worktree '.length);
          } else if (line.startsWith('branch ')) {
            worktree.branch = line.substring('branch refs/heads/'.length);
          } else if (line.startsWith('HEAD ')) {
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
    } catch (error) {
      throw new Error(`Failed to list worktrees: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private branchExists(branchName: string): boolean {
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private remoteBranchExists(branchName: string): boolean {
    try {
      execSync(`git ls-remote --exit-code --heads origin ${branchName}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}