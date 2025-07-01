import { Project, CreateProjectOptions, ProjectStatus } from '@magents/shared';
export declare class ProjectManager {
    private static instance;
    private projectsDir;
    private projectsFile;
    private projects;
    private constructor();
    static getInstance(): ProjectManager;
    private initializeStorage;
    private loadProjects;
    private saveProjects;
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
}
//# sourceMappingURL=ProjectManager.d.ts.map