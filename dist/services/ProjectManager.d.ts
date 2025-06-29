import { Project, CreateProjectOptions, CommandResult } from '../types';
export declare class ProjectManager {
    private configManager;
    private projectsDir;
    constructor();
    createProject(options: CreateProjectOptions): Promise<CommandResult<Project>>;
    getAllProjects(): Project[];
    getProject(projectId: string): Project | null;
    getProjectByPath(projectPath: string): Project | null;
    addAgentToProject(projectId: string, agentId: string): boolean;
    removeAgentFromProject(projectId: string, agentId: string): boolean;
    stopProject(projectId: string): Promise<CommandResult>;
    removeProject(projectId: string): Promise<CommandResult>;
    private saveProject;
}
//# sourceMappingURL=ProjectManager.d.ts.map