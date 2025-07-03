import { Project, CreateProjectOptions } from '@magents/shared';
import { ProjectService } from '../services/ProjectService';

// Use the ProjectService factory to get the appropriate implementation
const getProjectManager = () => ProjectService.getInstance();

export const projectController = {
  async listProjects(): Promise<Project[]> {
    return await getProjectManager().listProjects();
  },

  async getProject(id: string): Promise<Project> {
    return await getProjectManager().getProject(id);
  },

  async createProject(options: CreateProjectOptions): Promise<Project> {
    return await getProjectManager().createProject(options);
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return await getProjectManager().updateProject(id, updates);
  },

  async deleteProject(id: string): Promise<void> {
    return await getProjectManager().deleteProject(id);
  },

  async addAgentToProject(projectId: string, agentId: string): Promise<Project> {
    return await getProjectManager().addAgentToProject(projectId, agentId);
  },

  async removeAgentFromProject(projectId: string, agentId: string): Promise<Project> {
    return await getProjectManager().removeAgentFromProject(projectId, agentId);
  },

  async getProjectStats(id: string): Promise<{
    agentCount: number;
    status: string;
    lastActivity: Date | null;
    uptime: string;
  }> {
    return await getProjectManager().getProjectStats(id);
  },

  async searchProjects(query: string): Promise<Project[]> {
    return await getProjectManager().searchProjects(query);
  },

  async getProjectsByStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<Project[]> {
    return await getProjectManager().getProjectsByStatus(status);
  },

  async getProjectSettings(id: string): Promise<Record<string, any>> {
    return await getProjectManager().getProjectSettings(id);
  },

  async updateProjectSettings(id: string, settings: Record<string, any>): Promise<Record<string, any>> {
    return await getProjectManager().updateProjectSettings(id, settings);
  },

  async resetProjectSettings(id: string): Promise<Record<string, any>> {
    return await getProjectManager().resetProjectSettings(id);
  },

  async createProjectFromTemplate(templateName: string, options: CreateProjectOptions): Promise<Project> {
    return await getProjectManager().createProjectFromTemplate(templateName, options);
  },

  async getProjectTemplate(templateName: string): Promise<{
    name: string;
    description: string;
    projectDefaults: Partial<CreateProjectOptions>;
    settings: Record<string, any>;
  }> {
    return await getProjectManager().getProjectTemplate(templateName);
  },

  async saveProjectTemplate(templateName: string, template: {
    name: string;
    description: string;
    projectDefaults: Partial<CreateProjectOptions>;
    settings: Record<string, any>;
  }): Promise<void> {
    return await getProjectManager().saveProjectTemplate(templateName, template);
  },

  async listProjectTemplates(): Promise<string[]> {
    return await getProjectManager().listProjectTemplates();
  }
};