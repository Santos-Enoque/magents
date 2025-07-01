import { TaskMasterTask } from '@magents/shared';
import { TaskMasterDetection, TaskAssignment } from '../services/taskMasterIntegration';
export declare const taskMasterController: {
    /**
     * Detect if TaskMaster is configured in a project
     */
    detectTaskMaster(projectPath: string): Promise<TaskMasterDetection>;
    /**
     * Get available tasks from a TaskMaster-enabled project
     */
    getTasks(projectPath: string): Promise<TaskMasterTask[]>;
    /**
     * Get details of a specific task
     */
    getTaskDetails(projectPath: string, taskId: string): Promise<TaskMasterTask>;
    /**
     * Assign a task to an agent
     */
    assignTaskToAgent(agentId: string, taskId: string, projectPath: string): Promise<TaskAssignment>;
    /**
     * Create a new task
     */
    createTask(projectPath: string, title: string, description: string, priority?: "low" | "medium" | "high"): Promise<TaskMasterTask>;
    /**
     * Update task status
     */
    updateTaskStatus(projectPath: string, taskId: string, status: "pending" | "in-progress" | "done" | "blocked" | "cancelled"): Promise<void>;
    /**
     * Get task statistics for a project
     */
    getTaskStatistics(projectPath: string): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
    }>;
};
//# sourceMappingURL=taskMasterController.d.ts.map