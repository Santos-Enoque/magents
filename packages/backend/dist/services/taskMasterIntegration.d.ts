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
export declare class TaskMasterIntegrationService {
    /**
     * Detect if TaskMaster is configured in a project
     */
    detectTaskMaster(projectPath: string): Promise<TaskMasterDetection>;
    /**
     * Get available TaskMaster tasks from a project
     */
    getTasks(projectPath: string): Promise<TaskMasterTask[]>;
    /**
     * Get details of a specific task
     */
    getTaskDetails(projectPath: string, taskId: string): Promise<TaskMasterTask | null>;
    /**
     * Assign a task to an agent
     */
    assignTaskToAgent(agentId: string, taskId: string, projectPath: string, worktreePath: string): Promise<TaskAssignment>;
    /**
     * Create a new task from the GUI
     */
    createTask(projectPath: string, title: string, description: string, priority?: 'low' | 'medium' | 'high'): Promise<TaskMasterTask>;
    /**
     * Update task status
     */
    updateTaskStatus(projectPath: string, taskId: string, status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled'): Promise<void>;
    /**
     * Generate a task briefing for an agent
     */
    private generateTaskBriefing;
    /**
     * Generate task context JSON
     */
    private generateTaskContext;
    /**
     * Flatten nested tasks into a single array
     */
    private flattenTasks;
    /**
     * Normalize task data from various formats
     */
    private normalizeTask;
}
export declare const taskMasterIntegrationService: TaskMasterIntegrationService;
//# sourceMappingURL=taskMasterIntegration.d.ts.map