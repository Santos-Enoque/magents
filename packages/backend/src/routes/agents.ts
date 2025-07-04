import { Router } from 'express';
import { ApiResponse, Agent, CreateAgentOptions, PaginatedResponse } from '@magents/shared';
import { agentController } from '../controllers/agentController';

const router = Router();

// GET /api/agents - List all agents
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const result = await agentController.listAgents({ page, limit, status });
    
    const response: PaginatedResponse<Agent> = {
      success: true,
      data: result.agents,
      pagination: result.pagination
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/agents/:id - Get specific agent
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await agentController.getAgent(req.params.id);
    
    const response: ApiResponse<Agent> = {
      success: true,
      data: agent
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res, next) => {
  try {
    const options: CreateAgentOptions = req.body;
    const agent = await agentController.createAgent(options);
    
    const response: ApiResponse<Agent> = {
      success: true,
      message: 'Agent created successfully',
      data: agent
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/agents/:id/status - Update agent status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const agent = await agentController.updateAgentStatus(req.params.id, status);
    
    const response: ApiResponse<Agent> = {
      success: true,
      message: 'Agent status updated successfully',
      data: agent
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/agents/:id - Stop and remove agent
router.delete('/:id', async (req, res, next) => {
  try {
    const removeWorktree = req.query.removeWorktree === 'true';
    await agentController.deleteAgent(req.params.id, removeWorktree);
    
    const response: ApiResponse = {
      success: true,
      message: 'Agent deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/agents/:id/assign-task - Assign a task to an agent
router.post('/:id/assign-task', async (req, res, next) => {
  try {
    const { id: agentId } = req.params;
    const { taskId, projectPath } = req.body;
    
    if (!taskId || !projectPath) {
      return res.status(400).json({
        success: false,
        error: 'Task ID and project path are required'
      });
    }

    // Import taskMasterController here to avoid circular dependencies
    const { taskMasterController } = await import('../controllers/taskMasterController');
    
    const assignment = await taskMasterController.assignTaskToAgent(
      agentId,
      taskId,
      projectPath
    );
    
    const response: ApiResponse<unknown> = {
      success: true,
      message: 'Task assigned successfully',
      data: assignment
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/agents/:id/project - Assign agent to project
router.put('/:id/project', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }
    
    const agent = await agentController.assignAgentToProject(req.params.id, projectId);
    
    const response: ApiResponse<Agent> = {
      success: true,
      message: 'Agent assigned to project successfully',
      data: agent
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/agents/:id/project - Remove agent from project
router.delete('/:id/project', async (req, res, next) => {
  try {
    const agent = await agentController.unassignAgentFromProject(req.params.id);
    
    const response: ApiResponse<Agent> = {
      success: true,
      message: 'Agent removed from project successfully',
      data: agent
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/agents/project/:projectId - Get agents by project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const agents = await agentController.getAgentsByProject(req.params.projectId);
    
    const response: ApiResponse<Agent[]> = {
      success: true,
      data: agents
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as agentRoutes };