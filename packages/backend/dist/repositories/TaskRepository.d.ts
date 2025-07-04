export interface InternalTask {
    id: string;
    taskMasterId?: string;
    projectId: string;
    title: string;
    description?: string;
    details?: string;
    status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    assignedToAgentId?: string;
    parentTaskId?: string;
    subtaskIds?: string[];
    dependencies?: string[];
    testStrategy?: string;
    testResults?: Record<string, any>;
    estimatedEffort?: number;
    actualEffort?: number;
    tags?: string[];
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    assignedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export interface CreateTaskInput {
    projectId: string;
    title: string;
    description?: string;
    details?: string;
    status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    assignedToAgentId?: string;
    parentTaskId?: string;
    dependencies?: string[];
    testStrategy?: string;
    estimatedEffort?: number;
    tags?: string[];
    metadata?: Record<string, any>;
    taskMasterId?: string;
}
export interface UpdateTaskInput {
    title?: string;
    description?: string;
    details?: string;
    status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    assignedToAgentId?: string;
    dependencies?: string[];
    testStrategy?: string;
    testResults?: Record<string, any>;
    estimatedEffort?: number;
    actualEffort?: number;
    tags?: string[];
    metadata?: Record<string, any>;
}
export interface TaskFilter {
    projectId?: string;
    status?: string | string[];
    priority?: string | string[];
    assignedToAgentId?: string;
    parentTaskId?: string;
    hasSubtasks?: boolean;
    hasDependencies?: boolean;
    tags?: string[];
    includeSubtasks?: boolean;
}
export declare class TaskRepository {
    private db;
    constructor();
    /**
     * Create a new task
     */
    create(input: CreateTaskInput): Promise<InternalTask>;
    /**
     * Find a task by ID
     */
    findById(id: string): InternalTask | null;
    /**
     * Find tasks by project ID
     */
    findByProjectId(projectId: string): InternalTask[];
    /**
     * Find tasks with filters
     */
    findWithFilters(filter: TaskFilter): InternalTask[];
    /**
     * Find all subtasks of a task
     */
    findSubtasks(parentTaskId: string): InternalTask[];
    /**
     * Update a task
     */
    update(id: string, input: UpdateTaskInput): Promise<InternalTask | null>;
    /**
     * Delete a task
     */
    delete(id: string): Promise<boolean>;
    /**
     * Add a subtask to a parent task
     */
    private addSubtaskToParent;
    /**
     * Remove a subtask from a parent task
     */
    private removeSubtaskFromParent;
    /**
     * Convert a database row to a Task object
     */
    private rowToTask;
    /**
     * Get task statistics for a project
     */
    getStatistics(projectId?: string): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        assigned: number;
        unassigned: number;
    }>;
}
//# sourceMappingURL=TaskRepository.d.ts.map