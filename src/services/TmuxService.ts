import { execSync, spawn } from 'child_process';
import { MagentsConfig } from '../types';

export class TmuxService {
  public async createSession(sessionName: string, workingDir: string, config: MagentsConfig): Promise<void> {
    try {
      // Create new session
      execSync(`tmux new-session -d -s "${sessionName}" -c "${workingDir}"`, { stdio: 'pipe' });
      
      // Rename first window
      execSync(`tmux rename-window -t "${sessionName}:0" "main"`, { stdio: 'pipe' });
      
      // Create claude window
      execSync(`tmux new-window -t "${sessionName}" -n "claude" -c "${workingDir}"`, { stdio: 'pipe' });
      
      // Create git window
      execSync(`tmux new-window -t "${sessionName}" -n "git" -c "${workingDir}"`, { stdio: 'pipe' });
      
      // Build Claude Code command
      let claudeCmd = config.CLAUDE_CODE_PATH;
      if (config.CLAUDE_AUTO_ACCEPT) {
        claudeCmd += ' --accept-all';
      }
      
      // Start Claude Code in the claude window
      execSync(`tmux send-keys -t "${sessionName}:claude" "cd '${workingDir}' && ${claudeCmd}" Enter`, { stdio: 'pipe' });
      
      // Setup git window with helpful info
      const gitCommands = [
        `cd '${workingDir}'`,
        `echo 'Git commands for this worktree:'`,
        `echo '  git status'`,
        `echo '  git add . && git commit -m "message"'`,
        `echo '  git push'`,
        `echo ''`
      ];
      
      gitCommands.forEach(cmd => {
        execSync(`tmux send-keys -t "${sessionName}:git" "${cmd}" Enter`, { stdio: 'pipe' });
      });
      
      // Select the claude window by default
      execSync(`tmux select-window -t "${sessionName}:claude"`, { stdio: 'pipe' });
      
    } catch (error) {
      throw new Error(`Failed to create tmux session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public sessionExists(sessionName: string): boolean {
    try {
      execSync(`tmux has-session -t "${sessionName}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  public async attachToSession(sessionName: string): Promise<void> {
    try {
      // Use spawn instead of execSync to replace current process
      const child = spawn('tmux', ['attach-session', '-t', sessionName], {
        stdio: 'inherit'
      });

      return new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`tmux attach failed with code ${code}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to attach to tmux session: ${error.message}`));
        });
      });

    } catch (error) {
      throw new Error(`Failed to attach to session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async killSession(sessionName: string): Promise<void> {
    try {
      execSync(`tmux kill-session -t "${sessionName}"`, { stdio: 'pipe' });
    } catch (error) {
      // Session might not exist, which is fine
      const errorString = error instanceof Error ? error.message : String(error);
      if (!errorString.includes('session not found')) {
        throw new Error(`Failed to kill tmux session: ${errorString}`);
      }
    }
  }

  public listSessions(): string[] {
    try {
      const result = execSync('tmux list-sessions -F "#{session_name}"', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return result.trim().split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }
}