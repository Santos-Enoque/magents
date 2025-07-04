"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskMasterIntegration = registerTaskMasterIntegration;
const TaskIntegrationFactory_1 = require("../TaskIntegrationFactory");
const index_1 = require("./index");
const config_1 = require("./config");
const features_1 = require("../../config/features");
/**
 * Register TaskMaster integration if enabled
 */
function registerTaskMasterIntegration() {
    // Check if TaskMaster integration is enabled via feature flags
    if (!features_1.featureFlags.isEnabled('taskMasterIntegration')) {
        console.log('TaskMaster integration is disabled by feature flag');
        return;
    }
    const config = (0, config_1.getTaskMasterConfigFromEnv)();
    if (config.enabled) {
        // Register the factory
        const factory = new index_1.TaskMasterIntegrationFactory();
        TaskIntegrationFactory_1.taskIntegrationManager.getRegistry().register('taskmaster', factory);
        // Initialize the integration
        TaskIntegrationFactory_1.taskIntegrationManager.addIntegration({
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
//# sourceMappingURL=registry.js.map