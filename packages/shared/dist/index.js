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
exports.PACKAGE_INFO = exports.VERSION = exports.API_ENDPOINTS = exports.WS_EVENTS = exports.ERROR_CODES = exports.TASK_PRIORITY = exports.TASK_STATUS = exports.PROJECT_STATUS = exports.AGENT_STATUS = exports.DEFAULT_CONFIG = exports.getRelativeTime = exports.formatDate = exports.deepMerge = exports.retry = exports.delay = exports.createErrorResult = exports.createSuccessResult = exports.sanitizeBranchName = exports.generateAgentId = exports.generateId = void 0;
// Export all types
__exportStar(require("./types"), exports);
// Export all utilities
__exportStar(require("./utils"), exports);
// Export constants
__exportStar(require("./constants"), exports);
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
var constants_1 = require("./constants");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return constants_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "AGENT_STATUS", { enumerable: true, get: function () { return constants_1.AGENT_STATUS; } });
Object.defineProperty(exports, "PROJECT_STATUS", { enumerable: true, get: function () { return constants_1.PROJECT_STATUS; } });
Object.defineProperty(exports, "TASK_STATUS", { enumerable: true, get: function () { return constants_1.TASK_STATUS; } });
Object.defineProperty(exports, "TASK_PRIORITY", { enumerable: true, get: function () { return constants_1.TASK_PRIORITY; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return constants_1.ERROR_CODES; } });
Object.defineProperty(exports, "WS_EVENTS", { enumerable: true, get: function () { return constants_1.WS_EVENTS; } });
Object.defineProperty(exports, "API_ENDPOINTS", { enumerable: true, get: function () { return constants_1.API_ENDPOINTS; } });
// Version information
exports.VERSION = '1.0.0';
// Package metadata
exports.PACKAGE_INFO = {
    name: '@magents/shared',
    version: exports.VERSION,
    description: 'Shared types, utilities, and constants for Magents',
};
//# sourceMappingURL=index.js.map