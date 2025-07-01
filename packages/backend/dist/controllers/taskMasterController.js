"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskMasterController = void 0;
const taskMasterIntegration_1 = require("../services/taskMasterIntegration");
const agentController_1 = require("./agentController");
exports.taskMasterController = {
    /**
     * Detect if TaskMaster is configured in a project
     */
    async detectTaskMaster(projectPath) {
        if (!projectPath) {
            throw new Error('Project path is required');
        }
        return await taskMasterIntegration_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
    },
    /**
     * Get available tasks from a TaskMaster-enabled project
     */
    async getTasks(projectPath) {
        if (!projectPath) {
            throw new Error('Project path is required');
        }
        const detection = await taskMasterIntegration_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
        if (!detection.isConfigured) {
            throw new Error('TaskMaster is not configured in this project');
        }
        return await taskMasterIntegration_1.taskMasterIntegrationService.getTasks(projectPath);
    },
    /**
     * Get details of a specific task
     */
    async getTaskDetails(projectPath, taskId) {
        if (!projectPath || !taskId) {
            throw new Error('Project path and task ID are required');
        }
        const task = await taskMasterIntegration_1.taskMasterIntegrationService.getTaskDetails(projectPath, taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        return task;
    },
    /**
     * Assign a task to an agent
     */
    async assignTaskToAgent(agentId, taskId, projectPath) {
        if (!agentId || !taskId || !projectPath) {
            throw new Error('Agent ID, task ID, and project path are required');
        }
        // Get the agent to verify it exists and get its worktree path
        const agent = await agentController_1.agentController.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        // Assign the task
        const assignment = await taskMasterIntegration_1.taskMasterIntegrationService.assignTaskToAgent(agentId, taskId, projectPath, agent.worktreePath);
        // Update agent environment with task information
        const updatedEnvironment = {
            ...agent.config?.environment,
            ...assignment.environment
        };
        // Update agent configuration
        await agentController_1.agentController.updateAgentConfig(agentId, {
            ...agent.config,
            environment: updatedEnvironment,
            taskId,
            taskBriefingPath: assignment.briefingPath
        });
        return assignment;
    },
    /**
     * Create a new task
     */
    async createTask(projectPath, title, description, priority) {
        if (!projectPath || !title) {
            throw new Error('Project path and title are required');
        }
        const detection = await taskMasterIntegration_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
        if (!detection.isConfigured) {
            throw new Error('TaskMaster is not configured in this project');
        }
        return await taskMasterIntegration_1.taskMasterIntegrationService.createTask(projectPath, title, description, priority);
    },
    /**
     * Update task status
     */
    async updateTaskStatus(projectPath, taskId, status) {
        if (!projectPath || !taskId || !status) {
            throw new Error('Project path, task ID, and status are required');
        }
        const validStatuses = ['pending', 'in-progress', 'done', 'blocked', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        await taskMasterIntegration_1.taskMasterIntegrationService.updateTaskStatus(projectPath, taskId, status);
    },
    /**
     * Get task statistics for a project
     */
    async getTaskStatistics(projectPath) {
        const tasks = await this.getTasks(projectPath);
        const stats = {
            total: tasks.length,
            byStatus: {},
            byPriority: {}
        };
        tasks.forEach(task => {
            // Count by status
            const status = task.status || 'unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            // Count by priority
            const priority = task.priority || 'medium';
            stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
        });
        return stats;
    }
};
//# sourceMappingURL=taskMasterController.js.map