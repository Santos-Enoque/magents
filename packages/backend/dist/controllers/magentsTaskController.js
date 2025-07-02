"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magentsTaskController = exports.MagentsTaskController = void 0;
const magentsTaskManager_1 = require("../services/magentsTaskManager");
class MagentsTaskController {
    /**
     * Quick start Task Master for a project
     */
    async quickStart(req, res) {
        try {
            const { projectPath, projectName, autoDetectType = true } = req.body;
            if (!projectPath) {
                res.status(400).json({ error: 'Project path is required' });
                return;
            }
            const result = await magentsTaskManager_1.magentsTaskManager.quickStart({
                projectPath,
                projectName,
                autoDetectType
            });
            if (result.success) {
                res.json({ message: result.message });
            }
            else {
                res.status(500).json({ error: result.message });
            }
        }
        catch (error) {
            console.error('Quick start error:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to quick start Task Master'
            });
        }
    }
    /**
     * Auto-analyze project and generate tasks
     */
    async autoAnalyze(req, res) {
        try {
            const { projectPath } = req.body;
            if (!projectPath) {
                res.status(400).json({ error: 'Project path is required' });
                return;
            }
            const result = await magentsTaskManager_1.magentsTaskManager.autoAnalyze(projectPath);
            if (result.success) {
                res.json({
                    message: result.message,
                    taskCount: result.taskCount
                });
            }
            else {
                res.status(500).json({ error: result.message });
            }
        }
        catch (error) {
            console.error('Auto-analyze error:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to analyze project'
            });
        }
    }
    /**
     * Get simplified task list
     */
    async getSimplifiedTasks(req, res) {
        try {
            const { projectPath } = req.query;
            if (!projectPath || typeof projectPath !== 'string') {
                res.status(400).json({ error: 'Project path is required' });
                return;
            }
            const tasks = await magentsTaskManager_1.magentsTaskManager.getSimplifiedTasks(projectPath);
            res.json({ tasks });
        }
        catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get tasks'
            });
        }
    }
    /**
     * Get next available task
     */
    async getNextTask(req, res) {
        try {
            const { projectPath } = req.query;
            if (!projectPath || typeof projectPath !== 'string') {
                res.status(400).json({ error: 'Project path is required' });
                return;
            }
            const task = await magentsTaskManager_1.magentsTaskManager.getNextTask(projectPath);
            if (task) {
                res.json({ task });
            }
            else {
                res.json({
                    task: null,
                    message: 'No pending tasks available'
                });
            }
        }
        catch (error) {
            console.error('Get next task error:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get next task'
            });
        }
    }
    /**
     * Create a simple task
     */
    async createSimpleTask(req, res) {
        try {
            const { projectPath, title, priority = 'medium' } = req.body;
            if (!projectPath || !title) {
                res.status(400).json({ error: 'Project path and title are required' });
                return;
            }
            const task = await magentsTaskManager_1.magentsTaskManager.createSimpleTask(projectPath, title, priority);
            if (task) {
                res.json({
                    message: 'Task created successfully',
                    task
                });
            }
            else {
                res.status(500).json({ error: 'Failed to create task' });
            }
        }
        catch (error) {
            console.error('Create task error:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create task'
            });
        }
    }
}
exports.MagentsTaskController = MagentsTaskController;
exports.magentsTaskController = new MagentsTaskController();
//# sourceMappingURL=magentsTaskController.js.map