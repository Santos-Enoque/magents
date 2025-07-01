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

// POST /api/projects/:id/agents/:agentId - Add agent to project
router.post('/:id/agents/:agentId', async (req, res, next) => {
  try {
    const project = await projectController.addAgentToProject(req.params.id, req.params.agentId);
    
    const response: ApiResponse<Project> = {
      success: true,
      message: 'Agent added to project successfully',
      data: project
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id/agents/:agentId - Remove agent from project
router.delete('/:id/agents/:agentId', async (req, res, next) => {
  try {
    const project = await projectController.removeAgentFromProject(req.params.id, req.params.agentId);
    
    const response: ApiResponse<Project> = {
      success: true,
      message: 'Agent removed from project successfully',
      data: project
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/stats - Get project statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await projectController.getProjectStats(req.params.id);
    
    const response: ApiResponse = {
      success: true,
      data: stats
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/search/:query - Search projects
router.get('/search/:query', async (req, res, next) => {
  try {
    const projects = await projectController.searchProjects(req.params.query);
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/status/:status - Get projects by status
router.get('/status/:status', async (req, res, next) => {
  try {
    const status = req.params.status as 'ACTIVE' | 'INACTIVE';
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be ACTIVE or INACTIVE'
      });
    }
    
    const projects = await projectController.getProjectsByStatus(status);
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/settings - Get project settings
router.get('/:id/settings', async (req, res, next) => {
  try {
    const settings = await projectController.getProjectSettings(req.params.id);
    
    const response: ApiResponse<Record<string, any>> = {
      success: true,
      data: settings
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id/settings - Update project settings
router.put('/:id/settings', async (req, res, next) => {
  try {
    const settings = await projectController.updateProjectSettings(req.params.id, req.body);
    
    const response: ApiResponse<Record<string, any>> = {
      success: true,
      message: 'Project settings updated successfully',
      data: settings
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/settings/reset - Reset project settings to defaults
router.post('/:id/settings/reset', async (req, res, next) => {
  try {
    const settings = await projectController.resetProjectSettings(req.params.id);
    
    const response: ApiResponse<Record<string, any>> = {
      success: true,
      message: 'Project settings reset to defaults',
      data: settings
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/templates - List all project templates
router.get('/templates', async (req, res, next) => {
  try {
    const templates = await projectController.listProjectTemplates();
    
    const response: ApiResponse<string[]> = {
      success: true,
      data: templates
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/templates/:name - Get specific project template
router.get('/templates/:name', async (req, res, next) => {
  try {
    const template = await projectController.getProjectTemplate(req.params.name);
    
    const response: ApiResponse<any> = {
      success: true,
      data: template
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/templates/:name - Save project template
router.post('/templates/:name', async (req, res, next) => {
  try {
    await projectController.saveProjectTemplate(req.params.name, req.body);
    
    const response: ApiResponse = {
      success: true,
      message: 'Project template saved successfully'
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/from-template - Create project from template
router.post('/from-template', async (req, res, next) => {
  try {
    const { templateName, ...options } = req.body;
    
    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }
    
    const project = await projectController.createProjectFromTemplate(templateName, options);
    
    const response: ApiResponse<Project> = {
      success: true,
      message: 'Project created from template successfully',
      data: project
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

export { router as projectRoutes };