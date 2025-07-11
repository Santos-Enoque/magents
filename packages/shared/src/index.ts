// Export all types
export * from './types';

// Export error handling system
export * from './errors';

// Export auto-configuration system
export { 
  autoConfig, 
  AutoConfigService,
  PROJECT_PATTERNS,
  ProjectDetectionResult,
  MCPServerInfo,
  AutoConfigContext,
  EncryptedValue,
  ConfigLevel,
  PORT_RANGES as AUTO_CONFIG_PORT_RANGES
} from './autoconfig';

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

// Export database functionality
export * from './database';

// Export migration infrastructure with renamed exports to avoid conflicts
export {
  IMigration,
  MigrationConfig,
  MigrationError,
  BackupInfo,
  MigrationProgress,
  MigrationProgressCallback
} from './database/migrations';
export { MigrationResult as DatabaseMigrationResult } from './database/migrations';
export { BaseMigration } from './database/migrations/BaseMigration';
export { JsonToSqliteMigration } from './database/migrations/JsonToSqliteMigration';
export { Logger } from './utils/logger';

// Export services
export * from './services/DataSync';
export * from './services/AtomicOperations';

// Export migration tools with explicit re-exports to avoid naming conflicts
export {
  ConfigMigrator,
  LegacyAgentConfig,
  LegacyProjectConfig,
  LegacyTaskConfig,
  LegacyGlobalConfig,
  MigrationOptions,
  createMigrator,
  runMigration,
} from './migration/ConfigMigrator';

// Re-export MigrationResult with different name to avoid conflict
export { MigrationResult as ConfigMigrationResult } from './migration/ConfigMigrator';

// Export constants
export { 
  DEFAULT_DATABASE_CONFIG,
  PORT_RANGES, 
  AGENT_STATUS, 
  PROJECT_STATUS, 
  TASK_STATUS, 
  TASK_PRIORITY, 
  ERROR_CODES, 
  WS_EVENTS, 
  API_ENDPOINTS 
} from './constants';

// Export DEFAULT_CONFIG separately to handle the type properly
export { DEFAULT_CONFIG } from './constants';

// Export core GUI-CLI integration functionality
export * from './core';

// Export task integration system
export * from './integrations';

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


// Version information
export const VERSION = '1.0.0';

// Package metadata
export const PACKAGE_INFO = {
  name: '@magents/shared',
  version: VERSION,
  description: 'Shared types, utilities, and constants for Magents',
} as const;