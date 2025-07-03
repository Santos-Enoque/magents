import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { TaskMasterConfig } from '@magents/shared';
import { taskIntegrationManager, TaskData } from '@magents/shared/src/integrations';

export interface TaskMasterTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  details?: string;
  testStrategy?: string;
  subtasks?: TaskMasterTask[];
}

const execAsync = promisify(exec);

export interface TaskMasterDetection {
  isConfigured: boolean;
  configPath?: string;
  config?: TaskMasterConfig;
  tasksPath?: string;
  hasActiveTasks?: boolean;
}

export interface TaskBriefing {
  agentId: string;
  taskId: string;
  briefingPath: string;
  content: string;
}

export interface TaskAssignment {
  agentId: string;
  taskId: string;
  task: TaskMasterTask;
  briefingPath: string;
  contextPath: string;
  environment: Record<string, string>;
}

/**
 * Wrapper service that maintains backward compatibility
 * while using the new integration system
 */
export class TaskMasterIntegrationWrapper {
  private static instance: TaskMasterIntegrationWrapper;

  static getInstance(): TaskMasterIntegrationWrapper {
    if (!TaskMasterIntegrationWrapper.instance) {
      TaskMasterIntegrationWrapper.instance = new TaskMasterIntegrationWrapper();
    }
    return TaskMasterIntegrationWrapper.instance;
  }

  /**
   * Convert TaskData to TaskMasterTask format
   */
  private convertTaskDataToTaskMasterTask(task: TaskData): TaskMasterTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskMasterTask['status'],
      priority: (task.priority || 'medium') as TaskMasterTask['priority'],
      dependencies: task.dependencies || [],
      details: task.metadata?.details as string,
      testStrategy: task.metadata?.testStrategy as string,
      subtasks: task.subtasks?.map(st => this.convertTaskDataToTaskMasterTask(st))
    };
  }

  /**
   * Detect if TaskMaster is configured in a project
   */
  async detectTaskMaster(projectPath: string): Promise<TaskMasterDetection> {
    const result: TaskMasterDetection = {
      isConfigured: false
    };

    try {
      // Check for .taskmaster directory
      const taskMasterDir = path.join(projectPath, '.taskmaster');
      const dirStats = await fs.stat(taskMasterDir).catch(() => null);
      
      if (!dirStats || !dirStats.isDirectory()) {
        return result;
      }

      // Check for config file
      const configPath = path.join(taskMasterDir, 'config.json');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      
      if (configExists) {
        result.isConfigured = true;
        result.configPath = configPath;
        
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          result.config = JSON.parse(configContent) as TaskMasterConfig;
        } catch (error) {
          console.warn('Failed to parse TaskMaster config:', error);
        }
      }

      // Check for tasks file
      const tasksPath = path.join(taskMasterDir, 'tasks', 'tasks.json');
      const tasksExists = await fs.access(tasksPath).then(() => true).catch(() => false);
      
      if (tasksExists) {
        result.tasksPath = tasksPath;
        result.hasActiveTasks = true;
      }

      return result;
    } catch (error) {
      console.error('Error detecting TaskMaster:', error);
      return result;
    }
  }

  /**
   * Get available TaskMaster tasks from a project
   */
  async getTasks(projectPath: string): Promise<TaskMasterTask[]> {
    // Try to get tasks via the integration system
    const integrations = await taskIntegrationManager.getActiveIntegrations();
    const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');

    if (taskMasterIntegration) {
      try {
        const tasks = await taskMasterIntegration.listTasks({
          projectId: projectPath,
          includeSubtasks: true
        });
        return tasks.map(task => this.convertTaskDataToTaskMasterTask(task));
      } catch (error) {
        console.warn('Failed to get tasks via integration, falling back to direct method:', error);
      }
    }

    // Fallback to the original implementation using the existing service
    const originalService = await import('./taskMasterIntegration');
    const service = new originalService.TaskMasterIntegrationService();
    return service.getTasks(projectPath);
  }

  /**
   * Get details of a specific task
   */
  async getTaskDetails(projectPath: string, taskId: string): Promise<TaskMasterTask | null> {
    // Try to get task via the integration system
    const integrations = await taskIntegrationManager.getActiveIntegrations();
    const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');

    if (taskMasterIntegration) {
      try {
        const task = await taskMasterIntegration.getTask(taskId);
        return task ? this.convertTaskDataToTaskMasterTask(task) : null;
      } catch (error) {
        console.warn('Failed to get task via integration, falling back to direct method:', error);
      }
    }

    // Fallback to the original implementation
    const originalService = await import('./taskMasterIntegration');
    const service = new originalService.TaskMasterIntegrationService();
    return service.getTaskDetails(projectPath, taskId);
  }

  /**
   * Create a new task
   */
  async createTask(
    projectPath: string,
    title: string,
    description: string,
    priority?: 'low' | 'medium' | 'high'
  ): Promise<TaskMasterTask> {
    // Try to create task via the integration system
    const integrations = await taskIntegrationManager.getActiveIntegrations();
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
      } catch (error) {
        console.warn('Failed to create task via integration, falling back to direct method:', error);
      }
    }

    // Fallback to the original implementation
    const originalService = await import('./taskMasterIntegration');
    const service = new originalService.TaskMasterIntegrationService();
    return service.createTask(projectPath, title, description, priority);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    projectPath: string,
    taskId: string,
    status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled'
  ): Promise<void> {
    // Try to update via the integration system
    const integrations = await taskIntegrationManager.getActiveIntegrations();
    const taskMasterIntegration = integrations.find(i => i.name === 'TaskMaster CLI');

    if (taskMasterIntegration && taskMasterIntegration.capabilities.canUpdate) {
      try {
        await taskMasterIntegration.updateTask(taskId, { status });
        return;
      } catch (error) {
        console.warn('Failed to update task via integration, falling back to direct method:', error);
      }
    }

    // Fallback to the original implementation
    const originalService = await import('./taskMasterIntegration');
    const service = new originalService.TaskMasterIntegrationService();
    return service.updateTaskStatus(projectPath, taskId, status);
  }

  /**
   * Assign a task to an agent (delegates to original service)
   */
  async assignTaskToAgent(
    agentId: string,
    taskId: string,
    projectPath: string,
    worktreePath?: string
  ): Promise<TaskAssignment> {
    // This is a specific feature that doesn't map to the generic integration
    // So we always use the original implementation
    const originalService = await import('./taskMasterIntegration');
    const service = new originalService.TaskMasterIntegrationService();
    return service.assignTaskToAgent(agentId, taskId, projectPath, worktreePath);
  }
}

// Export a singleton instance for backward compatibility
export const taskMasterIntegrationService = TaskMasterIntegrationWrapper.getInstance();