import { Router } from 'express';
import { ApiResponse } from '@magents/shared';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const dbHealth = await dbService.getHealthStatus();
    const dbStats = dbService.isAvailable() ? await dbService.getStatistics() : null;

    const response: ApiResponse = {
      success: true,
      message: 'Magents Backend API is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbHealth.status,
          message: dbHealth.message,
          available: dbService.isAvailable(),
          statistics: dbStats
        }
      }
    };
    
    // Set status code based on database health
    const statusCode = dbHealth.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: 'Health check failed',
      data: {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    res.status(500).json(response);
  }
});

// Database-specific health check endpoint
router.get('/database', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const health = await dbService.getHealthStatus();
    const stats = dbService.isAvailable() ? await dbService.getStatistics() : null;

    const response: ApiResponse = {
      success: health.status !== 'unhealthy',
      message: health.message,
      data: {
        status: health.status,
        available: dbService.isAvailable(),
        statistics: stats,
        details: health.details
      }
    };

    const statusCode = health.status === 'unhealthy' ? 503 : 
                      health.status === 'unavailable' ? 404 : 200;
    
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: 'Database health check failed',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    res.status(500).json(response);
  }
});

export { router as healthRoutes };