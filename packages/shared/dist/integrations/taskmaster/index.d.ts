import { TaskIntegration, TaskData, CreateTaskOptions, UpdateTaskOptions, TaskQueryOptions, TaskStatistics, TaskIntegrationCapabilities } from '../TaskIntegration';
import { BaseTaskIntegrationFactory } from '../TaskIntegrationFactory';
/**
 * TaskMaster Integration
 *
 * Integrates with the existing TaskMaster CLI tool for task management
 */
export declare class TaskMasterIntegration implements TaskIntegration {
    readonly type = "taskmaster";
    readonly name = "TaskMaster CLI";
    readonly capabilities: TaskIntegrationCapabilities;
    private config;
    initialize(config: Record<string, unknown>): Promise<void>;
    isAvailable(): Promise<boolean>;
    getTasks(projectPath: string, options?: TaskQueryOptions): Promise<TaskData[]>;
    getTask(projectPath: string, taskId: string): Promise<TaskData | null>;
    createTask(projectPath: string, options: CreateTaskOptions): Promise<TaskData>;
    updateTask(projectPath: string, taskId: string, options: UpdateTaskOptions): Promise<TaskData>;
    deleteTask(projectPath: string, taskId: string): Promise<void>;
    assignTask(projectPath: string, taskId: string, assigneeId: string): Promise<TaskData>;
    unassignTask(projectPath: string, taskId: string): Promise<TaskData>;
    getStatistics(projectPath: string): Promise<TaskStatistics>;
    searchTasks(projectPath: string, query: string, options?: TaskQueryOptions): Promise<TaskData[]>;
    getAvailableAssignees(projectPath: string): Promise<Array<{
        id: string;
        name: string;
        type: string;
    }>>;
    dispose(): Promise<void>;
    /**
     * Flatten nested tasks into a single array
     */
    private flattenTasks;
    /**
     * Normalize task data from TaskMaster format
     */
    private normalizeTask;
    /**
     * Filter tasks based on query options
     */
    private filterTasks;
}
/**
 * Factory for creating TaskMaster Integration instances
 */
export declare class TaskMasterIntegrationFactory extends BaseTaskIntegrationFactory {
    create(config: any): Promise<TaskIntegration>;
    getSupportedTypes(): string[];
    validateConfig(type: string, config: Record<string, unknown>): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=index.d.ts.map