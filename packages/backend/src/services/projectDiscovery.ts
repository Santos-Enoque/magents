import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  DirectoryItem, 
  ProjectDiscoveryOptions, 
  GitRepositoryInfo, 
  ProjectValidationResult,
  GitRemote,
  TaskMasterConfig
} from '@magents/shared';

const execAsync = promisify(exec);

export class ProjectDiscoveryService {
  /**
   * Browse directories and build tree structure
   */
  async browseDirectory(options: ProjectDiscoveryOptions): Promise<DirectoryItem[]> {
    const { path: dirPath, maxDepth = 3, includeHidden = false } = options;
    
    // Validate and secure the path
    const normalizedPath = this.validatePath(dirPath);
    
    try {
      return await this.buildDirectoryTree(normalizedPath, maxDepth, includeHidden, 0);
    } catch (error) {
      throw new Error(`Failed to browse directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if a directory is a git repository and extract metadata
   */
  async validateGitRepository(dirPath: string): Promise<ProjectValidationResult> {
    const normalizedPath = this.validatePath(dirPath);
    const result: ProjectValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      // Check if directory exists
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        result.errors.push('Path is not a directory');
        return result;
      }

      // Check if it's a git repository
      const gitInfo = await this.getGitRepositoryInfo(normalizedPath);
      if (!gitInfo.isValid) {
        result.errors.push('Not a valid git repository');
        return result;
      }

      result.isValid = true;
      result.gitInfo = gitInfo;

      // Add warnings for potential issues
      if (!gitInfo.isClean) {
        result.warnings.push('Repository has uncommitted changes');
      }

      if (!gitInfo.branches || gitInfo.branches.length === 0) {
        result.warnings.push('No branches found in repository');
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Extract comprehensive git repository information
   */
  async getRepositoryMetadata(dirPath: string): Promise<GitRepositoryInfo> {
    const normalizedPath = this.validatePath(dirPath);
    return await this.getGitRepositoryInfo(normalizedPath);
  }

  /**
   * Build directory tree recursively
   */
  private async buildDirectoryTree(
    dirPath: string, 
    maxDepth: number, 
    includeHidden: boolean, 
    currentDepth: number
  ): Promise<DirectoryItem[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const items: DirectoryItem[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip hidden files/directories unless explicitly included
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const item: DirectoryItem = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file'
        };

        // Only include directories for project discovery
        if (entry.isDirectory()) {
          // Check if this directory is a git repository
          item.isGitRepo = await this.isGitRepository(fullPath);
          
          // Recursively get children if not at max depth
          if (currentDepth < maxDepth - 1) {
            item.children = await this.buildDirectoryTree(
              fullPath, 
              maxDepth, 
              includeHidden, 
              currentDepth + 1
            );
          }
        }

        items.push(item);
      }
    } catch (error) {
      // Log error but continue processing other directories
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return items.sort((a, b) => {
      // Sort directories first, then by name
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Check if a directory is a git repository
   */
  private async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      const gitDirPath = path.join(dirPath, '.git');
      const stats = await fs.stat(gitDirPath);
      return stats.isDirectory() || stats.isFile(); // .git can be a file in worktrees
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive git repository information
   */
  private async getGitRepositoryInfo(dirPath: string): Promise<GitRepositoryInfo> {
    const info: GitRepositoryInfo = {
      path: dirPath,
      isValid: false
    };

    try {
      // Check if it's a git repository
      info.isValid = await this.isGitRepository(dirPath);
      if (!info.isValid) {
        return info;
      }

      // Get current branch
      try {
        const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath });
        info.currentBranch = branchOutput.trim();
      } catch {
        // Ignore errors for detached HEAD or new repos
      }

      // Get all branches
      try {
        const { stdout: branchesOutput } = await execAsync('git branch -a', { cwd: dirPath });
        info.branches = branchesOutput
          .split('\n')
          .map(branch => branch.trim().replace(/^\*\s*/, '').replace(/^remotes\/[^/]+\//, ''))
          .filter(branch => branch && !branch.includes('HEAD ->'))
          .filter((branch, index, arr) => arr.indexOf(branch) === index); // Remove duplicates
      } catch {
        info.branches = [];
      }

      // Get remotes
      try {
        const { stdout: remotesOutput } = await execAsync('git remote -v', { cwd: dirPath });
        const remotes: GitRemote[] = [];
        remotesOutput.split('\n').forEach(line => {
          const match = line.match(/^(\S+)\s+(\S+)\s+\((\S+)\)$/);
          if (match) {
            remotes.push({
              name: match[1],
              url: match[2],
              type: match[3] as 'fetch' | 'push'
            });
          }
        });
        info.remotes = remotes;
      } catch {
        info.remotes = [];
      }

      // Get last commit
      try {
        const { stdout: commitOutput } = await execAsync(
          'git log -1 --pretty=format:"%H|%s|%an|%ai"', 
          { cwd: dirPath }
        );
        const [hash, message, author, dateStr] = commitOutput.split('|');
        info.lastCommit = {
          hash,
          message,
          author,
          date: new Date(dateStr)
        };
      } catch {
        // No commits yet or other error
      }

      // Check if working directory is clean
      try {
        const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: dirPath });
        info.isClean = statusOutput.trim().length === 0;
      } catch {
        info.isClean = false;
      }

      // Check for TaskMaster configuration
      try {
        const taskMasterConfigPath = path.join(dirPath, '.taskmaster', 'config.json');
        await fs.access(taskMasterConfigPath);
        info.hasTaskMaster = true;
        
        try {
          const configContent = await fs.readFile(taskMasterConfigPath, 'utf-8');
          info.taskMasterConfig = JSON.parse(configContent) as TaskMasterConfig;
        } catch {
          // Config file exists but couldn't parse
        }
      } catch {
        info.hasTaskMaster = false;
      }

    } catch (error) {
      console.warn(`Failed to get git info for ${dirPath}:`, error);
    }

    return info;
  }

  /**
   * Validate and normalize file paths to prevent directory traversal
   */
  private validatePath(inputPath: string): string {
    // Resolve the path to handle relative paths and remove '..' components
    const resolvedPath = path.resolve(inputPath);
    
    // Basic security check - ensure path doesn't go outside reasonable boundaries
    // In production, you might want more sophisticated validation
    if (resolvedPath.includes('..')) {
      throw new Error('Invalid path: path traversal not allowed');
    }

    // Ensure the path exists and is accessible
    try {
      // This is a sync call but it's for security validation
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('fs').accessSync(resolvedPath);
    } catch {
      throw new Error('Path does not exist or is not accessible');
    }

    return resolvedPath;
  }
}

export const projectDiscoveryService = new ProjectDiscoveryService();