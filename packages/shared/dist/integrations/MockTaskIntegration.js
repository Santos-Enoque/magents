"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTaskIntegrationFactory = exports.MockTaskIntegration = void 0;
const TaskIntegration_1 = require("./TaskIntegration");
const TaskIntegrationFactory_1 = require("./TaskIntegrationFactory");
/**
 * Mock Task Integration for testing and development
 */
class MockTaskIntegration {
    constructor() {
        this.type = 'mock';
        this.name = 'Mock Task Integration';
        this.capabilities = {
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canAssign: true,
            supportsSubtasks: true,
            supportsDependencies: true,
            supportsSearch: true,
            supportsPagination: true,
            supportsRealTimeUpdates: false
        };
        this.tasks = new Map();
        this.nextId = 1;
        this.config = {};
    }
    async initialize(config) {
        this.config = config;
        // Initialize with some sample tasks if requested
        if (config.initializeSampleTasks) {
            await this.createSampleTasks();
        }
    }
    async isAvailable() {
        return true; // Mock is always available
    }
    async getTasks(projectPath, options) {
        let tasks = Array.from(this.tasks.values());
        // Filter by project if specified
        if (options?.projectId) {
            tasks = tasks.filter(task => task.projectId === options.projectId);
        }
        // Filter by status
        if (options?.status && options.status.length > 0) {
            tasks = tasks.filter(task => options.status.includes(task.status));
        }
        // Filter by priority
        if (options?.priority && options.priority.length > 0) {
            tasks = tasks.filter(task => options.priority.includes(task.priority));
        }
        // Filter by assignee
        if (options?.assignedTo) {
            tasks = tasks.filter(task => task.assignedTo === options.assignedTo);
        }
        // Search
        if (options?.search) {
            const searchLower = options.search.toLowerCase();
            tasks = tasks.filter(task => task.title.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower)));
        }
        // Pagination
        if (options?.offset) {
            tasks = tasks.slice(options.offset);
        }
        if (options?.limit) {
            tasks = tasks.slice(0, options.limit);
        }
        return tasks;
    }
    async getTask(projectPath, taskId) {
        return this.tasks.get(taskId) || null;
    }
    async createTask(projectPath, options) {
        const id = String(this.nextId++);
        const now = new Date();
        const task = {
            id,
            title: options.title,
            description: options.description,
            status: 'pending',
            priority: options.priority || 'medium',
            dependencies: options.dependencies || [],
            subtasks: [],
            details: options.details,
            testStrategy: options.testStrategy,
            assignedTo: options.assignedTo,
            projectId: options.projectId,
            createdAt: now,
            updatedAt: now,
            metadata: options.metadata || {}
        };
        this.tasks.set(id, task);
        return task;
    }
    async updateTask(projectPath, taskId, options) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new TaskIntegration_1.TaskNotFoundError(taskId, this.type);
        }
        const updatedTask = {
            ...task,
            title: options.title !== undefined ? options.title : task.title,
            description: options.description !== undefined ? options.description : task.description,
            status: options.status !== undefined ? options.status : task.status,
            priority: options.priority !== undefined ? options.priority : task.priority,
            assignedTo: options.assignedTo !== undefined ? options.assignedTo : task.assignedTo,
            details: options.details !== undefined ? options.details : task.details,
            testStrategy: options.testStrategy !== undefined ? options.testStrategy : task.testStrategy,
            dependencies: options.dependencies !== undefined ? options.dependencies : task.dependencies,
            metadata: options.metadata !== undefined ? { ...task.metadata, ...options.metadata } : task.metadata,
            updatedAt: new Date()
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    async deleteTask(projectPath, taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new TaskIntegration_1.TaskNotFoundError(taskId, this.type);
        }
        this.tasks.delete(taskId);
    }
    async assignTask(projectPath, taskId, assigneeId) {
        return this.updateTask(projectPath, taskId, { assignedTo: assigneeId });
    }
    async unassignTask(projectPath, taskId) {
        return this.updateTask(projectPath, taskId, { assignedTo: undefined });
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
        // Return mock assignees
        return [
            { id: 'agent-1', name: 'Agent Alpha', type: 'agent' },
            { id: 'agent-2', name: 'Agent Beta', type: 'agent' },
            { id: 'user-1', name: 'John Doe', type: 'user' },
            { id: 'user-2', name: 'Jane Smith', type: 'user' }
        ];
    }
    async dispose() {
        this.tasks.clear();
        this.config = {};
    }
    /**
     * Create sample tasks for testing
     */
    async createSampleTasks() {
        const sampleTasks = [
            {
                title: 'Setup project structure',
                description: 'Initialize the basic project structure and configuration',
                priority: 'high',
                status: 'done'
            },
            {
                title: 'Implement user authentication',
                description: 'Add login, logout, and user management functionality',
                priority: 'high',
                status: 'in-progress',
                assignedTo: 'agent-1'
            },
            {
                title: 'Design API endpoints',
                description: 'Define REST API endpoints for the application',
                priority: 'medium',
                status: 'pending'
            },
            {
                title: 'Write unit tests',
                description: 'Add comprehensive unit tests for core functionality',
                priority: 'medium',
                status: 'pending',
                dependencies: ['1', '2']
            },
            {
                title: 'Setup CI/CD pipeline',
                description: 'Configure automated testing and deployment',
                priority: 'low',
                status: 'blocked'
            }
        ];
        for (const taskData of sampleTasks) {
            const task = await this.createTask('mock-project', taskData);
            if (taskData.status !== 'pending') {
                await this.updateTask('mock-project', task.id, { status: taskData.status });
            }
            if (taskData.assignedTo) {
                await this.assignTask('mock-project', task.id, taskData.assignedTo);
            }
        }
    }
}
exports.MockTaskIntegration = MockTaskIntegration;
/**
 * Factory for creating Mock Task Integration instances
 */
class MockTaskIntegrationFactory extends TaskIntegrationFactory_1.BaseTaskIntegrationFactory {
    async create(config) {
        return new MockTaskIntegration();
    }
    getSupportedTypes() {
        return ['mock'];
    }
    async validateConfig(type, config) {
        const baseValidation = await super.validateConfig(type, config);
        // Mock integration has minimal requirements
        return baseValidation;
    }
}
exports.MockTaskIntegrationFactory = MockTaskIntegrationFactory;
//# sourceMappingURL=MockTaskIntegration.js.map