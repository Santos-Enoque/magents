import { TaskMasterTask } from '@magents/shared';
import { taskMasterIntegrationService, TaskMasterDetection, TaskAssignment } from '../services/taskMasterIntegrationWrapper';
import { agentController } from './agentController';

export const taskMasterController = {
  /**
   * Detect if TaskMaster is configured in a project
   */
  async detectTaskMaster(projectPath: string): Promise<TaskMasterDetection> {
    if (!projectPath) {
      throw new Error('Project path is required');
    }

    return await taskMasterIntegrationService.detectTaskMaster(projectPath);
  },

  /**
   * Get available tasks from a TaskMaster-enabled project
   */
  async getTasks(projectPath: string): Promise<TaskMasterTask[]> {
    if (!projectPath) {
      throw new Error('Project path is required');
    }

    const detection = await taskMasterIntegrationService.detectTaskMaster(projectPath);
    if (!detection.isConfigured) {
      throw new Error('TaskMaster is not configured in this project');
    }

    return await taskMasterIntegrationService.getTasks(projectPath);
  },

  /**
   * Get details of a specific task
   */
  async getTaskDetails(projectPath: string, taskId: string): Promise<TaskMasterTask> {
    if (!projectPath || !taskId) {
      throw new Error('Project path and task ID are required');
    }

    const task = await taskMasterIntegrationService.getTaskDetails(projectPath, taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    return task;
  },

  /**
   * Assign a task to an agent
   */
  async assignTaskToAgent(agentId: string, taskId: string, projectPath: string): Promise<TaskAssignment> {
    if (!agentId || !taskId || !projectPath) {
      throw new Error('Agent ID, task ID, and project path are required');
    }

    // Get the agent to verify it exists and get its worktree path
    const agent = await agentController.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Validate that the agent belongs to a project that matches the task's project
    if (agent.projectId) {
      // Get the project details to validate the project path
      const projectController = (await import('./projectController')).projectController;
      const project = await projectController.getProject(agent.projectId);
      
      if (project && project.path !== projectPath) {
        throw new Error(`Agent ${agentId} belongs to project "${project.name}" (${project.path}), but task is from project "${projectPath}". Agents can only be assigned tasks from their own project.`);
      }
    }

    // Assign the task
    const assignment = await taskMasterIntegrationService.assignTaskToAgent(
      agentId,
      taskId,
      projectPath,
      agent.worktreePath
    );

    // Update agent environment with task information
    const updatedEnvironment = {
      ...agent.config?.environment,
      ...assignment.environment
    };

    // Update agent configuration
    await agentController.updateAgentConfig(agentId, {
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
  async createTask(
    projectPath: string,
    title: string,
    description: string,
    priority?: 'low' | 'medium' | 'high'
  ): Promise<TaskMasterTask> {
    if (!projectPath || !title) {
      throw new Error('Project path and title are required');
    }

    const detection = await taskMasterIntegrationService.detectTaskMaster(projectPath);
    if (!detection.isConfigured) {
      throw new Error('TaskMaster is not configured in this project');
    }

    return await taskMasterIntegrationService.createTask(
      projectPath,
      title,
      description,
      priority
    );
  },

  /**
   * Update task status
   */
  async updateTaskStatus(
    projectPath: string,
    taskId: string,
    status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled'
  ): Promise<void> {
    if (!projectPath || !taskId || !status) {
      throw new Error('Project path, task ID, and status are required');
    }

    const validStatuses = ['pending', 'in-progress', 'done', 'blocked', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    await taskMasterIntegrationService.updateTaskStatus(projectPath, taskId, status);
  },

  /**
   * Get agents available for task assignment in a specific project
   */
  async getAvailableAgentsForProject(projectPath: string): Promise<any[]> {
    if (!projectPath) {
      throw new Error('Project path is required');
    }

    // Get project by path to find projectId
    const projectController = (await import('./projectController')).projectController;
    const projects = await projectController.listProjects();
    const project = projects.find(p => p.path === projectPath);
    
    if (!project) {
      throw new Error(`No project found for path: ${projectPath}`);
    }

    // Get agents for this project
    const agents = await agentController.getAgentsByProject(project.id);
    
    // Filter to only show agents that are available for task assignment
    return agents.filter(agent => 
      agent.status === 'RUNNING' || agent.status === 'CREATED'
    );
  },

  /**
   * Get task statistics for a project
   */
  async getTaskStatistics(projectPath: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const tasks = await this.getTasks(projectPath);
    
    const stats = {
      total: tasks.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
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