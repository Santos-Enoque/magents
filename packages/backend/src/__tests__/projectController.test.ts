import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { projectController } from '../controllers/projectController';
import { ProjectManager } from '../services/ProjectManager';
import { CreateProjectOptions, Project, ProjectStatus } from '@magents/shared';

// Mock the ProjectManager
jest.mock('../services/ProjectManager');

const MockedProjectManager = ProjectManager as any;

describe('projectController', () => {
  let mockProjectManagerInstance: jest.Mocked<ProjectManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock instance
    mockProjectManagerInstance = {
      listProjects: jest.fn(),
      getProject: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      addAgentToProject: jest.fn(),
      removeAgentFromProject: jest.fn(),
      getProjectStats: jest.fn(),
      searchProjects: jest.fn(),
      getProjectsByStatus: jest.fn(),
      getProjectSettings: jest.fn(),
      updateProjectSettings: jest.fn(),
      resetProjectSettings: jest.fn(),
      createProjectFromTemplate: jest.fn(),
      getProjectTemplate: jest.fn(),
      saveProjectTemplate: jest.fn(),
      listProjectTemplates: jest.fn(),
    } as any;

    // Mock the getInstance method to return our mock instance
    MockedProjectManager.getInstance.mockReturnValue(mockProjectManagerInstance);
  });

  describe('listProjects', () => {
    it('should return list of projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE',
          createdAt: new Date()
        }
      ];

      mockProjectManagerInstance.listProjects.mockResolvedValue(mockProjects);

      const result = await projectController.listProjects();

      expect(result).toEqual(mockProjects);
      expect(mockProjectManagerInstance.listProjects).toHaveBeenCalledWith();
    });

    it('should handle errors from ProjectManager', async () => {
      const error = new Error('Database error');
      mockProjectManagerInstance.listProjects.mockRejectedValue(error);

      await expect(projectController.listProjects()).rejects.toThrow('Database error');
    });
  });

  describe('getProject', () => {
    it('should return specific project', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'Test Project',
        path: '/test',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date()
      };

      mockProjectManagerInstance.getProject.mockResolvedValue(mockProject);

      const result = await projectController.getProject('proj-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectManagerInstance.getProject).toHaveBeenCalledWith('proj-1');
    });

    it('should throw error for non-existent project', async () => {
      mockProjectManagerInstance.getProject.mockRejectedValue(
        new Error('Project with id non-existent not found')
      );

      await expect(projectController.getProject('non-existent')).rejects.toThrow(
        'Project with id non-existent not found'
      );
    });
  });

  describe('createProject', () => {
    it('should create new project with valid options', async () => {
      const options: CreateProjectOptions = {
        name: 'New Project',
        path: '/new/project'
      };

      const mockProject: Project = {
        id: 'proj-new',
        name: 'New Project',
        path: '/new/project',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date()
      };

      mockProjectManagerInstance.createProject.mockResolvedValue(mockProject);

      const result = await projectController.createProject(options);

      expect(result).toEqual(mockProject);
      expect(mockProjectManagerInstance.createProject).toHaveBeenCalledWith(options);
    });

    it('should handle validation errors', async () => {
      const options: CreateProjectOptions = {
        name: 'Duplicate Project'
      };

      mockProjectManagerInstance.createProject.mockRejectedValue(
        new Error('Project with name Duplicate Project already exists')
      );

      await expect(projectController.createProject(options)).rejects.toThrow(
        'Project with name Duplicate Project already exists'
      );
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const updates = {
        name: 'Updated Project',
        status: 'INACTIVE' as ProjectStatus
      };

      const mockUpdatedProject: Project = {
        id: 'proj-1',
        name: 'Updated Project',
        path: '/test',
        agents: [],
        status: 'INACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectManagerInstance.updateProject.mockResolvedValue(mockUpdatedProject);

      const result = await projectController.updateProject('proj-1', updates);

      expect(result).toEqual(mockUpdatedProject);
      expect(mockProjectManagerInstance.updateProject).toHaveBeenCalledWith('proj-1', updates);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      mockProjectManagerInstance.deleteProject.mockResolvedValue();

      await expect(projectController.deleteProject('proj-1')).resolves.not.toThrow();
      expect(mockProjectManagerInstance.deleteProject).toHaveBeenCalledWith('proj-1');
    });

    it('should handle deletion errors', async () => {
      mockProjectManagerInstance.deleteProject.mockRejectedValue(
        new Error('Project with id proj-1 not found')
      );

      await expect(projectController.deleteProject('proj-1')).rejects.toThrow(
        'Project with id proj-1 not found'
      );
    });
  });

  describe('agent management', () => {
    it('should add agent to project', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'Test Project',
        path: '/test',
        agents: ['agent-1'],
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectManagerInstance.addAgentToProject.mockResolvedValue(mockProject);

      const result = await projectController.addAgentToProject('proj-1', 'agent-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectManagerInstance.addAgentToProject).toHaveBeenCalledWith('proj-1', 'agent-1');
    });

    it('should remove agent from project', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'Test Project',
        path: '/test',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectManagerInstance.removeAgentFromProject.mockResolvedValue(mockProject);

      const result = await projectController.removeAgentFromProject('proj-1', 'agent-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectManagerInstance.removeAgentFromProject).toHaveBeenCalledWith('proj-1', 'agent-1');
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      const mockStats = {
        agentCount: 3,
        status: 'ACTIVE' as ProjectStatus,
        lastActivity: new Date(),
        uptime: '2d 3h'
      };

      mockProjectManagerInstance.getProjectStats.mockResolvedValue(mockStats);

      const result = await projectController.getProjectStats('proj-1');

      expect(result).toEqual(mockStats);
      expect(mockProjectManagerInstance.getProjectStats).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('searchProjects', () => {
    it('should return search results', async () => {
      const mockProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'React Project',
          path: '/react',
          agents: [],
          status: 'ACTIVE',
          createdAt: new Date()
        }
      ];

      mockProjectManagerInstance.searchProjects.mockResolvedValue(mockProjects);

      const result = await projectController.searchProjects('React');

      expect(result).toEqual(mockProjects);
      expect(mockProjectManagerInstance.searchProjects).toHaveBeenCalledWith('React');
    });
  });

  describe('getProjectsByStatus', () => {
    it('should return projects filtered by status', async () => {
      const mockProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'Active Project',
          path: '/active',
          agents: [],
          status: 'ACTIVE',
          createdAt: new Date()
        }
      ];

      mockProjectManagerInstance.getProjectsByStatus.mockResolvedValue(mockProjects);

      const result = await projectController.getProjectsByStatus('ACTIVE');

      expect(result).toEqual(mockProjects);
      expect(mockProjectManagerInstance.getProjectsByStatus).toHaveBeenCalledWith('ACTIVE');
    });
  });

  describe('project settings', () => {
    it('should get project settings', async () => {
      const mockSettings = {
        general: { maxAgents: 5 },
        development: { nodeVersion: 'lts' },
        version: '1.0'
      };

      mockProjectManagerInstance.getProjectSettings.mockResolvedValue(mockSettings);

      const result = await projectController.getProjectSettings('proj-1');

      expect(result).toEqual(mockSettings);
      expect(mockProjectManagerInstance.getProjectSettings).toHaveBeenCalledWith('proj-1');
    });

    it('should update project settings', async () => {
      const settings = {
        general: { maxAgents: 8 }
      };

      const mockUpdatedSettings = {
        general: { maxAgents: 8 },
        development: { nodeVersion: 'lts' },
        version: '1.0',
        updatedAt: new Date().toISOString()
      };

      mockProjectManagerInstance.updateProjectSettings.mockResolvedValue(mockUpdatedSettings);

      const result = await projectController.updateProjectSettings('proj-1', settings);

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockProjectManagerInstance.updateProjectSettings).toHaveBeenCalledWith('proj-1', settings);
    });

    it('should reset project settings', async () => {
      const mockDefaultSettings = {
        general: { maxAgents: 5 },
        development: { nodeVersion: 'lts' },
        version: '1.0'
      };

      mockProjectManagerInstance.resetProjectSettings.mockResolvedValue(mockDefaultSettings);

      const result = await projectController.resetProjectSettings('proj-1');

      expect(result).toEqual(mockDefaultSettings);
      expect(mockProjectManagerInstance.resetProjectSettings).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('project templates', () => {
    it('should list project templates', async () => {
      const mockTemplates = ['basic', 'node', 'react', 'python'];

      mockProjectManagerInstance.listProjectTemplates.mockResolvedValue(mockTemplates);

      const result = await projectController.listProjectTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockProjectManagerInstance.listProjectTemplates).toHaveBeenCalledWith();
    });

    it('should get specific template', async () => {
      const mockTemplate = {
        name: 'React Project',
        description: 'A React project template',
        projectDefaults: { tags: ['react'] },
        settings: { general: { maxAgents: 5 } }
      };

      mockProjectManagerInstance.getProjectTemplate.mockResolvedValue(mockTemplate);

      const result = await projectController.getProjectTemplate('react');

      expect(result).toEqual(mockTemplate);
      expect(mockProjectManagerInstance.getProjectTemplate).toHaveBeenCalledWith('react');
    });

    it('should save project template', async () => {
      const template = {
        name: 'Custom Template',
        description: 'A custom template',
        projectDefaults: { tags: ['custom'] },
        settings: { general: { maxAgents: 3 } }
      };

      mockProjectManagerInstance.saveProjectTemplate.mockResolvedValue();

      await expect(
        projectController.saveProjectTemplate('custom', template)
      ).resolves.not.toThrow();

      expect(mockProjectManagerInstance.saveProjectTemplate).toHaveBeenCalledWith('custom', template);
    });

    it('should create project from template', async () => {
      const options: CreateProjectOptions = {
        name: 'Template Project'
      };

      const mockProject: Project = {
        id: 'proj-template',
        name: 'Template Project',
        path: '/template',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date(),
        tags: ['react', 'frontend']
      };

      mockProjectManagerInstance.createProjectFromTemplate.mockResolvedValue(mockProject);

      const result = await projectController.createProjectFromTemplate('react', options);

      expect(result).toEqual(mockProject);
      expect(mockProjectManagerInstance.createProjectFromTemplate).toHaveBeenCalledWith('react', options);
    });
  });

  describe('error propagation', () => {
    it('should propagate ProjectManager errors correctly', async () => {
      const error = new Error('ProjectManager internal error');
      mockProjectManagerInstance.listProjects.mockRejectedValue(error);

      await expect(projectController.listProjects()).rejects.toThrow('ProjectManager internal error');
    });

    it('should handle async errors properly', async () => {
      mockProjectManagerInstance.createProject.mockImplementation(async () => {
        throw new Error('Async operation failed');
      });

      const options: CreateProjectOptions = { name: 'Test' };

      await expect(projectController.createProject(options)).rejects.toThrow('Async operation failed');
    });
  });
});