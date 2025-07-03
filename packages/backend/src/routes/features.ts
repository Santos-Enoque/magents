import { Router, Request, Response } from 'express';
import { featureFlags, FeatureFlags } from '@magents/shared/src/config/features';

const router = Router();

/**
 * Get current feature flags
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const flags = featureFlags.getFlags();
    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    console.error('Error getting feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags'
    });
  }
});

/**
 * Update feature flags (runtime overrides)
 */
router.put('/', (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<FeatureFlags>;
    
    // Validate the updates
    const validKeys = [
      'taskMasterIntegration',
      'internalTaskSystem',
      'multipleTaskIntegrations',
      'taskAnalytics',
      'aiTaskSuggestions',
      'realtimeTaskCollaboration'
    ];
    
    const invalidKeys = Object.keys(updates).filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature flags: ${invalidKeys.join(', ')}`
      });
    }
    
    // Apply the overrides
    featureFlags.setOverrides(updates);
    
    // Return updated flags
    const flags = featureFlags.getFlags();
    res.json({
      success: true,
      data: flags,
      message: 'Feature flags updated (runtime overrides applied)'
    });
  } catch (error) {
    console.error('Error updating feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flags'
    });
  }
});

/**
 * Reset feature flags to defaults
 */
router.post('/reset', (_req: Request, res: Response) => {
  try {
    featureFlags.reset();
    const flags = featureFlags.getFlags();
    res.json({
      success: true,
      data: flags,
      message: 'Feature flags reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset feature flags'
    });
  }
});

/**
 * Clear runtime overrides
 */
router.post('/clear-overrides', (_req: Request, res: Response) => {
  try {
    featureFlags.clearOverrides();
    const flags = featureFlags.getFlags();
    res.json({
      success: true,
      data: flags,
      message: 'Runtime overrides cleared'
    });
  } catch (error) {
    console.error('Error clearing overrides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear overrides'
    });
  }
});

export { router as featureRoutes };