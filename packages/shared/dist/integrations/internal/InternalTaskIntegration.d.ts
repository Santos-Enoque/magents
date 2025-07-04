import { TaskIntegration, TaskData, TaskIntegrationCapabilities, TaskIntegrationMetadata, TaskListOptions, TaskListResult, TaskSearchOptions } from '../TaskIntegration';
export declare class InternalTaskIntegration implements TaskIntegration {
    readonly name = "Internal Task System";
    readonly type = "internal";
    readonly version = "1.0.0";
    readonly capabilities: TaskIntegrationCapabilities;
    private taskRepository;
    private initialized;
    constructor();
    initialize(configuration?: any): Promise<void>;
    getMetadata(): Promise<TaskIntegrationMetadata>;
    isAvailable(): Promise<boolean>;
    private convertInternalToTaskData;
    listTasks(options?: TaskListOptions): Promise<TaskListResult>;
    getTask(taskId: string): Promise<TaskData | null>;
    createTask(data: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskData>;
    updateTask(taskId: string, updates: Partial<TaskData>): Promise<TaskData | null>;
    deleteTask(taskId: string): Promise<boolean>;
    assignTask(taskId: string, assigneeId: string): Promise<boolean>;
    unassignTask(taskId: string): Promise<boolean>;
    searchTasks(options: TaskSearchOptions): Promise<TaskData[]>;
    addSubtask(parentTaskId: string, subtask: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskData>;
    updateDependencies(taskId: string, dependencies: string[]): Promise<boolean>;
    getStatistics(projectId?: string): Promise<Record<string, any>>;
    exportTasks(options?: {
        projectId?: string;
        format?: 'json' | 'csv';
    }): Promise<string>;
    importTasks(data: string, options?: {
        projectId?: string;
        format?: 'json' | 'csv';
    }): Promise<number>;
}
//# sourceMappingURL=InternalTaskIntegration.d.ts.map