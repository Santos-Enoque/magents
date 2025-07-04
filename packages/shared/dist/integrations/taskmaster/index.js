"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskMasterIntegrationFactory = exports.TaskMasterIntegration = void 0;
const TaskIntegration_1 = require("../TaskIntegration");
const TaskIntegrationFactory_1 = require("../TaskIntegrationFactory");
/**
 * TaskMaster Integration
 *
 * Integrates with the existing TaskMaster CLI tool for task management
 */
class TaskMasterIntegration {
    constructor() {
        this.type = 'taskmaster';
        this.name = 'TaskMaster CLI';
        this.capabilities = {
            canCreate: true,
            canUpdate: true,
            canDelete: false, // TaskMaster doesn't support deletion
            canAssign: false, // TaskMaster doesn't have native assignment
            supportsSubtasks: true,
            supportsDependencies: true,
            supportsSearch: true,
            supportsPagination: false, // TaskMaster returns all tasks
            supportsRealTimeUpdates: false
        };
        this.config = {};
    }
    async initialize(config) {
        this.config = config;
    }
    async isAvailable() {
        // Check if TaskMaster CLI is available by running a simple command
        try {
            const { execSync } = require('child_process');
            execSync('task-master --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async getTasks(projectPath, options) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            // Execute task-master list command with JSON output
            const { stdout } = await execAsync('task-master list --json', {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' }
            });
            const tasksData = JSON.parse(stdout);
            let tasks = [];
            if (tasksData && tasksData.master && tasksData.master.tasks) {
                tasks = this.flattenTasks(tasksData.master.tasks);
            }
            // Apply client-side filtering since TaskMaster doesn't support it natively
            return this.filterTasks(tasks, options);
        }
        catch (error) {
            console.error('Error getting TaskMaster tasks:', error);
            // Fallback to reading tasks.json directly
            try {
                const fs = require('fs').promises;
                const path = require('path');
                const tasksPath = path.join(projectPath, '.taskmaster', 'tasks', 'tasks.json');
                const tasksContent = await fs.readFile(tasksPath, 'utf-8');
                const tasksData = JSON.parse(tasksContent);
                let tasks = [];
                if (tasksData && tasksData.master && tasksData.master.tasks) {
                    tasks = this.flattenTasks(tasksData.master.tasks);
                }
                return this.filterTasks(tasks, options);
            }
            catch (fallbackError) {
                console.error('Fallback task reading failed:', fallbackError);
                return [];
            }
        }
    }
    async getTask(projectPath, taskId) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            const { stdout } = await execAsync(`task-master show ${taskId} --json`, {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' }
            });
            const taskData = JSON.parse(stdout);
            return this.normalizeTask(taskData);
        }
        catch (error) {
            console.error(`Error getting task details for ${taskId}:`, error);
            // Fallback to getting all tasks and finding the specific one
            const allTasks = await this.getTasks(projectPath);
            return allTasks.find(task => task.id === taskId) || null;
        }
    }
    async createTask(projectPath, options) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            // Build the command with proper escaping
            const escapedTitle = options.title.replace(/"/g, '\\"');
            const escapedDescription = (options.description || '').replace(/"/g, '\\"');
            const command = `task-master add-task --prompt="${escapedTitle}: ${escapedDescription}" --priority=${options.priority || 'medium'}`;
            const { stdout } = await execAsync(command, {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' }
            });
            // Parse the output to extract the created task ID
            const taskIdMatch = stdout.match(/Task (\d+(?:\.\d+)*) added successfully/);
            if (taskIdMatch && taskIdMatch[1]) {
                const newTaskId = taskIdMatch[1];
                const task = await this.getTask(projectPath, newTaskId);
                if (task) {
                    return task;
                }
            }
            // If we couldn't parse the task ID, return a minimal task object
            return {
                id: 'temp-' + Date.now(),
                title: options.title,
                description: options.description,
                status: 'pending',
                priority: options.priority || 'medium',
                dependencies: options.dependencies || [],
                subtasks: [],
                projectId: options.projectId,
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: options.metadata || {}
            };
        }
        catch (error) {
            throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateTask(projectPath, taskId, options) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            // TaskMaster supports status updates
            if (options.status !== undefined) {
                await execAsync(`task-master set-status --id=${taskId} --status=${options.status}`, {
                    cwd: projectPath
                });
            }
            // For other updates, use the update-task command if available
            if (options.title || options.description || options.details) {
                const updates = [];
                if (options.title)
                    updates.push(`title: ${options.title}`);
                if (options.description)
                    updates.push(`description: ${options.description}`);
                if (options.details)
                    updates.push(`details: ${options.details}`);
                const updateText = updates.join(', ');
                await execAsync(`task-master update-task --id=${taskId} --prompt="${updateText}"`, {
                    cwd: projectPath
                });
            }
            // Return the updated task
            const updatedTask = await this.getTask(projectPath, taskId);
            if (!updatedTask) {
                throw new TaskIntegration_1.TaskNotFoundError(taskId, this.type);
            }
            return updatedTask;
        }
        catch (error) {
            throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteTask(projectPath, taskId) {
        throw new Error('TaskMaster does not support task deletion');
    }
    async assignTask(projectPath, taskId, assigneeId) {
        // TaskMaster doesn't have native assignment, but we can store it in metadata
        return this.updateTask(projectPath, taskId, {
            metadata: { assignedTo: assigneeId }
        });
    }
    async unassignTask(projectPath, taskId) {
        return this.updateTask(projectPath, taskId, {
            metadata: { assignedTo: null }
        });
    }
    async getStatistics(projectPath) {
        const tasks = await this.getTasks(projectPath);
        const stats = {
            total: tasks.length,
            byStatus: {},
            byPriority: {},
            byAssignee: {}
        };
        // Initialize counters
        const statuses = ['pending', 'in-progress', 'done', 'blocked', 'cancelled', 'deferred'];
        const priorities = ['low', 'medium', 'high', 'critical'];
        statuses.forEach(status => stats.byStatus[status] = 0);
        priorities.forEach(priority => stats.byPriority[priority] = 0);
        // Count tasks
        tasks.forEach(task => {
            stats.byStatus[task.status]++;
            stats.byPriority[task.priority]++;
            if (task.assignedTo) {
                stats.byAssignee[task.assignedTo] = (stats.byAssignee[task.assignedTo] || 0) + 1;
            }
        });
        return stats;
    }
    async searchTasks(projectPath, query, options) {
        return this.getTasks(projectPath, { ...options, search: query });
    }
    async getAvailableAssignees(projectPath) {
        // TaskMaster doesn't have assignee management, return empty array
        return [];
    }
    async dispose() {
        this.config = {};
    }
    /**
     * Flatten nested tasks into a single array
     */
    flattenTasks(tasks) {
        const flattened = [];
        const processTask = (task) => {
            const normalizedTask = this.normalizeTask(task);
            if (normalizedTask) {
                flattened.push(normalizedTask);
                // Process subtasks recursively
                const taskObj = task;
                if (taskObj.subtasks && Array.isArray(taskObj.subtasks)) {
                    taskObj.subtasks.forEach((subtask) => {
                        processTask(subtask);
                    });
                }
            }
        };
        tasks.forEach(task => processTask(task));
        return flattened;
    }
    /**
     * Normalize task data from TaskMaster format
     */
    normalizeTask(task) {
        if (!task || typeof task !== 'object') {
            return null;
        }
        const taskObj = task;
        return {
            id: String(taskObj.id || ''),
            title: String(taskObj.title || 'Untitled Task'),
            description: taskObj.description,
            status: taskObj.status || 'pending',
            priority: taskObj.priority || 'medium',
            dependencies: taskObj.dependencies || [],
            subtasks: [], // Subtasks are flattened separately
            details: taskObj.details,
            testStrategy: taskObj.testStrategy,
            assignedTo: taskObj.metadata?.assignedTo,
            projectId: taskObj.projectId,
            createdAt: new Date(), // TaskMaster doesn't provide timestamps
            updatedAt: new Date(),
            metadata: taskObj.metadata || {}
        };
    }
    /**
     * Filter tasks based on query options
     */
    filterTasks(tasks, options) {
        if (!options)
            return tasks;
        let filtered = [...tasks];
        // Filter by status
        if (options.status && options.status.length > 0) {
            filtered = filtered.filter(task => options.status.includes(task.status));
        }
        // Filter by priority
        if (options.priority && options.priority.length > 0) {
            filtered = filtered.filter(task => options.priority.includes(task.priority));
        }
        // Filter by assignee
        if (options.assignedTo) {
            filtered = filtered.filter(task => task.assignedTo === options.assignedTo);
        }
        // Filter by project
        if (options.projectId) {
            filtered = filtered.filter(task => task.projectId === options.projectId);
        }
        // Search
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            filtered = filtered.filter(task => task.title.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower)) ||
                task.id.toLowerCase().includes(searchLower));
        }
        // Pagination
        if (options.offset) {
            filtered = filtered.slice(options.offset);
        }
        if (options.limit) {
            filtered = filtered.slice(0, options.limit);
        }
        return filtered;
    }
}
exports.TaskMasterIntegration = TaskMasterIntegration;
/**
 * Factory for creating TaskMaster Integration instances
 */
class TaskMasterIntegrationFactory extends TaskIntegrationFactory_1.BaseTaskIntegrationFactory {
    async create(config) {
        return new TaskMasterIntegration();
    }
    getSupportedTypes() {
        return ['taskmaster'];
    }
    async validateConfig(type, config) {
        const baseValidation = await super.validateConfig(type, config);
        if (!baseValidation.valid) {
            return baseValidation;
        }
        const errors = [];
        // Check if TaskMaster CLI is available
        try {
            const { execSync } = require('child_process');
            execSync('task-master --version', { stdio: 'ignore' });
        }
        catch {
            errors.push('TaskMaster CLI is not available. Please install task-master-ai package.');
        }
        return {
            valid: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}
exports.TaskMasterIntegrationFactory = TaskMasterIntegrationFactory;
//# sourceMappingURL=index.js.map