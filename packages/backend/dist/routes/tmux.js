"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmuxRoutes = void 0;
const express_1 = require("express");
const tmuxController_1 = require("../controllers/tmuxController");
const router = (0, express_1.Router)();
exports.tmuxRoutes = router;
// Get tmux session content
router.get('/sessions/:sessionName/content', async (req, res) => {
    try {
        const { sessionName } = req.params;
        const { window, lines } = req.query;
        const result = await tmuxController_1.tmuxController.getSessionContent(sessionName, window, lines ? parseInt(lines) : 100);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get session content'
        });
    }
});
// Get tmux session info
router.get('/sessions/:sessionName/info', async (req, res) => {
    try {
        const { sessionName } = req.params;
        const result = await tmuxController_1.tmuxController.getSessionInfo(sessionName);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get session info'
        });
    }
});
// Send command to tmux session
router.post('/sessions/:sessionName/command', async (req, res) => {
    try {
        const { sessionName } = req.params;
        const { command, window } = req.body;
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }
        const result = await tmuxController_1.tmuxController.sendCommand(sessionName, command, window);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Tmux command error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send command',
            message: 'Internal server error'
        });
    }
});
// List all tmux sessions
router.get('/sessions', async (req, res) => {
    try {
        const result = await tmuxController_1.tmuxController.listSessions();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list sessions'
        });
    }
});
//# sourceMappingURL=tmux.js.map