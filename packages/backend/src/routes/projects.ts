import { Router } from 'express';
import { ApiResponse, Project, CreateProjectOptions } from '@magents/shared';
import { projectController } from '../controllers/projectController';

const router = Router();

// GET /api/projects - List all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await projectController.listProjects();
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:id', async (req, res, next) => {
  try {
    const project = await projectController.getProject(req.params.id);
    
    const response: ApiResponse<Project> = {
      success: true,
      data: project
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res, next) => {
  try {
    const options: CreateProjectOptions = req.body;
    const project = await projectController.createProject(options);
    
    const response: ApiResponse<Project> = {
      success: true,
      message: 'Project created successfully',
      data: project
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    const project = await projectController.updateProject(req.params.id, updates);
    
    const response: ApiResponse<Project> = {
      success: true,
      message: 'Project updated successfully',
      data: project
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    await projectController.deleteProject(req.params.id);
    
    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as projectRoutes };