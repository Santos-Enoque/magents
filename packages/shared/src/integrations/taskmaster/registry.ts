import { taskIntegrationManager } from '../TaskIntegrationFactory';
import { TaskMasterIntegrationFactory } from './index';
import { getTaskMasterConfigFromEnv } from './config';
import { featureFlags } from '../../config/features';

/**
 * Register TaskMaster integration if enabled
 */
export function registerTaskMasterIntegration(): void {
  // Check if TaskMaster integration is enabled via feature flags
  if (!featureFlags.isEnabled('taskMasterIntegration')) {
    console.log('TaskMaster integration is disabled by feature flag');
    return;
  }

  const config = getTaskMasterConfigFromEnv();
  
  if (config.enabled) {
    // Register the factory
    const factory = new TaskMasterIntegrationFactory();
    taskIntegrationManager.getRegistry().register('taskmaster', factory);
    
    // Initialize the integration
    taskIntegrationManager.addIntegration({
      type: 'taskmaster',
      name: 'TaskMaster CLI',
      enabled: true,
      configuration: config,
      capabilities: {
        canCreate: true,
        canUpdate: true,
        canDelete: false,
        canAssign: false,
        supportsSubtasks: true,
        supportsDependencies: true,
        supportsSearch: true,
        supportsPagination: false,
        supportsRealTimeUpdates: false
      }
    }).then(() => {
      console.log('TaskMaster integration registered successfully');
    }).catch(error => {
      console.warn('Failed to register TaskMaster integration:', error);
    });
  }
}