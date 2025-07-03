import { 
  TaskIntegration, 
  TaskData, 
  TaskIntegrationCapabilities,
  TaskIntegrationMetadata,
  TaskListOptions,
  TaskListResult,
  TaskSearchOptions 
} from '../TaskIntegration';
import { TaskRepository, InternalTask, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../../../backend/src/repositories/TaskRepository';

export class InternalTaskIntegration implements TaskIntegration {
  public readonly name = 'Internal Task System';
  public readonly type = 'internal';
  public readonly version = '1.0.0';
  
  public readonly capabilities: TaskIntegrationCapabilities = {
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

  private taskRepository: TaskRepository;
  private initialized = false;

  constructor() {
    // Repository will be initialized when needed
    this.taskRepository = null as any;
  }

  async initialize(configuration?: any): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Dynamically import to avoid circular dependencies
      const { TaskRepository } = await import('../../../backend/src/repositories/TaskRepository');
      this.taskRepository = new TaskRepository();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize InternalTaskIntegration:', error);
      throw new Error('Failed to initialize internal task system');
    }
  }

  async getMetadata(): Promise<TaskIntegrationMetadata> {
    return {
      name: this.name,
      type: this.type,
      version: this.version,
      capabilities: this.capabilities,
      status: this.initialized ? 'connected' : 'disconnected',
      lastSync: new Date()
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.initialized;
  }

  private convertInternalToTaskData(task: InternalTask): TaskData {
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

  async listTasks(options?: TaskListOptions): Promise<TaskListResult> {
    if (!this.initialized) await this.initialize();

    const filter: TaskFilter = {
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

  async getTask(taskId: string): Promise<TaskData | null> {
    if (!this.initialized) await this.initialize();

    const task = this.taskRepository.findById(taskId);
    if (!task) return null;

    const taskData = this.convertInternalToTaskData(task);

    // Load subtasks if they exist
    if (task.subtaskIds && task.subtaskIds.length > 0) {
      const subtasks = this.taskRepository.findSubtasks(task.id);
      taskData.subtasks = subtasks.map(st => this.convertInternalToTaskData(st));
    }

    return taskData;
  }

  async createTask(data: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskData> {
    if (!this.initialized) await this.initialize();

    const input: CreateTaskInput = {
      projectId: data.projectId!,
      title: data.title,
      description: data.description,
      details: data.metadata?.details as string,
      status: data.status as any,
      priority: data.priority as any,
      assignedToAgentId: data.assigneeId,
      parentTaskId: data.parentId,
      dependencies: data.dependencies,
      testStrategy: data.metadata?.testStrategy as string,
      estimatedEffort: data.metadata?.estimatedEffort as number,
      tags: data.labels,
      metadata: data.metadata || {},
      taskMasterId: data.metadata?.taskMasterId as string
    };

    const created = await this.taskRepository.create(input);
    return this.convertInternalToTaskData(created);
  }

  async updateTask(taskId: string, updates: Partial<TaskData>): Promise<TaskData | null> {
    if (!this.initialized) await this.initialize();

    const input: UpdateTaskInput = {
      title: updates.title,
      description: updates.description,
      details: updates.metadata?.details as string,
      status: updates.status as any,
      priority: updates.priority as any,
      assignedToAgentId: updates.assigneeId,
      dependencies: updates.dependencies,
      testStrategy: updates.metadata?.testStrategy as string,
      testResults: updates.metadata?.testResults as any,
      estimatedEffort: updates.metadata?.estimatedEffort as number,
      actualEffort: updates.metadata?.actualEffort as number,
      tags: updates.labels,
      metadata: updates.metadata
    };

    const updated = await this.taskRepository.update(taskId, input);
    return updated ? this.convertInternalToTaskData(updated) : null;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    return this.taskRepository.delete(taskId);
  }

  async assignTask(taskId: string, assigneeId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    const updated = await this.taskRepository.update(taskId, {
      assignedToAgentId: assigneeId
    });
    
    return updated !== null;
  }

  async unassignTask(taskId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    const updated = await this.taskRepository.update(taskId, {
      assignedToAgentId: null as any
    });
    
    return updated !== null;
  }

  async searchTasks(options: TaskSearchOptions): Promise<TaskData[]> {
    if (!this.initialized) await this.initialize();

    // For now, implement basic search using filters
    const filter: TaskFilter = {
      projectId: options.projectId,
      tags: options.tags
    };

    let tasks = this.taskRepository.findWithFilters(filter);

    // Apply text search if query provided
    if (options.query) {
      const query = options.query.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.details && task.details.toLowerCase().includes(query))
      );
    }

    return tasks.map(t => this.convertInternalToTaskData(t));
  }

  async addSubtask(parentTaskId: string, subtask: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskData> {
    if (!this.initialized) await this.initialize();

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

  async updateDependencies(taskId: string, dependencies: string[]): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    const updated = await this.taskRepository.update(taskId, { dependencies });
    return updated !== null;
  }

  async getStatistics(projectId?: string): Promise<Record<string, any>> {
    if (!this.initialized) await this.initialize();
    return this.taskRepository.getStatistics(projectId);
  }

  async exportTasks(options?: { projectId?: string; format?: 'json' | 'csv' }): Promise<string> {
    if (!this.initialized) await this.initialize();

    const filter: TaskFilter = {
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

  async importTasks(data: string, options?: { projectId?: string; format?: 'json' | 'csv' }): Promise<number> {
    if (!this.initialized) await this.initialize();

    let tasksToImport: any[] = [];

    if (options?.format === 'csv') {
      // Simple CSV parsing (real implementation would use a proper CSV parser)
      const lines = data.split('\n');
      const headers = lines[0].split(',');
      
      // Skip header and parse rows
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Very basic CSV parsing - doesn't handle all edge cases
        const values = lines[i].split(',');
        const task: any = {
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
    } else {
      // Parse JSON
      try {
        const parsed = JSON.parse(data);
        tasksToImport = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    }

    // Import tasks
    let imported = 0;
    for (const taskData of tasksToImport) {
      try {
        const input: CreateTaskInput = {
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
      } catch (error) {
        console.error('Failed to import task:', error);
      }
    }

    return imported;
  }
}