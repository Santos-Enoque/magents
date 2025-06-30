import { Router } from 'express';
import { ApiResponse, Project, CreateProjectOptions, DirectoryItem, ProjectValidationResult, GitRepositoryInfo, ProjectDiscoveryOptions } from '@magents/shared';
import { projectController } from '../controllers/projectController';
import { projectDiscoveryService } from '../services/projectDiscovery';

const router = Router();

// GET /api/projects/discover - Browse directories for project discovery
router.get('/discover', async (req, res, next) => {
  try {
    const { path, maxDepth, includeHidden } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const options: ProjectDiscoveryOptions = {
      path,
      maxDepth: maxDepth ? parseInt(maxDepth as string) : undefined,
      includeHidden: includeHidden === 'true'
    };

    const directories = await projectDiscoveryService.browseDirectory(options);
    
    const response: ApiResponse<DirectoryItem[]> = {
      success: true,
      data: directories
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/validate - Validate git repository
router.get('/validate', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const validationResult = await projectDiscoveryService.validateGitRepository(path);
    
    const response: ApiResponse<ProjectValidationResult> = {
      success: true,
      data: validationResult
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/metadata - Extract project metadata
router.get('/metadata', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const metadata = await projectDiscoveryService.getRepositoryMetadata(path);
    
    const response: ApiResponse<GitRepositoryInfo> = {
      success: true,
      data: metadata
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

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