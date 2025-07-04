"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskIntegrationManager = exports.TaskIntegrationManager = exports.BaseTaskIntegrationFactory = exports.DefaultTaskIntegrationRegistry = void 0;
const TaskIntegration_1 = require("./TaskIntegration");
/**
 * Default Task Integration Registry Implementation
 */
class DefaultTaskIntegrationRegistry {
    constructor() {
        this.factories = new Map();
    }
    register(type, factory) {
        this.factories.set(type, factory);
    }
    unregister(type) {
        this.factories.delete(type);
    }
    getFactory(type) {
        return this.factories.get(type) || null;
    }
    getRegisteredTypes() {
        return Array.from(this.factories.keys());
    }
    async createIntegration(config) {
        const factory = this.getFactory(config.type);
        if (!factory) {
            throw new TaskIntegration_1.TaskIntegrationError(`No factory registered for integration type: ${config.type}`, 'FACTORY_NOT_FOUND');
        }
        return await factory.create(config);
    }
}
exports.DefaultTaskIntegrationRegistry = DefaultTaskIntegrationRegistry;
/**
 * Abstract base class for Task Integration Factories
 */
class BaseTaskIntegrationFactory {
    async validateConfig(type, config) {
        const errors = [];
        // Basic validation - subclasses can override for more specific validation
        if (!config) {
            errors.push('Configuration is required');
        }
        if (!this.getSupportedTypes().includes(type)) {
            errors.push(`Unsupported integration type: ${type}`);
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
exports.BaseTaskIntegrationFactory = BaseTaskIntegrationFactory;
/**
 * Task Integration Manager
 *
 * Manages multiple task integrations and provides a unified interface
 */
class TaskIntegrationManager {
    constructor(registry) {
        this.activeIntegrations = new Map();
        this.registry = registry || new DefaultTaskIntegrationRegistry();
    }
    /**
     * Get the registry instance
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Add an integration
     */
    async addIntegration(config) {
        // Validate the configuration
        const factory = this.registry.getFactory(config.type);
        if (!factory) {
            throw new TaskIntegration_1.TaskIntegrationError(`No factory registered for integration type: ${config.type}`, 'FACTORY_NOT_FOUND');
        }
        const validation = await factory.validateConfig(config.type, config.configuration);
        if (!validation.valid) {
            throw new TaskIntegration_1.TaskIntegrationError(`Invalid configuration: ${validation.errors.join(', ')}`, 'INVALID_CONFIG');
        }
        // Create and initialize the integration
        const integration = await this.registry.createIntegration(config);
        await integration.initialize(config.configuration);
        // Check if it's available
        const isAvailable = await integration.isAvailable();
        if (!isAvailable) {
            throw new TaskIntegration_1.TaskIntegrationError(`Integration ${config.name} is not available`, 'INTEGRATION_NOT_AVAILABLE');
        }
        // Store the integration
        const key = `${config.type}:${config.name}`;
        this.activeIntegrations.set(key, integration);
        // Set as default if it's the first one or explicitly marked as default
        if (!this.defaultIntegration || config.configuration.isDefault) {
            this.defaultIntegration = integration;
        }
        return integration;
    }
    /**
     * Remove an integration
     */
    async removeIntegration(type, name) {
        const key = `${type}:${name}`;
        const integration = this.activeIntegrations.get(key);
        if (integration) {
            await integration.dispose();
            this.activeIntegrations.delete(key);
            // Clear default if this was the default integration
            if (this.defaultIntegration === integration) {
                this.defaultIntegration = undefined;
                // Set a new default if there are other integrations
                const remaining = Array.from(this.activeIntegrations.values());
                if (remaining.length > 0) {
                    this.defaultIntegration = remaining[0];
                }
            }
        }
    }
    /**
     * Get an integration by type and name
     */
    getIntegration(type, name) {
        const key = `${type}:${name}`;
        return this.activeIntegrations.get(key) || null;
    }
    /**
     * Get all active integrations
     */
    getActiveIntegrations() {
        return Array.from(this.activeIntegrations.values());
    }
    /**
     * Get the default integration
     */
    getDefaultIntegration() {
        return this.defaultIntegration || null;
    }
    /**
     * Set the default integration
     */
    setDefaultIntegration(type, name) {
        const integration = this.getIntegration(type, name);
        if (integration) {
            this.defaultIntegration = integration;
            return true;
        }
        return false;
    }
    /**
     * Get integration for a specific project path
     *
     * This method can be overridden to implement project-specific integration selection
     */
    getIntegrationForProject(projectPath) {
        // For now, just return the default integration
        // In the future, this could be enhanced to:
        // - Check project-specific configuration
        // - Auto-detect available integrations in the project
        // - Use project metadata to determine the best integration
        return this.getDefaultIntegration();
    }
    /**
     * Initialize the manager with a list of integration configurations
     */
    async initialize(configs) {
        const enabledConfigs = configs.filter(config => config.enabled);
        for (const config of enabledConfigs) {
            try {
                await this.addIntegration(config);
            }
            catch (error) {
                console.warn(`Failed to initialize integration ${config.name}:`, error);
            }
        }
    }
    /**
     * Dispose all integrations
     */
    async dispose() {
        const integrations = Array.from(this.activeIntegrations.values());
        await Promise.all(integrations.map(integration => integration.dispose()));
        this.activeIntegrations.clear();
        this.defaultIntegration = undefined;
    }
}
exports.TaskIntegrationManager = TaskIntegrationManager;
// Export a singleton instance
exports.taskIntegrationManager = new TaskIntegrationManager();
//# sourceMappingURL=TaskIntegrationFactory.js.map