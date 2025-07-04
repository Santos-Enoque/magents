export * from './types';
export * from './errors';
export { autoConfig, AutoConfigService, PROJECT_PATTERNS, ProjectDetectionResult, MCPServerInfo, AutoConfigContext, EncryptedValue, ConfigLevel, PORT_RANGES as AUTO_CONFIG_PORT_RANGES } from './autoconfig';
export { UnifiedAgentData, UnifiedAgentDataSchema, UnifiedProjectData, UnifiedProjectDataSchema, UnifiedTaskData, UnifiedTaskDataSchema, UnifiedConfigData, UnifiedConfigDataSchema, UnifiedEventData, UnifiedEventDataSchema, UnifiedDataValidator, isUnifiedAgentData, isUnifiedProjectData, isUnifiedTaskData, isUnifiedConfigData, isUnifiedEventData, TABLE_SCHEMAS, INDEXES, MIGRATIONS, DATABASE_VERSION, MigrationDefinition, EntityId, EntityIdSchema, EventType, EventTypeSchema, } from './types/unified';
export { AgentStatus as UnifiedAgentStatus, AgentMode, ProjectStatus as UnifiedProjectStatus, TaskStatus as UnifiedTaskStatus, TaskPriority as UnifiedTaskPriority, } from './types/unified';
export * from './utils';
export * from './database';
export { IMigration, MigrationConfig, MigrationError, BackupInfo, MigrationProgress, MigrationProgressCallback } from './database/migrations';
export { MigrationResult as DatabaseMigrationResult } from './database/migrations';
export { BaseMigration } from './database/migrations/BaseMigration';
export { JsonToSqliteMigration } from './database/migrations/JsonToSqliteMigration';
export { Logger } from './utils/logger';
export * from './services/DataSync';
export * from './services/AtomicOperations';
export { ConfigMigrator, LegacyAgentConfig, LegacyProjectConfig, LegacyTaskConfig, LegacyGlobalConfig, MigrationOptions, createMigrator, runMigration, } from './migration/ConfigMigrator';
export { MigrationResult as ConfigMigrationResult } from './migration/ConfigMigrator';
export { DEFAULT_DATABASE_CONFIG, PORT_RANGES, AGENT_STATUS, PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY, ERROR_CODES, WS_EVENTS, API_ENDPOINTS } from './constants';
export { DEFAULT_CONFIG } from './constants';
export * from './core';
export * from './integrations';
export { generateId, generateAgentId, sanitizeBranchName, createSuccessResult, createErrorResult, delay, retry, deepMerge, formatDate, getRelativeTime, } from './utils';
export declare const VERSION = "1.0.0";
export declare const PACKAGE_INFO: {
    readonly name: "@magents/shared";
    readonly version: "1.0.0";
    readonly description: "Shared types, utilities, and constants for Magents";
};
//# sourceMappingURL=index.d.ts.map