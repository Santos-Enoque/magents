"use strict";
/**
 * Task Integration Interface
 *
 * Defines a common interface for task management systems that can be plugged
 * into the Magents platform. This allows for multiple task backends like
 * Task Master, internal task management, Jira integration, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTaskOperationError = exports.TaskIntegrationNotAvailableError = exports.TaskNotFoundError = exports.TaskIntegrationError = void 0;
/**
 * Errors
 */
class TaskIntegrationError extends Error {
    constructor(message, code, integration) {
        super(message);
        this.code = code;
        this.integration = integration;
        this.name = 'TaskIntegrationError';
    }
}
exports.TaskIntegrationError = TaskIntegrationError;
class TaskNotFoundError extends TaskIntegrationError {
    constructor(taskId, integration) {
        super(`Task ${taskId} not found`, 'TASK_NOT_FOUND', integration);
        this.name = 'TaskNotFoundError';
    }
}
exports.TaskNotFoundError = TaskNotFoundError;
class TaskIntegrationNotAvailableError extends TaskIntegrationError {
    constructor(type) {
        super(`Task integration ${type} is not available`, 'INTEGRATION_NOT_AVAILABLE', type);
        this.name = 'TaskIntegrationNotAvailableError';
    }
}
exports.TaskIntegrationNotAvailableError = TaskIntegrationNotAvailableError;
class InvalidTaskOperationError extends TaskIntegrationError {
    constructor(operation, reason, integration) {
        super(`Invalid task operation ${operation}: ${reason}`, 'INVALID_OPERATION', integration);
        this.name = 'InvalidTaskOperationError';
    }
}
exports.InvalidTaskOperationError = InvalidTaskOperationError;
//# sourceMappingURL=TaskIntegration.js.map