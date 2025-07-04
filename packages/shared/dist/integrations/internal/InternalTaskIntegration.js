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
exports.InternalTaskIntegration = void 0;
class InternalTaskIntegration {
    constructor() {
        this.name = 'Internal Task System';
        this.type = 'internal';
        this.version = '1.0.0';
        this.capabilities = {
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canAssign: true,
            supportsSubtasks: true,
            supportsDependencies: true,
            supportsSearch: true,
            supportsPagination: true,
            supportsRealTimeUpdates: false,
            customFields: ['testStrategy', 'testResults', 'estimatedEffort', 'actualEffort']
        };
        this.initialized = false;
        // Repository will be initialized when needed
        this.taskRepository = null;
    }
    async initialize(configuration) {
        if (this.initialized)
            return;
        try {
            // Dynamically import to avoid circular dependencies
            const { TaskRepository } = await Promise.resolve().then(() => __importStar(require('../../../backend/src/repositories/TaskRepository')));
            this.taskRepository = new TaskRepository();
            this.initialized = true;
        }
        catch (error) {
            console.error('Failed to initialize InternalTaskIntegration:', error);
            throw new Error('Failed to initialize internal task system');
        }
    }
    async getMetadata() {
        return {
            name: this.name,
            type: this.type,
            version: this.version,
            capabilities: this.capabilities,
            status: this.initialized ? 'connected' : 'disconnected',
            lastSync: new Date()
        };
    }
    async isAvailable() {
        return this.initialized;
    }
    convertInternalToTaskData(task) {
        return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            assigneeId: task.assignedToAgentId,
            projectId: task.projectId,
            parentId: task.parentTaskId,
            subtasks: [], // Will be populated separately if needed
            dependencies: task.dependencies,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            dueDate: undefined, // Not supported in current schema
            labels: task.tags,
            metadata: {
                ...task.metadata,
                taskMasterId: task.taskMasterId,
                testStrategy: task.testStrategy,
                testResults: task.testResults,
                estimatedEffort: task.estimatedEffort,
                actualEffort: task.actualEffort,
                assignedAt: task.assignedAt,
                startedAt: task.startedAt,
                completedAt: task.completedAt
            }
        };
    }
    async listTasks(options) {
        if (!this.initialized)
            await this.initialize();
        const filter = {
            projectId: options?.projectId,
            status: options?.status,
            assignedToAgentId: options?.assigneeId,
            includeSubtasks: options?.includeSubtasks
        };
        const tasks = this.taskRepository.findWithFilters(filter);
        const taskData = tasks.map(t => this.convertInternalToTaskData(t));
        // Apply pagination if requested
        let paginatedTasks = taskData;
        let hasMore = false;
        if (options?.page !== undefined && options?.pageSize) {
            const start = options.page * options.pageSize;
            const end = start + options.pageSize;
            paginatedTasks = taskData.slice(start, end);
            hasMore = end < taskData.length;
        }
        return {
            tasks: paginatedTasks,
            total: taskData.length,
            page: options?.page,
            pageSize: options?.pageSize,
            hasMore
        };
    }
    async getTask(taskId) {
        if (!this.initialized)
            await this.initialize();
        const task = this.taskRepository.findById(taskId);
        if (!task)
            return null;
        const taskData = this.convertInternalToTaskData(task);
        // Load subtasks if they exist
        if (task.subtaskIds && task.subtaskIds.length > 0) {
            const subtasks = this.taskRepository.findSubtasks(task.id);
            taskData.subtasks = subtasks.map(st => this.convertInternalToTaskData(st));
        }
        return taskData;
    }
    async createTask(data) {
        if (!this.initialized)
            await this.initialize();
        const input = {
            projectId: data.projectId,
            title: data.title,
            description: data.description,
            details: data.metadata?.details,
            status: data.status,
            priority: data.priority,
            assignedToAgentId: data.assigneeId,
            parentTaskId: data.parentId,
            dependencies: data.dependencies,
            testStrategy: data.metadata?.testStrategy,
            estimatedEffort: data.metadata?.estimatedEffort,
            tags: data.labels,
            metadata: data.metadata || {},
            taskMasterId: data.metadata?.taskMasterId
        };
        const created = await this.taskRepository.create(input);
        return this.convertInternalToTaskData(created);
    }
    async updateTask(taskId, updates) {
        if (!this.initialized)
            await this.initialize();
        const input = {
            title: updates.title,
            description: updates.description,
            details: updates.metadata?.details,
            status: updates.status,
            priority: updates.priority,
            assignedToAgentId: updates.assigneeId,
            dependencies: updates.dependencies,
            testStrategy: updates.metadata?.testStrategy,
            testResults: updates.metadata?.testResults,
            estimatedEffort: updates.metadata?.estimatedEffort,
            actualEffort: updates.metadata?.actualEffort,
            tags: updates.labels,
            metadata: updates.metadata
        };
        const updated = await this.taskRepository.update(taskId, input);
        return updated ? this.convertInternalToTaskData(updated) : null;
    }
    async deleteTask(taskId) {
        if (!this.initialized)
            await this.initialize();
        return this.taskRepository.delete(taskId);
    }
    async assignTask(taskId, assigneeId) {
        if (!this.initialized)
            await this.initialize();
        const updated = await this.taskRepository.update(taskId, {
            assignedToAgentId: assigneeId
        });
        return updated !== null;
    }
    async unassignTask(taskId) {
        if (!this.initialized)
            await this.initialize();
        const updated = await this.taskRepository.update(taskId, {
            assignedToAgentId: null
        });
        return updated !== null;
    }
    async searchTasks(options) {
        if (!this.initialized)
            await this.initialize();
        // For now, implement basic search using filters
        const filter = {
            projectId: options.projectId,
            tags: options.tags
        };
        let tasks = this.taskRepository.findWithFilters(filter);
        // Apply text search if query provided
        if (options.query) {
            const query = options.query.toLowerCase();
            tasks = tasks.filter(task => task.title.toLowerCase().includes(query) ||
                (task.description && task.description.toLowerCase().includes(query)) ||
                (task.details && task.details.toLowerCase().includes(query)));
        }
        return tasks.map(t => this.convertInternalToTaskData(t));
    }
    async addSubtask(parentTaskId, subtask) {
        if (!this.initialized)
            await this.initialize();
        // Get parent task to inherit project ID
        const parent = this.taskRepository.findById(parentTaskId);
        if (!parent) {
            throw new Error(`Parent task ${parentTaskId} not found`);
        }
        // Create subtask with parent reference
        const subtaskData = {
            ...subtask,
            projectId: parent.projectId,
            parentId: parentTaskId
        };
        return this.createTask(subtaskData);
    }
    async updateDependencies(taskId, dependencies) {
        if (!this.initialized)
            await this.initialize();
        const updated = await this.taskRepository.update(taskId, { dependencies });
        return updated !== null;
    }
    async getStatistics(projectId) {
        if (!this.initialized)
            await this.initialize();
        return this.taskRepository.getStatistics(projectId);
    }
    async exportTasks(options) {
        if (!this.initialized)
            await this.initialize();
        const filter = {
            projectId: options?.projectId,
            includeSubtasks: true
        };
        const tasks = this.taskRepository.findWithFilters(filter);
        if (options?.format === 'csv') {
            // Simple CSV export
            const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Project ID', 'Assigned To', 'Created At'];
            const rows = tasks.map(task => [
                task.id,
                `"${task.title.replace(/"/g, '""')}"`,
                `"${(task.description || '').replace(/"/g, '""')}"`,
                task.status,
                task.priority,
                task.projectId,
                task.assignedToAgentId || '',
                task.createdAt.toISOString()
            ]);
            return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }
        // Default to JSON
        return JSON.stringify(tasks, null, 2);
    }
    async importTasks(data, options) {
        if (!this.initialized)
            await this.initialize();
        let tasksToImport = [];
        if (options?.format === 'csv') {
            // Simple CSV parsing (real implementation would use a proper CSV parser)
            const lines = data.split('\n');
            const headers = lines[0].split(',');
            // Skip header and parse rows
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim())
                    continue;
                // Very basic CSV parsing - doesn't handle all edge cases
                const values = lines[i].split(',');
                const task = {
                    title: values[1]?.replace(/^"|"$/g, '').replace(/""/g, '"'),
                    description: values[2]?.replace(/^"|"$/g, '').replace(/""/g, '"'),
                    status: values[3] || 'pending',
                    priority: values[4] || 'medium',
                    projectId: options?.projectId || values[5]
                };
                if (task.title && task.projectId) {
                    tasksToImport.push(task);
                }
            }
        }
        else {
            // Parse JSON
            try {
                const parsed = JSON.parse(data);
                tasksToImport = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch (error) {
                throw new Error('Invalid JSON format');
            }
        }
        // Import tasks
        let imported = 0;
        for (const taskData of tasksToImport) {
            try {
                const input = {
                    projectId: options?.projectId || taskData.projectId,
                    title: taskData.title,
                    description: taskData.description,
                    status: taskData.status || 'pending',
                    priority: taskData.priority || 'medium',
                    tags: taskData.tags || taskData.labels,
                    metadata: taskData.metadata || {}
                };
                await this.taskRepository.create(input);
                imported++;
            }
            catch (error) {
                console.error('Failed to import task:', error);
            }
        }
        return imported;
    }
}
exports.InternalTaskIntegration = InternalTaskIntegration;
//# sourceMappingURL=InternalTaskIntegration.js.map