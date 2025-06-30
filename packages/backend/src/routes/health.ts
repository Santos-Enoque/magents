import { Router } from 'express';
import { ApiResponse } from '@magents/shared';

const router = Router();

router.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Magents Backend API is healthy',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  res.json(response);
});

export { router as healthRoutes };