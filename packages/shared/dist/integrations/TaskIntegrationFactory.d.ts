import { TaskIntegration, TaskIntegrationFactory, TaskIntegrationRegistry, TaskIntegrationConfig } from './TaskIntegration';
/**
 * Default Task Integration Registry Implementation
 */
export declare class DefaultTaskIntegrationRegistry implements TaskIntegrationRegistry {
    private factories;
    register(type: string, factory: TaskIntegrationFactory): void;
    unregister(type: string): void;
    getFactory(type: string): TaskIntegrationFactory | null;
    getRegisteredTypes(): string[];
    createIntegration(config: TaskIntegrationConfig): Promise<TaskIntegration>;
}
/**
 * Abstract base class for Task Integration Factories
 */
export declare abstract class BaseTaskIntegrationFactory implements TaskIntegrationFactory {
    abstract create(config: TaskIntegrationConfig): Promise<TaskIntegration>;
    abstract getSupportedTypes(): string[];
    validateConfig(type: string, config: Record<string, unknown>): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
/**
 * Task Integration Manager
 *
 * Manages multiple task integrations and provides a unified interface
 */
export declare class TaskIntegrationManager {
    private registry;
    private activeIntegrations;
    private defaultIntegration?;
    constructor(registry?: TaskIntegrationRegistry);
    /**
     * Get the registry instance
     */
    getRegistry(): TaskIntegrationRegistry;
    /**
     * Add an integration
     */
    addIntegration(config: TaskIntegrationConfig): Promise<TaskIntegration>;
    /**
     * Remove an integration
     */
    removeIntegration(type: string, name: string): Promise<void>;
    /**
     * Get an integration by type and name
     */
    getIntegration(type: string, name: string): TaskIntegration | null;
    /**
     * Get all active integrations
     */
    getActiveIntegrations(): TaskIntegration[];
    /**
     * Get the default integration
     */
    getDefaultIntegration(): TaskIntegration | null;
    /**
     * Set the default integration
     */
    setDefaultIntegration(type: string, name: string): boolean;
    /**
     * Get integration for a specific project path
     *
     * This method can be overridden to implement project-specific integration selection
     */
    getIntegrationForProject(projectPath: string): TaskIntegration | null;
    /**
     * Initialize the manager with a list of integration configurations
     */
    initialize(configs: TaskIntegrationConfig[]): Promise<void>;
    /**
     * Dispose all integrations
     */
    dispose(): Promise<void>;
}
export declare const taskIntegrationManager: TaskIntegrationManager;
//# sourceMappingURL=TaskIntegrationFactory.d.ts.map