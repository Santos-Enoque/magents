"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TmuxService = void 0;
const child_process_1 = require("child_process");
class TmuxService {
    async createSession(sessionName, workingDir, config) {
        try {
            // Create new session
            (0, child_process_1.execSync)(`tmux new-session -d -s "${sessionName}" -c "${workingDir}"`, { stdio: 'pipe' });
            // Rename first window
            (0, child_process_1.execSync)(`tmux rename-window -t "${sessionName}:0" "main"`, { stdio: 'pipe' });
            // Create claude window
            (0, child_process_1.execSync)(`tmux new-window -t "${sessionName}" -n "claude" -c "${workingDir}"`, { stdio: 'pipe' });
            // Create git window
            (0, child_process_1.execSync)(`tmux new-window -t "${sessionName}" -n "git" -c "${workingDir}"`, { stdio: 'pipe' });
            // Build Claude Code command
            let claudeCmd = config.CLAUDE_CODE_PATH;
            if (config.CLAUDE_AUTO_ACCEPT) {
                claudeCmd += ' --accept-all';
            }
            // Start Claude Code in the claude window
            (0, child_process_1.execSync)(`tmux send-keys -t "${sessionName}:claude" "cd '${workingDir}' && ${claudeCmd}" Enter`, { stdio: 'pipe' });
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
                (0, child_process_1.execSync)(`tmux send-keys -t "${sessionName}:git" "${cmd}" Enter`, { stdio: 'pipe' });
            });
            // Select the claude window by default
            (0, child_process_1.execSync)(`tmux select-window -t "${sessionName}:claude"`, { stdio: 'pipe' });
        }
        catch (error) {
            throw new Error(`Failed to create tmux session: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    sessionExists(sessionName) {
        try {
            (0, child_process_1.execSync)(`tmux has-session -t "${sessionName}"`, { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    async attachToSession(sessionName) {
        try {
            // Use spawn instead of execSync to replace current process
            const child = (0, child_process_1.spawn)('tmux', ['attach-session', '-t', sessionName], {
                stdio: 'inherit'
            });
            return new Promise((resolve, reject) => {
                child.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error(`tmux attach failed with code ${code}`));
                    }
                });
                child.on('error', (error) => {
                    reject(new Error(`Failed to attach to tmux session: ${error.message}`));
                });
            });
        }
        catch (error) {
            throw new Error(`Failed to attach to session: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async killSession(sessionName) {
        try {
            (0, child_process_1.execSync)(`tmux kill-session -t "${sessionName}"`, { stdio: 'pipe' });
        }
        catch (error) {
            // Session might not exist, which is fine
            const errorString = error instanceof Error ? error.message : String(error);
            if (!errorString.includes('session not found')) {
                throw new Error(`Failed to kill tmux session: ${errorString}`);
            }
        }
    }
    listSessions() {
        try {
            const result = (0, child_process_1.execSync)('tmux list-sessions -F "#{session_name}"', {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return result.trim().split('\n').filter(line => line.trim());
        }
        catch {
            return [];
        }
    }
}
exports.TmuxService = TmuxService;
//# sourceMappingURL=TmuxService.js.map