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
/**
 * Wrapper service that maintains backward compatibility
 * while using the new integration system
 */
export declare class TaskMasterIntegrationWrapper {
    private static instance;
    static getInstance(): TaskMasterIntegrationWrapper;
    /**
     * Convert TaskData to TaskMasterTask format
     */
    private convertTaskDataToTaskMasterTask;
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
     * Create a new task
     */
    createTask(projectPath: string, title: string, description: string, priority?: 'low' | 'medium' | 'high'): Promise<TaskMasterTask>;
    /**
     * Update task status
     */
    updateTaskStatus(projectPath: string, taskId: string, status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled'): Promise<void>;
    /**
     * Assign a task to an agent (delegates to original service)
     */
    assignTaskToAgent(agentId: string, taskId: string, projectPath: string, worktreePath?: string): Promise<TaskAssignment>;
}
export declare const taskMasterIntegrationService: TaskMasterIntegrationWrapper;
//# sourceMappingURL=taskMasterIntegrationWrapper.d.ts.map