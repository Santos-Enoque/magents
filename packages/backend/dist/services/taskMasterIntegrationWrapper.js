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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskMasterIntegrationService = exports.TaskMasterIntegrationWrapper = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const integrations_1 = require("@magents/shared/src/integrations");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Wrapper service that maintains backward compatibility
 * while using the new integration system
 */
class TaskMasterIntegrationWrapper {
    static getInstance() {
        if (!TaskMasterIntegrationWrapper.instance) {
            TaskMasterIntegrationWrapper.instance = new TaskMasterIntegrationWrapper();
        }
        return TaskMasterIntegrationWrapper.instance;
    }
    /**
     * Convert TaskData to TaskMasterTask format
     */
    convertTaskDataToTaskMasterTask(task) {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: (task.priority || 'medium'),
            dependencies: task.dependencies || [],
            details: task.metadata?.details,
            testStrategy: task.metadata?.testStrategy,
            subtasks: task.subtasks?.map(st => this.convertTaskDataToTaskMasterTask(st))
        };
    }
    /**
     * Detect if TaskMaster is configured in a project
     */
    async detectTaskMaster(projectPath) {
        const result = {
            isConfigured: false
        };
        try {
            // Check for .taskmaster directory
            const taskMasterDir = path_1.default.join(projectPath, '.taskmaster');
            const dirStats = await fs_1.promises.stat(taskMasterDir).catch(() => null);
            if (!dirStats || !dirStats.isDirectory()) {
                return result;
            }
            // Check for config file
            const configPath = path_1.default.join(taskMasterDir, 'config.json');
            const configExists = await fs_1.promises.access(configPath).then(() => true).catch(() => false);
            if (configExists) {
                result.isConfigured = true;
                result.configPath = configPath;
                try {
                    const configContent = await fs_1.promises.readFile(configPath, 'utf-8');
                    result.config = JSON.parse(configContent);
                }
                catch (error) {
                    console.warn('Failed to parse TaskMaster config:', error);
                }
            }
            // Check for tasks file
            const tasksPath = path_1.default.join(taskMasterDir, 'tasks', 'tasks.json');
            const tasksExists = await fs_1.promises.access(tasksPath).then(() => true).catch(() => false);
            if (tasksExists) {
                result.tasksPath = tasksPath;
                result.hasActiveTasks = true;
            }
            return result;
        }
        catch (error) {
            console.error('Error detecting TaskMaster:', error);
            return result;
        }
    }
    /**
     * Get available TaskMaster tasks from a project
     */
    async getTasks(projectPath) {
        // Try to get tasks via the integration system
        const integrations = await integrations_1.taskIntegrationManager.getActiveIntegrations();
        const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');
        if (taskMasterIntegration) {
            try {
                const tasks = await taskMasterIntegration.listTasks({
                    projectId: projectPath,
                    includeSubtasks: true
                });
                return tasks.map(task => this.convertTaskDataToTaskMasterTask(task));
            }
            catch (error) {
                console.warn('Failed to get tasks via integration, falling back to direct method:', error);
            }
        }
        // Fallback to the original implementation using the existing service
        const originalService = await Promise.resolve().then(() => __importStar(require('./taskMasterIntegration')));
        const service = new originalService.TaskMasterIntegrationService();
        return service.getTasks(projectPath);
    }
    /**
     * Get details of a specific task
     */
    async getTaskDetails(projectPath, taskId) {
        // Try to get task via the integration system
        const integrations = await integrations_1.taskIntegrationManager.getActiveIntegrations();
        const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');
        if (taskMasterIntegration) {
            try {
                const task = await taskMasterIntegration.getTask(taskId);
                return task ? this.convertTaskDataToTaskMasterTask(task) : null;
            }
            catch (error) {
                console.warn('Failed to get task via integration, falling back to direct method:', error);
            }
        }
        // Fallback to the original implementation
        const originalService = await Promise.resolve().then(() => __importStar(require('./taskMasterIntegration')));
        const service = new originalService.TaskMasterIntegrationService();
        return service.getTaskDetails(projectPath, taskId);
    }
    /**
     * Create a new task
     */
    async createTask(projectPath, title, description, priority) {
        // Try to create task via the integration system
        const integrations = await integrations_1.taskIntegrationManager.getActiveIntegrations();
        const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');
        if (taskMasterIntegration && taskMasterIntegration.capabilities.canCreate) {
            try {
                const task = await taskMasterIntegration.createTask({
                    title,
                    description,
                    status: 'pending',
                    priority: priority || 'medium',
                    projectId: projectPath
                });
                return this.convertTaskDataToTaskMasterTask(task);
            }
            catch (error) {
                console.warn('Failed to create task via integration, falling back to direct method:', error);
            }
        }
        // Fallback to the original implementation
        const originalService = await Promise.resolve().then(() => __importStar(require('./taskMasterIntegration')));
        const service = new originalService.TaskMasterIntegrationService();
        return service.createTask(projectPath, title, description, priority);
    }
    /**
     * Update task status
     */
    async updateTaskStatus(projectPath, taskId, status) {
        // Try to update via the integration system
        const integrations = await integrations_1.taskIntegrationManager.getActiveIntegrations();
        const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');
        if (taskMasterIntegration && taskMasterIntegration.capabilities.canUpdate) {
            try {
                await taskMasterIntegration.updateTask(taskId, { status });
                return;
            }
            catch (error) {
                console.warn('Failed to update task via integration, falling back to direct method:', error);
            }
        }
        // Fallback to the original implementation
        const originalService = await Promise.resolve().then(() => __importStar(require('./taskMasterIntegration')));
        const service = new originalService.TaskMasterIntegrationService();
        return service.updateTaskStatus(projectPath, taskId, status);
    }
    /**
     * Assign a task to an agent (delegates to original service)
     */
    async assignTaskToAgent(agentId, taskId, projectPath, worktreePath) {
        // This is a specific feature that doesn't map to the generic integration
        // So we always use the original implementation
        const originalService = await Promise.resolve().then(() => __importStar(require('./taskMasterIntegration')));
        const service = new originalService.TaskMasterIntegrationService();
        return service.assignTaskToAgent(agentId, taskId, projectPath, worktreePath);
    }
}
exports.TaskMasterIntegrationWrapper = TaskMasterIntegrationWrapper;
// Export a singleton instance for backward compatibility
exports.taskMasterIntegrationService = TaskMasterIntegrationWrapper.getInstance();
//# sourceMappingURL=taskMasterIntegrationWrapper.js.map