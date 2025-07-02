// Export all types
export * from './types';

// Export unified types with explicit naming to avoid conflicts
export {
  UnifiedAgentData,
  UnifiedAgentDataSchema,
  UnifiedProjectData,
  UnifiedProjectDataSchema,
  UnifiedTaskData,
  UnifiedTaskDataSchema,
  UnifiedConfigData,
  UnifiedConfigDataSchema,
  UnifiedEventData,
  UnifiedEventDataSchema,
  UnifiedDataValidator,
  isUnifiedAgentData,
  isUnifiedProjectData,
  isUnifiedTaskData,
  isUnifiedConfigData,
  isUnifiedEventData,
  TABLE_SCHEMAS,
  INDEXES,
  MIGRATIONS,
  DATABASE_VERSION,
  MigrationDefinition,
  EntityId,
  EntityIdSchema,
  EventType,
  EventTypeSchema,
} from './types/unified';

// Re-export unified status types with different names
export {
  AgentStatus as UnifiedAgentStatus,
  AgentMode,
  ProjectStatus as UnifiedProjectStatus,
  TaskStatus as UnifiedTaskStatus,
  TaskPriority as UnifiedTaskPriority,
} from './types/unified';

// Export all utilities
export * from './utils';

// Export constants
export * from './constants';

// Re-export specific commonly used items for convenience
export {
  generateId,
  generateAgentId,
  sanitizeBranchName,
  createSuccessResult,
  createErrorResult,
  delay,
  retry,
  deepMerge,
  formatDate,
  getRelativeTime,
} from './utils';

export {
  DEFAULT_CONFIG,
  AGENT_STATUS,
  PROJECT_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  ERROR_CODES,
  WS_EVENTS,
  API_ENDPOINTS,
} from './constants';

// Version information
export const VERSION = '1.0.0';

// Package metadata
export const PACKAGE_INFO = {
  name: '@magents/shared',
  version: VERSION,
  description: 'Shared types, utilities, and constants for Magents',
} as const;