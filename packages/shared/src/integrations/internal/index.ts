import { TaskIntegrationFactory } from '../TaskIntegrationFactory';
import { InternalTaskIntegration } from './InternalTaskIntegration';

export class InternalTaskIntegrationFactory implements TaskIntegrationFactory {
  type = 'internal';
  
  async create(configuration?: any): Promise<InternalTaskIntegration> {
    const integration = new InternalTaskIntegration();
    await integration.initialize(configuration);
    return integration;
  }
}

export { InternalTaskIntegration };

/**
 * Register the internal task integration
 */
export function registerInternalTaskIntegration(): void {
  // This will be called from the backend server initialization
  // when the internal task system feature is enabled
  
  // Dynamic import to avoid circular dependencies
  import('../TaskIntegrationFactory').then(({ taskIntegrationManager }) => {
    import('../../config/features').then(({ featureFlags }) => {
      if (featureFlags.isEnabled('internalTaskSystem')) {
        const factory = new InternalTaskIntegrationFactory();
        taskIntegrationManager.getRegistry().register('internal', factory);
        
        // Initialize the integration
        taskIntegrationManager.addIntegration({
          type: 'internal',
          name: 'Internal Task System',
          enabled: true,
          configuration: {},
          capabilities: {
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canAssign: true,
            supportsSubtasks: true,
            supportsDependencies: true,
            supportsSearch: true,
            supportsPagination: true,
            supportsRealTimeUpdates: false
          }
        }).then(() => {
          console.log('Internal task integration registered successfully');
        }).catch(error => {
          console.warn('Failed to register internal task integration:', error);
        });
      }
    });
  });
}