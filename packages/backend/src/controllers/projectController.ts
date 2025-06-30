import { Project, CreateProjectOptions, ProjectStatus, generateId } from '@magents/shared';

// In-memory storage for scaffolding
let projects: Project[] = [];

export const projectController = {
  async listProjects(): Promise<Project[]> {
    return projects;
  },

  async getProject(id: string): Promise<Project> {
    const project = projects.find(p => p.id === id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    return project;
  },

  async createProject(options: CreateProjectOptions): Promise<Project> {
    const projectId = generateId('proj');
    
    // Check if project with same name exists
    const existingProject = projects.find(p => p.name === options.name);
    if (existingProject) {
      throw new Error(`Project with name ${options.name} already exists`);
    }
    
    const project: Project = {
      id: projectId,
      name: options.name || `project-${projectId}`,
      path: process.cwd(), // This would be properly computed
      agents: [],
      status: 'ACTIVE' as ProjectStatus,
      createdAt: new Date()
    };
    
    if (options.ports) {
      const [start, end] = options.ports.split('-').map(Number);
      project.portRange = [start, end];
    }
    
    if (options.docker) {
      project.dockerNetwork = `magents-${projectId}`;
    }
    
    projects.push(project);
    return project;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = await this.getProject(id);
    
    // Update allowed fields
    if (updates.name) project.name = updates.name;
    if (updates.status) project.status = updates.status;
    if (updates.portRange) project.portRange = updates.portRange;
    if (updates.dockerNetwork) project.dockerNetwork = updates.dockerNetwork;
    
    return project;
  },

  async deleteProject(id: string): Promise<void> {
    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    // In a real implementation, this would:
    // 1. Stop all agents in the project
    // 2. Clean up docker networks
    // 3. Remove worktrees
    
    projects.splice(projectIndex, 1);
  }
};