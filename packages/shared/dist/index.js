"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_INFO = exports.VERSION = exports.getRelativeTime = exports.formatDate = exports.deepMerge = exports.retry = exports.delay = exports.createErrorResult = exports.createSuccessResult = exports.sanitizeBranchName = exports.generateAgentId = exports.generateId = exports.DEFAULT_CONFIG = exports.API_ENDPOINTS = exports.WS_EVENTS = exports.ERROR_CODES = exports.TASK_PRIORITY = exports.TASK_STATUS = exports.PROJECT_STATUS = exports.AGENT_STATUS = exports.PORT_RANGES = exports.DEFAULT_DATABASE_CONFIG = exports.runMigration = exports.createMigrator = exports.ConfigMigrator = exports.Logger = exports.JsonToSqliteMigration = exports.BaseMigration = exports.EventTypeSchema = exports.EntityIdSchema = exports.DATABASE_VERSION = exports.MIGRATIONS = exports.INDEXES = exports.TABLE_SCHEMAS = exports.isUnifiedEventData = exports.isUnifiedConfigData = exports.isUnifiedTaskData = exports.isUnifiedProjectData = exports.isUnifiedAgentData = exports.UnifiedDataValidator = exports.UnifiedEventDataSchema = exports.UnifiedConfigDataSchema = exports.UnifiedTaskDataSchema = exports.UnifiedProjectDataSchema = exports.UnifiedAgentDataSchema = exports.AUTO_CONFIG_PORT_RANGES = exports.ConfigLevel = exports.PROJECT_PATTERNS = exports.AutoConfigService = exports.autoConfig = void 0;
// Export all types
__exportStar(require("./types"), exports);
// Export error handling system
__exportStar(require("./errors"), exports);
// Export auto-configuration system
var autoconfig_1 = require("./autoconfig");
Object.defineProperty(exports, "autoConfig", { enumerable: true, get: function () { return autoconfig_1.autoConfig; } });
Object.defineProperty(exports, "AutoConfigService", { enumerable: true, get: function () { return autoconfig_1.AutoConfigService; } });
Object.defineProperty(exports, "PROJECT_PATTERNS", { enumerable: true, get: function () { return autoconfig_1.PROJECT_PATTERNS; } });
Object.defineProperty(exports, "ConfigLevel", { enumerable: true, get: function () { return autoconfig_1.ConfigLevel; } });
Object.defineProperty(exports, "AUTO_CONFIG_PORT_RANGES", { enumerable: true, get: function () { return autoconfig_1.PORT_RANGES; } });
// Export unified types with explicit naming to avoid conflicts
var unified_1 = require("./types/unified");
Object.defineProperty(exports, "UnifiedAgentDataSchema", { enumerable: true, get: function () { return unified_1.UnifiedAgentDataSchema; } });
Object.defineProperty(exports, "UnifiedProjectDataSchema", { enumerable: true, get: function () { return unified_1.UnifiedProjectDataSchema; } });
Object.defineProperty(exports, "UnifiedTaskDataSchema", { enumerable: true, get: function () { return unified_1.UnifiedTaskDataSchema; } });
Object.defineProperty(exports, "UnifiedConfigDataSchema", { enumerable: true, get: function () { return unified_1.UnifiedConfigDataSchema; } });
Object.defineProperty(exports, "UnifiedEventDataSchema", { enumerable: true, get: function () { return unified_1.UnifiedEventDataSchema; } });
Object.defineProperty(exports, "UnifiedDataValidator", { enumerable: true, get: function () { return unified_1.UnifiedDataValidator; } });
Object.defineProperty(exports, "isUnifiedAgentData", { enumerable: true, get: function () { return unified_1.isUnifiedAgentData; } });
Object.defineProperty(exports, "isUnifiedProjectData", { enumerable: true, get: function () { return unified_1.isUnifiedProjectData; } });
Object.defineProperty(exports, "isUnifiedTaskData", { enumerable: true, get: function () { return unified_1.isUnifiedTaskData; } });
Object.defineProperty(exports, "isUnifiedConfigData", { enumerable: true, get: function () { return unified_1.isUnifiedConfigData; } });
Object.defineProperty(exports, "isUnifiedEventData", { enumerable: true, get: function () { return unified_1.isUnifiedEventData; } });
Object.defineProperty(exports, "TABLE_SCHEMAS", { enumerable: true, get: function () { return unified_1.TABLE_SCHEMAS; } });
Object.defineProperty(exports, "INDEXES", { enumerable: true, get: function () { return unified_1.INDEXES; } });
Object.defineProperty(exports, "MIGRATIONS", { enumerable: true, get: function () { return unified_1.MIGRATIONS; } });
Object.defineProperty(exports, "DATABASE_VERSION", { enumerable: true, get: function () { return unified_1.DATABASE_VERSION; } });
Object.defineProperty(exports, "EntityIdSchema", { enumerable: true, get: function () { return unified_1.EntityIdSchema; } });
Object.defineProperty(exports, "EventTypeSchema", { enumerable: true, get: function () { return unified_1.EventTypeSchema; } });
// Export all utilities
__exportStar(require("./utils"), exports);
// Export database functionality
__exportStar(require("./database"), exports);
var BaseMigration_1 = require("./database/migrations/BaseMigration");
Object.defineProperty(exports, "BaseMigration", { enumerable: true, get: function () { return BaseMigration_1.BaseMigration; } });
var JsonToSqliteMigration_1 = require("./database/migrations/JsonToSqliteMigration");
Object.defineProperty(exports, "JsonToSqliteMigration", { enumerable: true, get: function () { return JsonToSqliteMigration_1.JsonToSqliteMigration; } });
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
// Export services
__exportStar(require("./services/DataSync"), exports);
__exportStar(require("./services/AtomicOperations"), exports);
// Export migration tools with explicit re-exports to avoid naming conflicts
var ConfigMigrator_1 = require("./migration/ConfigMigrator");
Object.defineProperty(exports, "ConfigMigrator", { enumerable: true, get: function () { return ConfigMigrator_1.ConfigMigrator; } });
Object.defineProperty(exports, "createMigrator", { enumerable: true, get: function () { return ConfigMigrator_1.createMigrator; } });
Object.defineProperty(exports, "runMigration", { enumerable: true, get: function () { return ConfigMigrator_1.runMigration; } });
// Export constants
var constants_1 = require("./constants");
Object.defineProperty(exports, "DEFAULT_DATABASE_CONFIG", { enumerable: true, get: function () { return constants_1.DEFAULT_DATABASE_CONFIG; } });
Object.defineProperty(exports, "PORT_RANGES", { enumerable: true, get: function () { return constants_1.PORT_RANGES; } });
Object.defineProperty(exports, "AGENT_STATUS", { enumerable: true, get: function () { return constants_1.AGENT_STATUS; } });
Object.defineProperty(exports, "PROJECT_STATUS", { enumerable: true, get: function () { return constants_1.PROJECT_STATUS; } });
Object.defineProperty(exports, "TASK_STATUS", { enumerable: true, get: function () { return constants_1.TASK_STATUS; } });
Object.defineProperty(exports, "TASK_PRIORITY", { enumerable: true, get: function () { return constants_1.TASK_PRIORITY; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return constants_1.ERROR_CODES; } });
Object.defineProperty(exports, "WS_EVENTS", { enumerable: true, get: function () { return constants_1.WS_EVENTS; } });
Object.defineProperty(exports, "API_ENDPOINTS", { enumerable: true, get: function () { return constants_1.API_ENDPOINTS; } });
// Export DEFAULT_CONFIG separately to handle the type properly
var constants_2 = require("./constants");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return constants_2.DEFAULT_CONFIG; } });
// Export core GUI-CLI integration functionality
__exportStar(require("./core"), exports);
// Export task integration system
__exportStar(require("./integrations"), exports);
// Re-export specific commonly used items for convenience
var utils_1 = require("./utils");
Object.defineProperty(exports, "generateId", { enumerable: true, get: function () { return utils_1.generateId; } });
Object.defineProperty(exports, "generateAgentId", { enumerable: true, get: function () { return utils_1.generateAgentId; } });
Object.defineProperty(exports, "sanitizeBranchName", { enumerable: true, get: function () { return utils_1.sanitizeBranchName; } });
Object.defineProperty(exports, "createSuccessResult", { enumerable: true, get: function () { return utils_1.createSuccessResult; } });
Object.defineProperty(exports, "createErrorResult", { enumerable: true, get: function () { return utils_1.createErrorResult; } });
Object.defineProperty(exports, "delay", { enumerable: true, get: function () { return utils_1.delay; } });
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return utils_1.retry; } });
Object.defineProperty(exports, "deepMerge", { enumerable: true, get: function () { return utils_1.deepMerge; } });
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return utils_1.formatDate; } });
Object.defineProperty(exports, "getRelativeTime", { enumerable: true, get: function () { return utils_1.getRelativeTime; } });
// Version information
exports.VERSION = '1.0.0';
// Package metadata
exports.PACKAGE_INFO = {
    name: '@magents/shared',
    version: exports.VERSION,
    description: 'Shared types, utilities, and constants for Magents',
};
//# sourceMappingURL=index.js.map