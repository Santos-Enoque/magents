import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectManager } from '../services/ProjectManager';
import { CreateProjectOptions, Project, ProjectStatus } from '@magents/shared';

// Mock fs and os modules
jest.mock('fs');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('ProjectManager', () => {
  let projectManager: ProjectManager;
  let tempDir: string;
  let projectsDir: string;
  let projectsFile: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock paths
    tempDir = '/tmp/.magents';
    projectsDir = path.join(tempDir, 'projects');
    projectsFile = path.join(projectsDir, 'projects.json');
    
    // Mock os.homedir to return our temp dir
    mockOs.homedir.mockReturnValue('/tmp');
    
    // Mock fs.existsSync to return false initially (no existing files)
    mockFs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    mockFs.mkdirSync.mockImplementation(() => undefined);
    
    // Mock fs.writeFileSync
    mockFs.writeFileSync.mockImplementation(() => undefined);
    
    // Mock fs.readFileSync to return empty array initially
    mockFs.readFileSync.mockReturnValue('[]');
    
    // Get new instance for each test
    projectManager = ProjectManager.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ProjectManager.getInstance();
      const instance2 = ProjectManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createProject', () => {
    it('should create a new project with basic options', async () => {
      const options: CreateProjectOptions = {
        name: 'Test Project',
        path: '/test/path'
      };

      const project = await projectManager.createProject(options);

      expect(project).toMatchObject({
        name: 'Test Project',
        path: '/test/path',
        agents: [],
        status: 'ACTIVE'
      });
      expect(project.id).toMatch(/^proj/);
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it('should create project with port range', async () => {
      const options: CreateProjectOptions = {
        name: 'Port Project',
        ports: '3000-3010'
      };

      const project = await projectManager.createProject(options);

      expect(project.portRange).toEqual([3000, 3010]);
    });

    it('should create project with docker configuration', async () => {
      const options: CreateProjectOptions = {
        name: 'Docker Project',
        docker: true
      };

      const project = await projectManager.createProject(options);

      expect(project.dockerNetwork).toMatch(/^magents-proj/);
    });

    it('should create project with description and tags', async () => {
      const options: CreateProjectOptions = {
        name: 'Tagged Project',
        description: 'A test project with tags',
        tags: ['test', 'demo']
      };

      const project = await projectManager.createProject(options);

      expect(project.description).toBe('A test project with tags');
      expect(project.tags).toEqual(['test', 'demo']);
    });

    it('should throw error for duplicate project name', async () => {
      // Mock existing project
      const existingProjects = [
        {
          id: 'proj-1',
          name: 'Existing Project',
          path: '/existing',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingProjects));

      const options: CreateProjectOptions = {
        name: 'Existing Project'
      };

      await expect(projectManager.createProject(options)).rejects.toThrow(
        'Project with name Existing Project already exists'
      );
    });

    it('should throw error for invalid port range', async () => {
      const options: CreateProjectOptions = {
        name: 'Invalid Port Project',
        ports: '3010-3000' // End before start
      };

      await expect(projectManager.createProject(options)).rejects.toThrow(
        'Invalid port range format'
      );
    });

    it('should throw error for non-existent path', async () => {
      // Make fs.existsSync return false for the specific path
      mockFs.existsSync.mockImplementation((filePath: any) => {
        return filePath !== '/non/existent/path';
      });

      const options: CreateProjectOptions = {
        name: 'Invalid Path Project',
        path: '/non/existent/path'
      };

      await expect(projectManager.createProject(options)).rejects.toThrow(
        'Project path /non/existent/path does not exist'
      );
    });
  });

  describe('listProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await projectManager.listProjects();
      expect(projects).toEqual([]);
    });

    it('should return projects sorted by creation date', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Old Project',
          path: '/old',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date('2023-01-01')
        },
        {
          id: 'proj-2',
          name: 'New Project',
          path: '/new',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date('2023-02-01')
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));

      const projects = await projectManager.listProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('New Project'); // Newer first
      expect(projects[1].name).toBe('Old Project');
    });
  });

  describe('getProject', () => {
    it('should return project by id', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));

      const project = await projectManager.getProject('proj-1');
      expect(project.name).toBe('Test Project');
    });

    it('should throw error for non-existent project', async () => {
      await expect(projectManager.getProject('non-existent')).rejects.toThrow(
        'Project with id non-existent not found'
      );
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date('2023-01-01')
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));

      const updates = {
        name: 'Updated Project',
        status: 'INACTIVE' as ProjectStatus
      };

      const updatedProject = await projectManager.updateProject('proj-1', updates);

      expect(updatedProject.name).toBe('Updated Project');
      expect(updatedProject.status).toBe('INACTIVE');
      expect(updatedProject.updatedAt).toBeInstanceOf(Date);
      expect(updatedProject.createdAt).toEqual(new Date('2023-01-01')); // Should preserve original
    });

    it('should throw error when updating to duplicate name', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Project 1',
          path: '/test1',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          path: '/test2',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));

      await expect(
        projectManager.updateProject('proj-1', { name: 'Project 2' })
      ).rejects.toThrow('Project with name Project 2 already exists');
    });
  });

  describe('deleteProject', () => {
    it('should delete project by id', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));

      await expect(projectManager.deleteProject('proj-1')).resolves.not.toThrow();
    });

    it('should throw error for non-existent project', async () => {
      await expect(projectManager.deleteProject('non-existent')).rejects.toThrow(
        'Project with id non-existent not found'
      );
    });
  });

  describe('agent management', () => {
    beforeEach(() => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));
    });

    it('should add agent to project', async () => {
      const updatedProject = await projectManager.addAgentToProject('proj-1', 'agent-1');
      
      expect(updatedProject.agents).toContain('agent-1');
      expect(updatedProject.updatedAt).toBeInstanceOf(Date);
    });

    it('should not add duplicate agent', async () => {
      // Add agent first time
      await projectManager.addAgentToProject('proj-1', 'agent-1');
      
      // Try to add same agent again
      const project = await projectManager.addAgentToProject('proj-1', 'agent-1');
      
      // Should only appear once
      const agentCount = project.agents.filter(id => id === 'agent-1').length;
      expect(agentCount).toBe(1);
    });

    it('should remove agent from project', async () => {
      // First add an agent
      await projectManager.addAgentToProject('proj-1', 'agent-1');
      
      // Then remove it
      const updatedProject = await projectManager.removeAgentFromProject('proj-1', 'agent-1');
      
      expect(updatedProject.agents).not.toContain('agent-1');
    });

    it('should handle removing non-existent agent gracefully', async () => {
      const project = await projectManager.removeAgentFromProject('proj-1', 'non-existent-agent');
      
      expect(project.agents).toEqual([]);
    });
  });

  describe('searchProjects', () => {
    beforeEach(() => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'React Frontend',
          path: '/frontend',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date(),
          description: 'A React application',
          tags: ['react', 'frontend']
        },
        {
          id: 'proj-2',
          name: 'Node Backend',
          path: '/backend',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date(),
          description: 'A Node.js API',
          tags: ['node', 'backend']
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));
    });

    it('should search by name', async () => {
      const results = await projectManager.searchProjects('React');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Frontend');
    });

    it('should search by description', async () => {
      const results = await projectManager.searchProjects('API');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Node Backend');
    });

    it('should search by tags', async () => {
      const results = await projectManager.searchProjects('frontend');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Frontend');
    });

    it('should search by path', async () => {
      const results = await projectManager.searchProjects('backend');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Node Backend');
    });

    it('should return empty array for no matches', async () => {
      const results = await projectManager.searchProjects('python');
      expect(results).toHaveLength(0);
    });
  });

  describe('getProjectsByStatus', () => {
    beforeEach(() => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Active Project',
          path: '/active',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        },
        {
          id: 'proj-2',
          name: 'Inactive Project',
          path: '/inactive',
          agents: [],
          status: 'INACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));
    });

    it('should return active projects', async () => {
      const activeProjects = await projectManager.getProjectsByStatus('ACTIVE');
      expect(activeProjects).toHaveLength(1);
      expect(activeProjects[0].name).toBe('Active Project');
    });

    it('should return inactive projects', async () => {
      const inactiveProjects = await projectManager.getProjectsByStatus('INACTIVE');
      expect(inactiveProjects).toHaveLength(1);
      expect(inactiveProjects[0].name).toBe('Inactive Project');
    });
  });

  describe('project settings', () => {
    beforeEach(() => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE' as ProjectStatus,
          createdAt: new Date()
        }
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProjects));
    });

    it('should return default settings when no settings file exists', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const settings = await projectManager.getProjectSettings('proj-1');
      
      expect(settings).toHaveProperty('general');
      expect(settings).toHaveProperty('development');
      expect(settings).toHaveProperty('docker');
      expect(settings.version).toBe('1.0');
    });

    it('should return saved settings when file exists', async () => {
      const savedSettings = {
        general: { maxAgents: 10 },
        development: { nodeVersion: '18' },
        version: '1.0'
      };

      mockFs.existsSync.mockImplementation((path: any) => {
        return path.includes('_settings.json');
      });
      
      mockFs.readFileSync.mockImplementation((path: any) => {
        if (path.includes('_settings.json')) {
          return JSON.stringify(savedSettings);
        }
        return '[]';
      });

      const settings = await projectManager.getProjectSettings('proj-1');
      
      expect(settings.general.maxAgents).toBe(10);
      expect(settings.development.nodeVersion).toBe('18');
    });

    it('should update project settings', async () => {
      const updates = {
        general: { maxAgents: 8 },
        development: { nodeVersion: '16' }
      };

      const updatedSettings = await projectManager.updateProjectSettings('proj-1', updates);
      
      expect(updatedSettings.general.maxAgents).toBe(8);
      expect(updatedSettings.development.nodeVersion).toBe('16');
      expect(updatedSettings.updatedAt).toBeDefined();
    });

    it('should reset settings to defaults', async () => {
      const resetSettings = await projectManager.resetProjectSettings('proj-1');
      
      expect(resetSettings.general.maxAgents).toBe(5); // Default value
      expect(resetSettings.development.nodeVersion).toBe('lts'); // Default value
    });
  });

  describe('project templates', () => {
    it('should list default templates when no custom templates exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const templates = await projectManager.listProjectTemplates();
      
      expect(templates).toContain('basic');
      expect(templates).toContain('node');
      expect(templates).toContain('react');
      expect(templates).toContain('python');
    });

    it('should return default template configuration', async () => {
      const template = await projectManager.getProjectTemplate('react');
      
      expect(template.name).toBe('React Project');
      expect(template.description).toContain('React');
      expect(template.projectDefaults.tags).toContain('react');
      expect(template.settings.development.packageManager).toBe('npm');
    });

    it('should save custom template', async () => {
      const customTemplate = {
        name: 'Custom Template',
        description: 'A custom project template',
        projectDefaults: { tags: ['custom'] },
        settings: { general: { maxAgents: 3 } }
      };

      await expect(
        projectManager.saveProjectTemplate('custom', customTemplate)
      ).resolves.not.toThrow();
    });

    it('should create project from template', async () => {
      const options: CreateProjectOptions = {
        name: 'Template Project'
      };

      const project = await projectManager.createProjectFromTemplate('react', options);
      
      expect(project.name).toBe('Template Project');
      expect(project.tags).toContain('react');
      expect(project.tags).toContain('frontend');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const projects = await projectManager.listProjects();
      expect(projects).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFs.readFileSync.mockReturnValue('invalid json');

      const projects = await projectManager.listProjects();
      expect(projects).toEqual([]);
    });

    it('should throw error when saving fails', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const options: CreateProjectOptions = {
        name: 'Test Project'
      };

      await expect(projectManager.createProject(options)).rejects.toThrow(
        'Failed to save projects'
      );
    });
  });
});