import { Router } from 'express';
import { ApiResponse, TaskMasterTask } from '@magents/shared';
import { taskMasterController } from '../controllers/taskMasterController';
import { TaskMasterDetection } from '../services/taskMasterIntegration';

const router = Router();

// GET /api/taskmaster/detect - Check if TaskMaster is configured
router.get('/detect', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const detection = await taskMasterController.detectTaskMaster(path);
    
    const response: ApiResponse<TaskMasterDetection> = {
      success: true,
      data: detection
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/taskmaster/tasks - List available tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const tasks = await taskMasterController.getTasks(path);
    
    const response: ApiResponse<TaskMasterTask[]> = {
      success: true,
      data: tasks
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/taskmaster/tasks/:taskId - Get task details
router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const { path } = req.query;
    const { taskId } = req.params;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const task = await taskMasterController.getTaskDetails(path, taskId);
    
    const response: ApiResponse<TaskMasterTask> = {
      success: true,
      data: task
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/taskmaster/tasks - Create a new task
router.post('/tasks', async (req, res, next) => {
  try {
    const { path, title, description, priority } = req.body;
    
    if (!path || !title) {
      return res.status(400).json({
        success: false,
        error: 'Path and title are required'
      });
    }

    const task = await taskMasterController.createTask(
      path,
      title,
      description || '',
      priority
    );
    
    const response: ApiResponse<TaskMasterTask> = {
      success: true,
      message: 'Task created successfully',
      data: task
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/taskmaster/tasks/:taskId/status - Update task status
router.put('/tasks/:taskId/status', async (req, res, next) => {
  try {
    const { path } = req.query;
    const { taskId } = req.params;
    const { status } = req.body;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    await taskMasterController.updateTaskStatus(path, taskId, status);
    
    const response: ApiResponse = {
      success: true,
      message: 'Task status updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/taskmaster/statistics - Get task statistics
router.get('/statistics', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const stats = await taskMasterController.getTaskStatistics(path);
    
    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as taskMasterRoutes };