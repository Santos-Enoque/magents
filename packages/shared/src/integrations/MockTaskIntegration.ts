import {
  TaskIntegration,
  TaskData,
  CreateTaskOptions,
  UpdateTaskOptions,
  TaskQueryOptions,
  TaskStatistics,
  TaskIntegrationCapabilities,
  TaskNotFoundError,
  TaskStatus,
  TaskPriority
} from './TaskIntegration';
import { BaseTaskIntegrationFactory } from './TaskIntegrationFactory';

/**
 * Mock Task Integration for testing and development
 */
export class MockTaskIntegration implements TaskIntegration {
  readonly type = 'mock';
  readonly name = 'Mock Task Integration';
  readonly capabilities: TaskIntegrationCapabilities = {
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

  private tasks = new Map<string, TaskData>();
  private nextId = 1;
  private config: Record<string, unknown> = {};

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = config;
    
    // Initialize with some sample tasks if requested
    if (config.initializeSampleTasks) {
      await this.createSampleTasks();
    }
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  async getTasks(projectPath: string, options?: TaskQueryOptions): Promise<TaskData[]> {
    let tasks = Array.from(this.tasks.values());

    // Filter by project if specified
    if (options?.projectId) {
      tasks = tasks.filter(task => task.projectId === options.projectId);
    }

    // Filter by status
    if (options?.status && options.status.length > 0) {
      tasks = tasks.filter(task => options.status!.includes(task.status));
    }

    // Filter by priority
    if (options?.priority && options.priority.length > 0) {
      tasks = tasks.filter(task => options.priority!.includes(task.priority));
    }

    // Filter by assignee
    if (options?.assignedTo) {
      tasks = tasks.filter(task => task.assignedTo === options.assignedTo);
    }

    // Search
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
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

  async getTask(projectPath: string, taskId: string): Promise<TaskData | null> {
    return this.tasks.get(taskId) || null;
  }

  async createTask(projectPath: string, options: CreateTaskOptions): Promise<TaskData> {
    const id = String(this.nextId++);
    const now = new Date();
    
    const task: TaskData = {
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

  async updateTask(projectPath: string, taskId: string, options: UpdateTaskOptions): Promise<TaskData> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId, this.type);
    }

    const updatedTask: TaskData = {
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

  async deleteTask(projectPath: string, taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId, this.type);
    }

    this.tasks.delete(taskId);
  }

  async assignTask(projectPath: string, taskId: string, assigneeId: string): Promise<TaskData> {
    return this.updateTask(projectPath, taskId, { assignedTo: assigneeId });
  }

  async unassignTask(projectPath: string, taskId: string): Promise<TaskData> {
    return this.updateTask(projectPath, taskId, { assignedTo: undefined });
  }

  async getStatistics(projectPath: string): Promise<TaskStatistics> {
    const tasks = await this.getTasks(projectPath);
    
    const stats: TaskStatistics = {
      total: tasks.length,
      byStatus: {} as Record<TaskStatus, number>,
      byPriority: {} as Record<TaskPriority, number>,
      byAssignee: {}
    };

    // Initialize counters
    const statuses: TaskStatus[] = ['pending', 'in-progress', 'done', 'blocked', 'cancelled', 'deferred'];
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
    
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

  async searchTasks(projectPath: string, query: string, options?: TaskQueryOptions): Promise<TaskData[]> {
    return this.getTasks(projectPath, { ...options, search: query });
  }

  async getAvailableAssignees(projectPath: string): Promise<Array<{id: string; name: string; type: string}>> {
    // Return mock assignees
    return [
      { id: 'agent-1', name: 'Agent Alpha', type: 'agent' },
      { id: 'agent-2', name: 'Agent Beta', type: 'agent' },
      { id: 'user-1', name: 'John Doe', type: 'user' },
      { id: 'user-2', name: 'Jane Smith', type: 'user' }
    ];
  }

  async dispose(): Promise<void> {
    this.tasks.clear();
    this.config = {};
  }

  /**
   * Create sample tasks for testing
   */
  private async createSampleTasks(): Promise<void> {
    const sampleTasks = [
      {
        title: 'Setup project structure',
        description: 'Initialize the basic project structure and configuration',
        priority: 'high' as TaskPriority,
        status: 'done' as TaskStatus
      },
      {
        title: 'Implement user authentication',
        description: 'Add login, logout, and user management functionality',
        priority: 'high' as TaskPriority,
        status: 'in-progress' as TaskStatus,
        assignedTo: 'agent-1'
      },
      {
        title: 'Design API endpoints',
        description: 'Define REST API endpoints for the application',
        priority: 'medium' as TaskPriority,
        status: 'pending' as TaskStatus
      },
      {
        title: 'Write unit tests',
        description: 'Add comprehensive unit tests for core functionality',
        priority: 'medium' as TaskPriority,
        status: 'pending' as TaskStatus,
        dependencies: ['1', '2']
      },
      {
        title: 'Setup CI/CD pipeline',
        description: 'Configure automated testing and deployment',
        priority: 'low' as TaskPriority,
        status: 'blocked' as TaskStatus
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

/**
 * Factory for creating Mock Task Integration instances
 */
export class MockTaskIntegrationFactory extends BaseTaskIntegrationFactory {
  async create(config: any): Promise<TaskIntegration> {
    return new MockTaskIntegration();
  }

  getSupportedTypes(): string[] {
    return ['mock'];
  }

  async validateConfig(type: string, config: Record<string, unknown>): Promise<{valid: boolean; errors: string[]}> {
    const baseValidation = await super.validateConfig(type, config);
    
    // Mock integration has minimal requirements
    return baseValidation;
  }
}