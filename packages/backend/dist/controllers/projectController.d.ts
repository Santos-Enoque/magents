import { Project, CreateProjectOptions } from '@magents/shared';
export declare const projectController: {
    listProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project>;
    createProject(options: CreateProjectOptions): Promise<Project>;
    updateProject(id: string, updates: Partial<Project>): Promise<Project>;
    deleteProject(id: string): Promise<void>;
    addAgentToProject(projectId: string, agentId: string): Promise<Project>;
    removeAgentFromProject(projectId: string, agentId: string): Promise<Project>;
    getProjectStats(id: string): Promise<{
        agentCount: number;
        status: string;
        lastActivity: Date | null;
        uptime: string;
    }>;
    searchProjects(query: string): Promise<Project[]>;
    getProjectsByStatus(status: "ACTIVE" | "INACTIVE"): Promise<Project[]>;
    getProjectSettings(id: string): Promise<Record<string, any>>;
    updateProjectSettings(id: string, settings: Record<string, any>): Promise<Record<string, any>>;
    resetProjectSettings(id: string): Promise<Record<string, any>>;
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
};
//# sourceMappingURL=projectController.d.ts.map