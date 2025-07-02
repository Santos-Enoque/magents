export interface SimplifiedTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    isSubtask: boolean;
    parentId?: string;
    description?: string;
}
export interface QuickStartOptions {
    projectPath: string;
    projectName?: string;
    autoDetectType?: boolean;
}
export interface ProjectType {
    type: 'node' | 'python' | 'java' | 'go' | 'rust' | 'unknown';
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'maven' | 'gradle' | 'cargo';
    frameworks: string[];
}
export declare class MagentsTaskManager {
    private taskMasterService;
    private cache;
    private readonly CACHE_TTL;
    constructor();
    /**
     * Quick start Task Master for a project with minimal configuration
     */
    quickStart(options: QuickStartOptions): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Automatically analyze project and expand tasks
     */
    autoAnalyze(projectPath: string): Promise<{
        success: boolean;
        message: string;
        taskCount?: number;
    }>;
    /**
     * Get simplified view of tasks
     */
    getSimplifiedTasks(projectPath: string): Promise<SimplifiedTask[]>;
    /**
     * Get next task in simplified format
     */
    getNextTask(projectPath: string): Promise<SimplifiedTask | null>;
    /**
     * Create a task with minimal input
     */
    createSimpleTask(projectPath: string, title: string, priority?: 'low' | 'medium' | 'high'): Promise<SimplifiedTask | null>;
    /**
     * Detect project type from files
     */
    private detectProjectType;
    /**
     * Generate PRD from project structure
     */
    private generatePRDFromProject;
    /**
     * Analyze project structure
     */
    private analyzeProjectStructure;
    /**
     * Simplify task data
     */
    private simplifyTask;
    /**
     * Translate Task Master errors to user-friendly messages
     */
    private translateError;
    /**
     * Cache management
     */
    private getCached;
    private setCache;
    private clearProjectCache;
}
export declare const magentsTaskManager: MagentsTaskManager;
//# sourceMappingURL=magentsTaskManager.d.ts.map