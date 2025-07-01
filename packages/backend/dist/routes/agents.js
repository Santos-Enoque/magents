"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// POST /api/agents/:id/assign-task - Assign a task to an agent
router.post('/:id/assign-task', async (req, res, next) => {
    try {
        const { id: agentId } = req.params;
        const { taskId, projectPath } = req.body;
        if (!taskId || !projectPath) {
            return res.status(400).json({
                success: false,
                error: 'Task ID and project path are required'
            });
        }
        // Import taskMasterController here to avoid circular dependencies
        const { taskMasterController } = await Promise.resolve().then(() => __importStar(require('../controllers/taskMasterController')));
        const assignment = await taskMasterController.assignTaskToAgent(agentId, taskId, projectPath);
        const response = {
            success: true,
            message: 'Task assigned successfully',
            data: assignment
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=agents.js.map