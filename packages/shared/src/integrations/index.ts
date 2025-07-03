/**
 * Task Integration System
 * 
 * Provides a pluggable architecture for task management systems
 */

// Core interfaces and types
export * from './TaskIntegration';

// Factory and registry implementations
export * from './TaskIntegrationFactory';

// Built-in implementations
export * from './MockTaskIntegration';
export * from './taskmaster';
export * from './internal';

// Re-export the singleton manager for convenience
export { taskIntegrationManager } from './TaskIntegrationFactory';