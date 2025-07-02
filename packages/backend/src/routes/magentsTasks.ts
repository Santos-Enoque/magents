import { Router } from 'express';
import { magentsTaskController } from '../controllers/magentsTaskController';

const router = Router();

// Quick start Task Master
router.post('/quick-start', (req, res) => magentsTaskController.quickStart(req, res));

// Auto-analyze project
router.post('/auto-analyze', (req, res) => magentsTaskController.autoAnalyze(req, res));

// Get simplified tasks
router.get('/tasks', (req, res) => magentsTaskController.getSimplifiedTasks(req, res));

// Get next task
router.get('/next-task', (req, res) => magentsTaskController.getNextTask(req, res));

// Create simple task
router.post('/tasks', (req, res) => magentsTaskController.createSimpleTask(req, res));

export default router;