import { Project, CreateProjectOptions } from '@magents/shared';
import { ProjectManager } from '../services/ProjectManager';

const projectManager = ProjectManager.getInstance();

export const projectController = {
  async listProjects(): Promise<Project[]> {
    return await projectManager.listProjects();
  },

  async getProject(id: string): Promise<Project> {
    return await projectManager.getProject(id);
  },

  async createProject(options: CreateProjectOptions): Promise<Project> {
    return await projectManager.createProject(options);
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return await projectManager.updateProject(id, updates);
  },

  async deleteProject(id: string): Promise<void> {
    return await projectManager.deleteProject(id);
  },

  async addAgentToProject(projectId: string, agentId: string): Promise<Project> {
    return await projectManager.addAgentToProject(projectId, agentId);
  },

  async removeAgentFromProject(projectId: string, agentId: string): Promise<Project> {
    return await projectManager.removeAgentFromProject(projectId, agentId);
  },

  async getProjectStats(id: string): Promise<{
    agentCount: number;
    status: string;
    lastActivity: Date | null;
    uptime: string;
  }> {
    return await projectManager.getProjectStats(id);
  },

  async searchProjects(query: string): Promise<Project[]> {
    return await projectManager.searchProjects(query);
  },

  async getProjectsByStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<Project[]> {
    return await projectManager.getProjectsByStatus(status);
  },

  async getProjectSettings(id: string): Promise<Record<string, any>> {
    return await projectManager.getProjectSettings(id);
  },

  async updateProjectSettings(id: string, settings: Record<string, any>): Promise<Record<string, any>> {
    return await projectManager.updateProjectSettings(id, settings);
  },

  async resetProjectSettings(id: string): Promise<Record<string, any>> {
    return await projectManager.resetProjectSettings(id);
  },

  async createProjectFromTemplate(templateName: string, options: CreateProjectOptions): Promise<Project> {
    return await projectManager.createProjectFromTemplate(templateName, options);
  },

  async getProjectTemplate(templateName: string): Promise<{
    name: string;
    description: string;
    projectDefaults: Partial<CreateProjectOptions>;
    settings: Record<string, any>;
  }> {
    return await projectManager.getProjectTemplate(templateName);
  },

  async saveProjectTemplate(templateName: string, template: {
    name: string;
    description: string;
    projectDefaults: Partial<CreateProjectOptions>;
    settings: Record<string, any>;
  }): Promise<void> {
    return await projectManager.saveProjectTemplate(templateName, template);
  },

  async listProjectTemplates(): Promise<string[]> {
    return await projectManager.listProjectTemplates();
  }
};