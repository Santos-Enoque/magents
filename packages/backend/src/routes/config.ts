import { Router } from 'express';
import { ApiResponse, MagentsConfig } from '@magents/shared';
import { configController } from '../controllers/configController';

const router = Router();

// GET /api/config - Get current configuration
router.get('/', async (req, res, next) => {
  try {
    const config = await configController.getConfig();
    
    const response: ApiResponse<MagentsConfig> = {
      success: true,
      data: config
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/config - Update configuration
router.put('/', async (req, res, next) => {
  try {
    const updates: Partial<MagentsConfig> = req.body;
    const config = await configController.updateConfig(updates);
    
    const response: ApiResponse<MagentsConfig> = {
      success: true,
      message: 'Configuration updated successfully',
      data: config
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/config/reset - Reset configuration to defaults
router.post('/reset', async (req, res, next) => {
  try {
    const config = await configController.resetConfig();
    
    const response: ApiResponse<MagentsConfig> = {
      success: true,
      message: 'Configuration reset to defaults',
      data: config
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as configRoutes };