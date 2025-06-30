"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRoutes = void 0;
const express_1 = require("express");
const agentController_1 = require("../controllers/agentController");
const router = (0, express_1.Router)();
exports.agentRoutes = router;
// GET /api/agents - List all agents
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const result = await agentController_1.agentController.listAgents({ page, limit, status });
        const response = {
            success: true,
            data: result.agents,
            pagination: result.pagination
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// GET /api/agents/:id - Get specific agent
router.get('/:id', async (req, res, next) => {
    try {
        const agent = await agentController_1.agentController.getAgent(req.params.id);
        const response = {
            success: true,
            data: agent
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// POST /api/agents - Create new agent
router.post('/', async (req, res, next) => {
    try {
        const options = req.body;
        const agent = await agentController_1.agentController.createAgent(options);
        const response = {
            success: true,
            message: 'Agent created successfully',
            data: agent
        };
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/agents/:id/status - Update agent status
router.put('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        const agent = await agentController_1.agentController.updateAgentStatus(req.params.id, status);
        const response = {
            success: true,
            message: 'Agent status updated successfully',
            data: agent
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// DELETE /api/agents/:id - Stop and remove agent
router.delete('/:id', async (req, res, next) => {
    try {
        const removeWorktree = req.query.removeWorktree === 'true';
        await agentController_1.agentController.deleteAgent(req.params.id, removeWorktree);
        const response = {
            success: true,
            message: 'Agent deleted successfully'
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=agents.js.map