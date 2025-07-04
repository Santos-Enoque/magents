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
exports.taskMasterController = void 0;
const taskMasterIntegrationWrapper_1 = require("../services/taskMasterIntegrationWrapper");
const agentController_1 = require("./agentController");
exports.taskMasterController = {
    /**
     * Detect if TaskMaster is configured in a project
     */
    async detectTaskMaster(projectPath) {
        if (!projectPath) {
            throw new Error('Project path is required');
        }
        return await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
    },
    /**
     * Get available tasks from a TaskMaster-enabled project
     */
    async getTasks(projectPath) {
        if (!projectPath) {
            throw new Error('Project path is required');
        }
        const detection = await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
        if (!detection.isConfigured) {
            throw new Error('TaskMaster is not configured in this project');
        }
        return await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.getTasks(projectPath);
    },
    /**
     * Get details of a specific task
     */
    async getTaskDetails(projectPath, taskId) {
        if (!projectPath || !taskId) {
            throw new Error('Project path and task ID are required');
        }
        const task = await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.getTaskDetails(projectPath, taskId);
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
        // Validate that the agent belongs to a project that matches the task's project
        if (agent.projectId) {
            // Get the project details to validate the project path
            const projectController = (await Promise.resolve().then(() => __importStar(require('./projectController')))).projectController;
            const project = await projectController.getProject(agent.projectId);
            if (project && project.path !== projectPath) {
                throw new Error(`Agent ${agentId} belongs to project "${project.name}" (${project.path}), but task is from project "${projectPath}". Agents can only be assigned tasks from their own project.`);
            }
        }
        // Assign the task
        const assignment = await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.assignTaskToAgent(agentId, taskId, projectPath, agent.worktreePath);
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
        const detection = await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.detectTaskMaster(projectPath);
        if (!detection.isConfigured) {
            throw new Error('TaskMaster is not configured in this project');
        }
        return await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.createTask(projectPath, title, description, priority);
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
        await taskMasterIntegrationWrapper_1.taskMasterIntegrationService.updateTaskStatus(projectPath, taskId, status);
    },
    /**
     * Get agents available for task assignment in a specific project
     */
    async getAvailableAgentsForProject(projectPath) {
        if (!projectPath) {
            throw new Error('Project path is required');
        }
        // Get project by path to find projectId
        const projectController = (await Promise.resolve().then(() => __importStar(require('./projectController')))).projectController;
        const projects = await projectController.listProjects();
        const project = projects.find(p => p.path === projectPath);
        if (!project) {
            throw new Error(`No project found for path: ${projectPath}`);
        }
        // Get agents for this project
        const agents = await agentController_1.agentController.getAgentsByProject(project.id);
        // Filter to only show agents that are available for task assignment
        return agents.filter(agent => agent.status === 'RUNNING');
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