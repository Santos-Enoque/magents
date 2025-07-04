"use strict";
/**
 * Task Integration System
 *
 * Provides a pluggable architecture for task management systems
 */
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
exports.taskIntegrationManager = void 0;
// Core interfaces and types
__exportStar(require("./TaskIntegration"), exports);
// Factory and registry implementations
__exportStar(require("./TaskIntegrationFactory"), exports);
// Built-in implementations
__exportStar(require("./MockTaskIntegration"), exports);
__exportStar(require("./taskmaster"), exports);
__exportStar(require("./internal"), exports);
// Re-export the singleton manager for convenience
var TaskIntegrationFactory_1 = require("./TaskIntegrationFactory");
Object.defineProperty(exports, "taskIntegrationManager", { enumerable: true, get: function () { return TaskIntegrationFactory_1.taskIntegrationManager; } });
//# sourceMappingURL=index.js.map