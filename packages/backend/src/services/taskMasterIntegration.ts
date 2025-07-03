import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { TaskMasterConfig } from '@magents/shared';

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

interface TaskCache {
  tasks: TaskMasterTask[];
  timestamp: number;
  projectPath: string;
}

export class TaskMasterIntegrationService {
  private taskCache = new Map<string, TaskCache>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds
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
    // Check cache first
    const cacheKey = projectPath;
    const cached = this.taskCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheExpiry) {
      return cached.tasks;
    }

    try {
      // First check if TaskMaster is configured
      const detection = await this.detectTaskMaster(projectPath);
      if (!detection.isConfigured || !detection.tasksPath) {
        // Cache empty result
        this.taskCache.set(cacheKey, {
          tasks: [],
          timestamp: now,
          projectPath
        });
        return [];
      }

      // Execute task-master list command with JSON output
      const { stdout } = await execAsync('task-master list --json', {
        cwd: projectPath,
        env: { ...process.env, FORCE_COLOR: '0' } // Disable color output
      });

      // Parse the JSON output
      const tasksData = JSON.parse(stdout);
      
      // Extract tasks from the structure
      let tasks: TaskMasterTask[] = [];
      if (tasksData && tasksData.master && tasksData.master.tasks) {
        tasks = this.flattenTasks(tasksData.master.tasks);
      }

      // Cache the result
      this.taskCache.set(cacheKey, {
        tasks,
        timestamp: now,
        projectPath
      });

      return tasks;
    } catch (error) {
      console.error('Error getting TaskMaster tasks:', error);
      
      // Fallback to reading tasks.json directly
      try {
        const tasksPath = path.join(projectPath, '.taskmaster', 'tasks', 'tasks.json');
        const tasksContent = await fs.readFile(tasksPath, 'utf-8');
        const tasksData = JSON.parse(tasksContent);
        
        let tasks: TaskMasterTask[] = [];
        if (tasksData && tasksData.master && tasksData.master.tasks) {
          tasks = this.flattenTasks(tasksData.master.tasks);
        }

        // Cache the fallback result
        this.taskCache.set(cacheKey, {
          tasks,
          timestamp: now,
          projectPath
        });

        return tasks;
      } catch (fallbackError) {
        console.error('Fallback task reading failed:', fallbackError);
      }
      
      // Cache empty result on complete failure
      this.taskCache.set(cacheKey, {
        tasks: [],
        timestamp: now,
        projectPath
      });
      
      return [];
    }
  }

  /**
   * Get details of a specific task
   */
  async getTaskDetails(projectPath: string, taskId: string): Promise<TaskMasterTask | null> {
    try {
      // Execute task-master show command
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

  /**
   * Assign a task to an agent
   */
  async assignTaskToAgent(
    agentId: string,
    taskId: string,
    projectPath: string,
    worktreePath: string
  ): Promise<TaskAssignment> {
    // Get task details
    const task = await this.getTaskDetails(projectPath, taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Create briefing content
    const briefingContent = this.generateTaskBriefing(task, agentId);
    
    // Write briefing file to agent's worktree
    const briefingDir = path.join(worktreePath, '.agent');
    await fs.mkdir(briefingDir, { recursive: true });
    
    const briefingPath = path.join(briefingDir, 'task-briefing.md');
    await fs.writeFile(briefingPath, briefingContent);

    // Create context file with task details
    const contextContent = this.generateTaskContext(task);
    const contextPath = path.join(briefingDir, 'task-context.json');
    await fs.writeFile(contextPath, JSON.stringify(contextContent, null, 2));

    // Create environment variables for the task
    const environment = {
      AGENT_TASK_ID: taskId,
      AGENT_TASK_TITLE: task.title,
      AGENT_TASK_PRIORITY: task.priority || 'medium',
      AGENT_TASK_STATUS: task.status,
      TASKMASTER_PROJECT_PATH: projectPath,
      TASKMASTER_BRIEFING_PATH: briefingPath,
      TASKMASTER_CONTEXT_PATH: contextPath
    };

    // Update task status to in-progress if it's pending
    if (task.status === 'pending') {
      try {
        await execAsync(`task-master set-status --id=${taskId} --status=in-progress`, {
          cwd: projectPath
        });
      } catch (error) {
        console.warn(`Failed to update task status: ${error}`);
      }
    }

    return {
      agentId,
      taskId,
      task,
      briefingPath,
      contextPath,
      environment
    };
  }

  /**
   * Create a new task from the GUI
   */
  async createTask(
    projectPath: string,
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<TaskMasterTask> {
    try {
      // Build the command with proper escaping
      const escapedTitle = title.replace(/"/g, '\\"');
      const escapedDescription = description.replace(/"/g, '\\"');
      
      const command = `task-master add-task --prompt="${escapedTitle}: ${escapedDescription}" --priority=${priority}`;
      
      const { stdout } = await execAsync(command, {
        cwd: projectPath,
        env: { ...process.env, FORCE_COLOR: '0' }
      });

      // Parse the output to extract the created task ID
      const taskIdMatch = stdout.match(/Task (\d+(?:\.\d+)*) added successfully/);
      if (taskIdMatch && taskIdMatch[1]) {
        // Invalidate cache since we added a new task
        this.invalidateCache(projectPath);
        
        const newTaskId = taskIdMatch[1];
        const task = await this.getTaskDetails(projectPath, newTaskId);
        
        if (task) {
          return task;
        }
      }

      // Invalidate cache even if we couldn't parse the task ID
      this.invalidateCache(projectPath);

      // If we couldn't parse the task ID, return a minimal task object
      return {
        id: 'temp-' + Date.now(),
        title,
        description,
        status: 'pending',
        priority
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    projectPath: string,
    taskId: string,
    status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled'
  ): Promise<void> {
    try {
      await execAsync(`task-master set-status --id=${taskId} --status=${status}`, {
        cwd: projectPath
      });
      
      // Invalidate cache for this project
      this.invalidateCache(projectPath);
    } catch (error) {
      throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invalidate cache for a specific project
   */
  private invalidateCache(projectPath: string): void {
    this.taskCache.delete(projectPath);
  }

  /**
   * Clear all cached tasks
   */
  public clearCache(): void {
    this.taskCache.clear();
  }

  /**
   * Generate a task briefing for an agent
   */
  private generateTaskBriefing(task: TaskMasterTask, agentId: string): string {
    const briefing = `# Task Briefing for Agent ${agentId}

## Task Information

**ID:** ${task.id}
**Title:** ${task.title}
**Priority:** ${task.priority || 'medium'}
**Status:** ${task.status}

## Description

${task.description || 'No description provided.'}

## Implementation Details

${task.details || 'No additional details provided.'}

## Test Strategy

${task.testStrategy || 'No specific test strategy defined.'}

${task.dependencies && task.dependencies.length > 0 ? `
## Dependencies

This task depends on the following tasks:
${task.dependencies.map(dep => `- Task ${dep}`).join('\n')}
` : ''}

${task.subtasks && task.subtasks.length > 0 ? `
## Subtasks

${task.subtasks.map((subtask, index) => `
### ${index + 1}. ${subtask.title}

${subtask.description || ''}

**Status:** ${subtask.status}
${subtask.details ? `\n**Details:** ${subtask.details}` : ''}
`).join('\n')}
` : ''}

## Instructions

1. Review the task requirements carefully
2. Implement the functionality as described
3. Write comprehensive tests following the test strategy
4. Update task status when complete
5. Document any important decisions or changes

## Commands

- View this task: \`task-master show ${task.id}\`
- Update status: \`task-master set-status --id=${task.id} --status=done\`
- Add notes: \`task-master update-task --id=${task.id} --prompt="your notes"\`

---

*This briefing was generated automatically for agent ${agentId}*
`;

    return briefing;
  }

  /**
   * Generate task context JSON
   */
  private generateTaskContext(task: TaskMasterTask): Record<string, unknown> {
    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority || 'medium',
        details: task.details,
        testStrategy: task.testStrategy,
        dependencies: task.dependencies || [],
        subtasks: task.subtasks || []
      },
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Flatten nested tasks into a single array
   */
  private flattenTasks(tasks: unknown[]): TaskMasterTask[] {
    const flattened: TaskMasterTask[] = [];

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
   * Normalize task data from various formats
   */
  private normalizeTask(task: unknown): TaskMasterTask | null {
    if (!task || typeof task !== 'object') {
      return null;
    }

    const taskObj = task as Record<string, unknown>;
    
    return {
      id: String(taskObj.id || ''),
      title: String(taskObj.title || 'Untitled Task'),
      description: taskObj.description as string | undefined,
      status: (taskObj.status as 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled') || 'pending',
      priority: (taskObj.priority as 'low' | 'medium' | 'high') || 'medium',
      dependencies: (taskObj.dependencies as string[]) || [],
      details: taskObj.details as string | undefined,
      testStrategy: taskObj.testStrategy as string | undefined,
      subtasks: [] // Subtasks are flattened separately
    };
  }
}

export const taskMasterIntegrationService = new TaskMasterIntegrationService();