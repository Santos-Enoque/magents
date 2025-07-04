import { TaskIntegration, TaskData, CreateTaskOptions, UpdateTaskOptions, TaskQueryOptions, TaskStatistics, TaskIntegrationCapabilities } from './TaskIntegration';
import { BaseTaskIntegrationFactory } from './TaskIntegrationFactory';
/**
 * Mock Task Integration for testing and development
 */
export declare class MockTaskIntegration implements TaskIntegration {
    readonly type = "mock";
    readonly name = "Mock Task Integration";
    readonly capabilities: TaskIntegrationCapabilities;
    private tasks;
    private nextId;
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
     * Create sample tasks for testing
     */
    private createSampleTasks;
}
/**
 * Factory for creating Mock Task Integration instances
 */
export declare class MockTaskIntegrationFactory extends BaseTaskIntegrationFactory {
    create(config: any): Promise<TaskIntegration>;
    getSupportedTypes(): string[];
    validateConfig(type: string, config: Record<string, unknown>): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=MockTaskIntegration.d.ts.map