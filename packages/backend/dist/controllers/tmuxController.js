"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmuxController = void 0;
const cli_1 = require("@magents/cli");
// Initialize the TmuxService to connect to tmux sessions
const tmuxService = new cli_1.TmuxService();
exports.tmuxController = {
    async getSessionContent(sessionName, windowName, lines = 100) {
        try {
            // Check if session exists
            if (!tmuxService.sessionExists(sessionName)) {
                throw new Error(`Tmux session '${sessionName}' not found`);
            }
            // Get session info
            const sessionInfo = tmuxService.getSessionInfo(sessionName);
            if (!sessionInfo) {
                throw new Error(`Failed to get session info for '${sessionName}'`);
            }
            // Capture pane content
            const content = tmuxService.capturePane(sessionName, windowName, lines);
            return {
                sessionName,
                windowName: windowName || sessionInfo.activeWindow,
                windows: sessionInfo.windows,
                activeWindow: sessionInfo.activeWindow,
                content,
                lines,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error(`Failed to get session content: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
    async getSessionInfo(sessionName) {
        try {
            if (!tmuxService.sessionExists(sessionName)) {
                throw new Error(`Tmux session '${sessionName}' not found`);
            }
            const sessionInfo = tmuxService.getSessionInfo(sessionName);
            if (!sessionInfo) {
                throw new Error(`Failed to get session info for '${sessionName}'`);
            }
            return {
                sessionName,
                windows: sessionInfo.windows,
                activeWindow: sessionInfo.activeWindow,
                exists: true
            };
        }
        catch (error) {
            throw new Error(`Failed to get session info: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
    async sendCommand(sessionName, command, windowName) {
        try {
            if (!tmuxService.sessionExists(sessionName)) {
                throw new Error(`Tmux session '${sessionName}' not found`);
            }
            tmuxService.sendCommand(sessionName, command, windowName);
            return {
                sessionName,
                windowName,
                command,
                timestamp: new Date().toISOString(),
                success: true
            };
        }
        catch (error) {
            throw new Error(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
    async listSessions() {
        try {
            const sessions = tmuxService.listSessions();
            return {
                sessions,
                count: sessions.length
            };
        }
        catch (error) {
            throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
//# sourceMappingURL=tmuxController.js.map