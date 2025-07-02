export * from './types';
export { UnifiedAgentData, UnifiedAgentDataSchema, UnifiedProjectData, UnifiedProjectDataSchema, UnifiedTaskData, UnifiedTaskDataSchema, UnifiedConfigData, UnifiedConfigDataSchema, UnifiedEventData, UnifiedEventDataSchema, UnifiedDataValidator, isUnifiedAgentData, isUnifiedProjectData, isUnifiedTaskData, isUnifiedConfigData, isUnifiedEventData, TABLE_SCHEMAS, INDEXES, MIGRATIONS, DATABASE_VERSION, MigrationDefinition, EntityId, EntityIdSchema, EventType, EventTypeSchema, } from './types/unified';
export { AgentStatus as UnifiedAgentStatus, AgentMode, ProjectStatus as UnifiedProjectStatus, TaskStatus as UnifiedTaskStatus, TaskPriority as UnifiedTaskPriority, } from './types/unified';
export * from './utils';
export * from './database';
export * from './services/DataSync';
export { ConfigMigrator, LegacyAgentConfig, LegacyProjectConfig, LegacyTaskConfig, LegacyGlobalConfig, MigrationOptions, createMigrator, runMigration, } from './migration/ConfigMigrator';
export { MigrationResult as ConfigMigrationResult } from './migration/ConfigMigrator';
export * from './constants';
export { generateId, generateAgentId, sanitizeBranchName, createSuccessResult, createErrorResult, delay, retry, deepMerge, formatDate, getRelativeTime, } from './utils';
export { DEFAULT_CONFIG, AGENT_STATUS, PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY, ERROR_CODES, WS_EVENTS, API_ENDPOINTS, } from './constants';
export declare const VERSION = "1.0.0";
export declare const PACKAGE_INFO: {
    readonly name: "@magents/shared";
    readonly version: "1.0.0";
    readonly description: "Shared types, utilities, and constants for Magents";
};
//# sourceMappingURL=index.d.ts.map