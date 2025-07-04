/**
 * Task Integration Interface
 *
 * Defines a common interface for task management systems that can be plugged
 * into the Magents platform. This allows for multiple task backends like
 * Task Master, internal task management, Jira integration, etc.
 */
export interface TaskData {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dependencies?: string[];
    subtasks?: TaskData[];
    details?: string;
    testStrategy?: string;
    assignedTo?: string;
    projectId?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
}
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export interface CreateTaskOptions {
    title: string;
    description?: string;
    priority?: TaskPriority;
    parentId?: string;
    projectId?: string;
    assignedTo?: string;
    details?: string;
    testStrategy?: string;
    dependencies?: string[];
    metadata?: Record<string, unknown>;
}
export interface UpdateTaskOptions {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string;
    details?: string;
    testStrategy?: string;
    dependencies?: string[];
    metadata?: Record<string, unknown>;
}
export interface TaskQueryOptions {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assignedTo?: string;
    projectId?: string;
    search?: string;
    includeSubtasks?: boolean;
    limit?: number;
    offset?: number;
}
export interface TaskStatistics {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    byAssignee: Record<string, number>;
}
export interface TaskIntegrationCapabilities {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canAssign: boolean;
    supportsSubtasks: boolean;
    supportsDependencies: boolean;
    supportsSearch: boolean;
    supportsPagination: boolean;
    supportsRealTimeUpdates: boolean;
}
export interface TaskIntegrationConfig {
    type: string;
    name: string;
    enabled: boolean;
    configuration: Record<string, unknown>;
    capabilities: TaskIntegrationCapabilities;
}
/**
 * Main Task Integration Interface
 *
 * This interface must be implemented by all task management integrations.
 */
export interface TaskIntegration {
    readonly type: string;
    readonly name: string;
    readonly capabilities: TaskIntegrationCapabilities;
    /**
     * Initialize the integration with configuration
     */
    initialize(config: Record<string, unknown>): Promise<void>;
    /**
     * Check if the integration is available and properly configured
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get tasks based on query options
     */
    getTasks(projectPath: string, options?: TaskQueryOptions): Promise<TaskData[]>;
    /**
     * Get details of a specific task
     */
    getTask(projectPath: string, taskId: string): Promise<TaskData | null>;
    /**
     * Create a new task
     */
    createTask(projectPath: string, options: CreateTaskOptions): Promise<TaskData>;
    /**
     * Update an existing task
     */
    updateTask(projectPath: string, taskId: string, options: UpdateTaskOptions): Promise<TaskData>;
    /**
     * Delete a task
     */
    deleteTask(projectPath: string, taskId: string): Promise<void>;
    /**
     * Assign a task to an agent/user
     */
    assignTask(projectPath: string, taskId: string, assigneeId: string): Promise<TaskData>;
    /**
     * Unassign a task
     */
    unassignTask(projectPath: string, taskId: string): Promise<TaskData>;
    /**
     * Get task statistics for a project
     */
    getStatistics(projectPath: string): Promise<TaskStatistics>;
    /**
     * Search tasks by query string
     */
    searchTasks(projectPath: string, query: string, options?: TaskQueryOptions): Promise<TaskData[]>;
    /**
     * Get available assignees for a project
     */
    getAvailableAssignees(projectPath: string): Promise<Array<{
        id: string;
        name: string;
        type: string;
    }>>;
    /**
     * Subscribe to task changes (if supported)
     */
    onTaskChanged?(callback: (task: TaskData, changeType: 'created' | 'updated' | 'deleted') => void): void;
    /**
     * Unsubscribe from task changes
     */
    offTaskChanged?(callback: (task: TaskData, changeType: 'created' | 'updated' | 'deleted') => void): void;
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}
/**
 * Task Integration Factory Interface
 */
export interface TaskIntegrationFactory {
    /**
     * Create a task integration instance
     */
    create(config: TaskIntegrationConfig): Promise<TaskIntegration>;
    /**
     * Get supported integration types
     */
    getSupportedTypes(): string[];
    /**
     * Validate configuration for a specific type
     */
    validateConfig(type: string, config: Record<string, unknown>): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
/**
 * Task Integration Registry Interface
 */
export interface TaskIntegrationRegistry {
    /**
     * Register a task integration factory
     */
    register(type: string, factory: TaskIntegrationFactory): void;
    /**
     * Unregister a task integration factory
     */
    unregister(type: string): void;
    /**
     * Get a task integration factory by type
     */
    getFactory(type: string): TaskIntegrationFactory | null;
    /**
     * Get all registered types
     */
    getRegisteredTypes(): string[];
    /**
     * Create an integration instance
     */
    createIntegration(config: TaskIntegrationConfig): Promise<TaskIntegration>;
}
/**
 * Errors
 */
export declare class TaskIntegrationError extends Error {
    readonly code?: string | undefined;
    readonly integration?: string | undefined;
    constructor(message: string, code?: string | undefined, integration?: string | undefined);
}
export declare class TaskNotFoundError extends TaskIntegrationError {
    constructor(taskId: string, integration?: string);
}
export declare class TaskIntegrationNotAvailableError extends TaskIntegrationError {
    constructor(type: string);
}
export declare class InvalidTaskOperationError extends TaskIntegrationError {
    constructor(operation: string, reason: string, integration?: string);
}
//# sourceMappingURL=TaskIntegration.d.ts.map