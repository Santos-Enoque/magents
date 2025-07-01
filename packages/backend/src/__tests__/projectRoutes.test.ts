import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
// @ts-ignore
import request from 'supertest';
import express from 'express';
import { projectRoutes } from '../routes/projects';
import { projectController } from '../controllers/projectController';
import { CreateProjectOptions, Project } from '@magents/shared';

// Mock the project controller
jest.mock('../controllers/projectController');

const mockedProjectController = projectController as jest.Mocked<typeof projectController>;

describe('Project Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectRoutes);
    
    // Add error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({
        success: false,
        error: err.message
      });
    });
  });

  describe('GET /api/projects', () => {
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

      mockedProjectController.listProjects.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'proj-1',
            name: 'Test Project'
          })
        ])
      });
    });

    it('should handle controller errors', async () => {
      mockedProjectController.listProjects.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return specific project', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'Test Project',
        path: '/test',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date()
      };

      mockedProjectController.getProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .get('/api/projects/proj-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'proj-1',
          name: 'Test Project'
        })
      });
    });

    it('should return 500 for non-existent project', async () => {
      mockedProjectController.getProject.mockRejectedValue(
        new Error('Project with id non-existent not found')
      );

      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project', async () => {
      const projectData: CreateProjectOptions = {
        name: 'New Project',
        path: '/new'
      };

      const mockProject: Project = {
        id: 'proj-new',
        name: 'New Project',
        path: '/new',
        agents: [],
        status: 'ACTIVE',
        createdAt: new Date()
      };

      mockedProjectController.createProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Project created successfully',
        data: expect.objectContaining({
          id: 'proj-new',
          name: 'New Project'
        })
      });
    });

    it('should handle validation errors', async () => {
      mockedProjectController.createProject.mockRejectedValue(
        new Error('Project with name Duplicate already exists')
      );

      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Duplicate' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const updates = {
        name: 'Updated Project',
        status: 'INACTIVE'
      };

      const mockProject: Project = {
        id: 'proj-1',
        name: 'Updated Project',
        path: '/test',
        agents: [],
        status: 'INACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedProjectController.updateProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .put('/api/projects/proj-1')
        .send(updates)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Project updated successfully',
        data: expect.objectContaining({
          name: 'Updated Project',
          status: 'INACTIVE'
        })
      });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      mockedProjectController.deleteProject.mockResolvedValue();

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Project deleted successfully'
      });
    });
  });

  describe('Project-Agent Association Routes', () => {
    describe('POST /api/projects/:id/agents/:agentId', () => {
      it('should add agent to project', async () => {
        const mockProject: Project = {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: ['agent-1'],
          status: 'ACTIVE',
          createdAt: new Date()
        };

        mockedProjectController.addAgentToProject.mockResolvedValue(mockProject);

        const response = await request(app)
          .post('/api/projects/proj-1/agents/agent-1')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Agent added to project successfully',
          data: expect.objectContaining({
            agents: ['agent-1']
          })
        });
      });
    });

    describe('DELETE /api/projects/:id/agents/:agentId', () => {
      it('should remove agent from project', async () => {
        const mockProject: Project = {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test',
          agents: [],
          status: 'ACTIVE',
          createdAt: new Date()
        };

        mockedProjectController.removeAgentFromProject.mockResolvedValue(mockProject);

        const response = await request(app)
          .delete('/api/projects/proj-1/agents/agent-1')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Agent removed from project successfully',
          data: expect.objectContaining({
            agents: []
          })
        });
      });
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    it('should return project statistics', async () => {
      const mockStats = {
        agentCount: 2,
        status: 'ACTIVE',
        lastActivity: new Date(),
        uptime: '1d 5h'
      };

      mockedProjectController.getProjectStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/projects/proj-1/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });
  });

  describe('GET /api/projects/search/:query', () => {
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

      mockedProjectController.searchProjects.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects/search/React')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockProjects
      });

      expect(mockedProjectController.searchProjects).toHaveBeenCalledWith('React');
    });

    it('should handle URL encoding in search query', async () => {
      mockedProjectController.searchProjects.mockResolvedValue([]);

      await request(app)
        .get('/api/projects/search/React%20App')
        .expect(200);

      expect(mockedProjectController.searchProjects).toHaveBeenCalledWith('React App');
    });
  });

  describe('GET /api/projects/status/:status', () => {
    it('should return projects by status', async () => {
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

      mockedProjectController.getProjectsByStatus.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects/status/ACTIVE')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockProjects
      });
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/api/projects/status/INVALID')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid status. Must be ACTIVE or INACTIVE'
      });
    });
  });

  describe('Project Settings Routes', () => {
    describe('GET /api/projects/:id/settings', () => {
      it('should return project settings', async () => {
        const mockSettings = {
          general: { maxAgents: 5 },
          development: { nodeVersion: 'lts' },
          version: '1.0'
        };

        mockedProjectController.getProjectSettings.mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/projects/proj-1/settings')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockSettings
        });
      });
    });

    describe('PUT /api/projects/:id/settings', () => {
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

        mockedProjectController.updateProjectSettings.mockResolvedValue(mockUpdatedSettings);

        const response = await request(app)
          .put('/api/projects/proj-1/settings')
          .send(settings)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Project settings updated successfully',
          data: mockUpdatedSettings
        });
      });
    });

    describe('POST /api/projects/:id/settings/reset', () => {
      it('should reset project settings', async () => {
        const mockDefaultSettings = {
          general: { maxAgents: 5 },
          development: { nodeVersion: 'lts' },
          version: '1.0'
        };

        mockedProjectController.resetProjectSettings.mockResolvedValue(mockDefaultSettings);

        const response = await request(app)
          .post('/api/projects/proj-1/settings/reset')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Project settings reset to defaults',
          data: mockDefaultSettings
        });
      });
    });
  });

  describe('Project Template Routes', () => {
    describe('GET /api/projects/templates', () => {
      it('should return list of templates', async () => {
        const mockTemplates = ['basic', 'node', 'react', 'python'];

        mockedProjectController.listProjectTemplates.mockResolvedValue(mockTemplates);

        const response = await request(app)
          .get('/api/projects/templates')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTemplates
        });
      });
    });

    describe('GET /api/projects/templates/:name', () => {
      it('should return specific template', async () => {
        const mockTemplate = {
          name: 'React Project',
          description: 'A React project template',
          projectDefaults: { tags: ['react'] },
          settings: { general: { maxAgents: 5 } }
        };

        mockedProjectController.getProjectTemplate.mockResolvedValue(mockTemplate);

        const response = await request(app)
          .get('/api/projects/templates/react')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTemplate
        });
      });
    });

    describe('POST /api/projects/templates/:name', () => {
      it('should save project template', async () => {
        const template = {
          name: 'Custom Template',
          description: 'A custom template',
          projectDefaults: { tags: ['custom'] },
          settings: { general: { maxAgents: 3 } }
        };

        mockedProjectController.saveProjectTemplate.mockResolvedValue();

        const response = await request(app)
          .post('/api/projects/templates/custom')
          .send(template)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Project template saved successfully'
        });
      });
    });

    describe('POST /api/projects/from-template', () => {
      it('should create project from template', async () => {
        const requestData = {
          templateName: 'react',
          name: 'My React Project',
          path: '/my/react/project'
        };

        const mockProject: Project = {
          id: 'proj-template',
          name: 'My React Project',
          path: '/my/react/project',
          agents: [],
          status: 'ACTIVE',
          createdAt: new Date(),
          tags: ['react', 'frontend']
        };

        mockedProjectController.createProjectFromTemplate.mockResolvedValue(mockProject);

        const response = await request(app)
          .post('/api/projects/from-template')
          .send(requestData)
          .expect(201);

        expect(response.body).toEqual({
          success: true,
          message: 'Project created from template successfully',
          data: expect.objectContaining({
            name: 'My React Project',
            tags: ['react', 'frontend']
          })
        });

        expect(mockedProjectController.createProjectFromTemplate).toHaveBeenCalledWith(
          'react',
          { name: 'My React Project', path: '/my/react/project' }
        );
      });

      it('should return 400 when templateName is missing', async () => {
        const response = await request(app)
          .post('/api/projects/from-template')
          .send({ name: 'Project without template' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Template name is required'
        });
      });
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing request body', async () => {
      mockedProjectController.createProject.mockRejectedValue(
        new Error('Invalid request data')
      );

      const response = await request(app)
        .post('/api/projects')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle controller exceptions', async () => {
      mockedProjectController.listProjects.mockRejectedValue(
        new Error('Internal server error')
      );

      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });
  });
});