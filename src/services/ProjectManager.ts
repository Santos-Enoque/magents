import * as fs from 'fs';
import * as path from 'path';
import { Project, CreateProjectOptions, ProjectStatus, CommandResult } from '../types';
import { ConfigManager } from '../config/ConfigManager';

export class ProjectManager {
  private configManager: ConfigManager;
  private projectsDir: string;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.projectsDir = path.join(this.configManager.getAgentsDir(), 'projects');
    
    // Ensure projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  public async createProject(options: CreateProjectOptions): Promise<CommandResult<Project>> {
    try {
      const projectId = `project-${Date.now()}`;
      const projectName = options.name || path.basename(options.path);
      const portRange = options.portRange || [3000, 3010];

      // Validate path exists
      if (!fs.existsSync(options.path)) {
        return {
          success: false,
          message: `Project path does not exist: ${options.path}`
        };
      }

      // Check if project already exists for this path
      const existingProject = this.getProjectByPath(options.path);
      if (existingProject) {
        return {
          success: false,
          message: `Project already exists for path: ${options.path}`
        };
      }

      const project: Project = {
        id: projectId,
        path: path.resolve(options.path),
        name: projectName,
        agents: [],
        portRange,
        status: 'ACTIVE' as ProjectStatus,
        createdAt: new Date()
      };

      // Save project
      this.saveProject(project);

      return {
        success: true,
        message: `Project '${projectName}' created successfully!`,
        data: project
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public getAllProjects(): Project[] {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }

    const projects: Project[] = [];
    const files = fs.readdirSync(this.projectsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const projectPath = path.join(this.projectsDir, file);
          const data = fs.readFileSync(projectPath, 'utf8');
          const project = JSON.parse(data) as Project;
          projects.push(project);
        } catch (error) {
          console.warn(`Error loading project ${file}:`, error);
        }
      }
    }

    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProject(projectId: string): Project | null {
    const projectPath = path.join(this.projectsDir, `${projectId}.json`);
    
    if (!fs.existsSync(projectPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(projectPath, 'utf8');
      return JSON.parse(data) as Project;
    } catch (error) {
      console.error(`Error loading project ${projectId}:`, error);
      return null;
    }
  }

  public getProjectByPath(projectPath: string): Project | null {
    const resolvedPath = path.resolve(projectPath);
    const projects = this.getAllProjects();
    
    return projects.find(p => p.path === resolvedPath) || null;
  }

  public addAgentToProject(projectId: string, agentId: string): boolean {
    const project = this.getProject(projectId);
    
    if (!project) {
      return false;
    }

    if (!project.agents.includes(agentId)) {
      project.agents.push(agentId);
      this.saveProject(project);
    }

    return true;
  }

  public removeAgentFromProject(projectId: string, agentId: string): boolean {
    const project = this.getProject(projectId);
    
    if (!project) {
      return false;
    }

    const index = project.agents.indexOf(agentId);
    if (index > -1) {
      project.agents.splice(index, 1);
      this.saveProject(project);
    }

    return true;
  }

  public async stopProject(projectId: string): Promise<CommandResult> {
    try {
      const project = this.getProject(projectId);
      
      if (!project) {
        return {
          success: false,
          message: `Project '${projectId}' not found`
        };
      }

      // Update project status
      project.status = 'STOPPED';
      this.saveProject(project);

      return {
        success: true,
        message: `Project '${project.name}' stopped successfully`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to stop project: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async removeProject(projectId: string): Promise<CommandResult> {
    try {
      const project = this.getProject(projectId);
      
      if (!project) {
        return {
          success: false,
          message: `Project '${projectId}' not found`
        };
      }

      if (project.agents.length > 0) {
        return {
          success: false,
          message: `Cannot remove project with active agents. Stop all agents first.`
        };
      }

      // Remove project file
      const projectPath = path.join(this.projectsDir, `${projectId}.json`);
      fs.unlinkSync(projectPath);

      return {
        success: true,
        message: `Project '${project.name}' removed successfully`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to remove project: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private saveProject(project: Project): void {
    const projectPath = path.join(this.projectsDir, `${project.id}.json`);
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
  }
}