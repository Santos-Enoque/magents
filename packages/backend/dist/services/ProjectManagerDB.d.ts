import { Project, CreateProjectOptions, ProjectStatus, DatabaseMigrationResult } from '@magents/shared';
/**
 * Database-backed implementation of ProjectManager
 * This replaces the file-based ProjectManager with SQLite repository usage
 */
export declare class ProjectManagerDB {
    private static instance;
    private db;
    private initialized;
    private constructor();
    static getInstance(): ProjectManagerDB;
    private ensureInitialized;
    listProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project>;
    createProject(options: CreateProjectOptions): Promise<Project>;
    updateProject(id: string, updates: Partial<Project>): Promise<Project>;
    deleteProject(id: string): Promise<void>;
    addAgentToProject(projectId: string, agentId: string): Promise<Project>;
    removeAgentFromProject(projectId: string, agentId: string): Promise<Project>;
    getProjectStats(id: string): Promise<{
        agentCount: number;
        status: ProjectStatus;
        lastActivity: Date | null;
        uptime: string;
    }>;
    private calculateUptime;
    searchProjects(query: string): Promise<Project[]>;
    getProjectsByStatus(status: ProjectStatus): Promise<Project[]>;
    getProjectSettings(id: string): Promise<Record<string, any>>;
    updateProjectSettings(id: string, settings: Record<string, any>): Promise<Record<string, any>>;
    resetProjectSettings(id: string): Promise<Record<string, any>>;
    /**
     * Convert UnifiedProjectData to Project format for backward compatibility
     */
    private convertToProject;
    private getDefaultProjectSettings;
    createProjectFromTemplate(templateName: string, options: CreateProjectOptions): Promise<Project>;
    getProjectTemplate(templateName: string): Promise<{
        name: string;
        description: string;
        projectDefaults: Partial<CreateProjectOptions>;
        settings: Record<string, any>;
    }>;
    saveProjectTemplate(templateName: string, template: {
        name: string;
        description: string;
        projectDefaults: Partial<CreateProjectOptions>;
        settings: Record<string, any>;
    }): Promise<void>;
    listProjectTemplates(): Promise<string[]>;
    private getDefaultTemplate;
    /**
     * Migrate data from file-based storage to database
     */
    migrateFromFileStorage(): Promise<DatabaseMigrationResult>;
}
//# sourceMappingURL=ProjectManagerDB.d.ts.map