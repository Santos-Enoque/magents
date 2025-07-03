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
 * TaskMaster Integration
 * 
 * Integrates with the existing TaskMaster CLI tool for task management
 */
export class TaskMasterIntegration implements TaskIntegration {
  readonly type = 'taskmaster';
  readonly name = 'TaskMaster CLI';
  readonly capabilities: TaskIntegrationCapabilities = {
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

  private config: Record<string, unknown> = {};

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    // Check if TaskMaster CLI is available by running a simple command
    try {
      const { execSync } = require('child_process');
      execSync('task-master --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async getTasks(projectPath: string, options?: TaskQueryOptions): Promise<TaskData[]> {
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
      let tasks: TaskData[] = [];

      if (tasksData && tasksData.master && tasksData.master.tasks) {
        tasks = this.flattenTasks(tasksData.master.tasks);
      }

      // Apply client-side filtering since TaskMaster doesn't support it natively
      return this.filterTasks(tasks, options);
    } catch (error) {
      console.error('Error getting TaskMaster tasks:', error);
      
      // Fallback to reading tasks.json directly
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const tasksPath = path.join(projectPath, '.taskmaster', 'tasks', 'tasks.json');
        const tasksContent = await fs.readFile(tasksPath, 'utf-8');
        const tasksData = JSON.parse(tasksContent);
        
        let tasks: TaskData[] = [];
        if (tasksData && tasksData.master && tasksData.master.tasks) {
          tasks = this.flattenTasks(tasksData.master.tasks);
        }

        return this.filterTasks(tasks, options);
      } catch (fallbackError) {
        console.error('Fallback task reading failed:', fallbackError);
        return [];
      }
    }
  }

  async getTask(projectPath: string, taskId: string): Promise<TaskData | null> {
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
    } catch (error) {
      console.error(`Error getting task details for ${taskId}:`, error);
      
      // Fallback to getting all tasks and finding the specific one
      const allTasks = await this.getTasks(projectPath);
      return allTasks.find(task => task.id === taskId) || null;
    }
  }

  async createTask(projectPath: string, options: CreateTaskOptions): Promise<TaskData> {
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
    } catch (error) {
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTask(projectPath: string, taskId: string, options: UpdateTaskOptions): Promise<TaskData> {
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
        if (options.title) updates.push(`title: ${options.title}`);
        if (options.description) updates.push(`description: ${options.description}`);
        if (options.details) updates.push(`details: ${options.details}`);
        
        const updateText = updates.join(', ');
        await execAsync(`task-master update-task --id=${taskId} --prompt="${updateText}"`, {
          cwd: projectPath
        });
      }

      // Return the updated task
      const updatedTask = await this.getTask(projectPath, taskId);
      if (!updatedTask) {
        throw new TaskNotFoundError(taskId, this.type);
      }

      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTask(projectPath: string, taskId: string): Promise<void> {
    throw new Error('TaskMaster does not support task deletion');
  }

  async assignTask(projectPath: string, taskId: string, assigneeId: string): Promise<TaskData> {
    // TaskMaster doesn't have native assignment, but we can store it in metadata
    return this.updateTask(projectPath, taskId, {
      metadata: { assignedTo: assigneeId }
    });
  }

  async unassignTask(projectPath: string, taskId: string): Promise<TaskData> {
    return this.updateTask(projectPath, taskId, {
      metadata: { assignedTo: null }
    });
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
    // TaskMaster doesn't have assignee management, return empty array
    return [];
  }

  async dispose(): Promise<void> {
    this.config = {};
  }

  /**
   * Flatten nested tasks into a single array
   */
  private flattenTasks(tasks: unknown[]): TaskData[] {
    const flattened: TaskData[] = [];

    const processTask = (task: unknown) => {
      const normalizedTask = this.normalizeTask(task);
      if (normalizedTask) {
        flattened.push(normalizedTask);
        
        // Process subtasks recursively
        const taskObj = task as Record<string, unknown>;
        if (taskObj.subtasks && Array.isArray(taskObj.subtasks)) {
          taskObj.subtasks.forEach((subtask: unknown) => {
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
  private normalizeTask(task: unknown): TaskData | null {
    if (!task || typeof task !== 'object') {
      return null;
    }

    const taskObj = task as Record<string, unknown>;
    
    return {
      id: String(taskObj.id || ''),
      title: String(taskObj.title || 'Untitled Task'),
      description: taskObj.description as string | undefined,
      status: (taskObj.status as TaskStatus) || 'pending',
      priority: (taskObj.priority as TaskPriority) || 'medium',
      dependencies: (taskObj.dependencies as string[]) || [],
      subtasks: [], // Subtasks are flattened separately
      details: taskObj.details as string | undefined,
      testStrategy: taskObj.testStrategy as string | undefined,
      assignedTo: (taskObj.metadata as any)?.assignedTo,
      projectId: taskObj.projectId as string | undefined,
      createdAt: new Date(), // TaskMaster doesn't provide timestamps
      updatedAt: new Date(),
      metadata: (taskObj.metadata as Record<string, unknown>) || {}
    };
  }

  /**
   * Filter tasks based on query options
   */
  private filterTasks(tasks: TaskData[], options?: TaskQueryOptions): TaskData[] {
    if (!options) return tasks;

    let filtered = [...tasks];

    // Filter by status
    if (options.status && options.status.length > 0) {
      filtered = filtered.filter(task => options.status!.includes(task.status));
    }

    // Filter by priority
    if (options.priority && options.priority.length > 0) {
      filtered = filtered.filter(task => options.priority!.includes(task.priority));
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
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.id.toLowerCase().includes(searchLower)
      );
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

/**
 * Factory for creating TaskMaster Integration instances
 */
export class TaskMasterIntegrationFactory extends BaseTaskIntegrationFactory {
  async create(config: any): Promise<TaskIntegration> {
    return new TaskMasterIntegration();
  }

  getSupportedTypes(): string[] {
    return ['taskmaster'];
  }

  async validateConfig(type: string, config: Record<string, unknown>): Promise<{valid: boolean; errors: string[]}> {
    const baseValidation = await super.validateConfig(type, config);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }

    const errors: string[] = [];

    // Check if TaskMaster CLI is available
    try {
      const { execSync } = require('child_process');
      execSync('task-master --version', { stdio: 'ignore' });
    } catch {
      errors.push('TaskMaster CLI is not available. Please install task-master-ai package.');
    }

    return {
      valid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
}