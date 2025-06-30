import { Project, CreateProjectOptions } from '@magents/shared';
export declare const projectController: {
    listProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project>;
    createProject(options: CreateProjectOptions): Promise<Project>;
    updateProject(id: string, updates: Partial<Project>): Promise<Project>;
    deleteProject(id: string): Promise<void>;
};
//# sourceMappingURL=projectController.d.ts.map