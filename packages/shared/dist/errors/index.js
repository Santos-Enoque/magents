"use strict";
/**
 * Enhanced Error Handling System for Magents
 * Provides structured error classes, user-friendly messages, and recovery suggestions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.MagentsError = exports.ErrorCategory = exports.ErrorSeverity = void 0;
exports.createMagentsError = createMagentsError;
exports.createMagentsErrorFromGeneric = createMagentsErrorFromGeneric;
exports.attemptAutoFix = attemptAutoFix;
const constants_1 = require("../constants");
// Error severity levels
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
// Error categories for better organization
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AGENT"] = "agent";
    ErrorCategory["PROJECT"] = "project";
    ErrorCategory["DOCKER"] = "docker";
    ErrorCategory["SYSTEM"] = "system";
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["CONFIGURATION"] = "configuration";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
// Enhanced error class
class MagentsError extends Error {
    constructor(errorContext) {
        super(errorContext.technicalMessage);
        this.name = 'MagentsError';
        this.timestamp = errorContext.timestamp;
        this.severity = errorContext.severity;
        this.category = errorContext.category;
        this.code = errorContext.code;
        this.userMessage = errorContext.userMessage;
        this.technicalMessage = errorContext.technicalMessage;
        this.suggestions = errorContext.suggestions;
        this.learnMoreUrl = errorContext.learnMoreUrl;
        this.context = errorContext.context;
        this.recoverable = errorContext.recoverable;
        this.autoFixAvailable = errorContext.autoFixAvailable;
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MagentsError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            userMessage: this.userMessage,
            technicalMessage: this.technicalMessage,
            severity: this.severity,
            category: this.category,
            suggestions: this.suggestions,
            learnMoreUrl: this.learnMoreUrl,
            context: this.context,
            recoverable: this.recoverable,
            autoFixAvailable: this.autoFixAvailable,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack
        };
    }
}
exports.MagentsError = MagentsError;
/**
 * Error message mappings with user-friendly descriptions and recovery suggestions
 */
exports.ERROR_MESSAGES = {
    [constants_1.ERROR_CODES.AGENT_NOT_FOUND]: {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.AGENT,
        code: constants_1.ERROR_CODES.AGENT_NOT_FOUND,
        userMessage: "The agent you're looking for doesn't exist or has been removed.",
        technicalMessage: "Agent not found in the system",
        suggestions: [
            "Check if the agent name is spelled correctly",
            "Use 'magents list' to see all available agents",
            "Create a new agent with 'magents create'",
            "Refresh the dashboard to see the latest agents"
        ],
        learnMoreUrl: "/docs/agents/managing-agents",
        recoverable: true,
        autoFixAvailable: false
    },
    [constants_1.ERROR_CODES.AGENT_ALREADY_EXISTS]: {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.AGENT,
        code: constants_1.ERROR_CODES.AGENT_ALREADY_EXISTS,
        userMessage: "An agent with this name already exists. Choose a different name.",
        technicalMessage: "Agent with the specified name already exists",
        suggestions: [
            "Try a different agent name",
            "Use 'magents list' to see existing agent names",
            "Add a suffix like '-v2' or '-new' to make it unique",
            "Remove the existing agent first if no longer needed"
        ],
        recoverable: true,
        autoFixAvailable: true
    },
    [constants_1.ERROR_CODES.PROJECT_NOT_FOUND]: {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.PROJECT,
        code: constants_1.ERROR_CODES.PROJECT_NOT_FOUND,
        userMessage: "The project directory doesn't exist or isn't accessible.",
        technicalMessage: "Project directory not found",
        suggestions: [
            "Check if the project path is correct",
            "Ensure you have read permissions for the directory",
            "Use an absolute path instead of relative path",
            "Initialize the project directory first"
        ],
        recoverable: true,
        autoFixAvailable: false
    },
    [constants_1.ERROR_CODES.INVALID_CONFIG]: {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.CONFIGURATION,
        code: constants_1.ERROR_CODES.INVALID_CONFIG,
        userMessage: "The configuration file has errors and needs to be fixed.",
        technicalMessage: "Configuration validation failed",
        suggestions: [
            "Check the configuration file syntax",
            "Use 'magents config validate' to see specific errors",
            "Reset to default configuration with 'magents config reset'",
            "Compare with the example configuration"
        ],
        learnMoreUrl: "/docs/configuration",
        recoverable: true,
        autoFixAvailable: true
    },
    [constants_1.ERROR_CODES.DOCKER_ERROR]: {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DOCKER,
        code: constants_1.ERROR_CODES.DOCKER_ERROR,
        userMessage: "Docker is not running or not properly configured.",
        technicalMessage: "Docker daemon error",
        suggestions: [
            "Make sure Docker Desktop is running",
            "Check if Docker daemon is accessible",
            "Restart Docker service",
            "Verify Docker installation with 'docker --version'"
        ],
        learnMoreUrl: "/docs/setup/docker",
        recoverable: true,
        autoFixAvailable: false
    },
    [constants_1.ERROR_CODES.GIT_ERROR]: {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        code: constants_1.ERROR_CODES.GIT_ERROR,
        userMessage: "Git operation failed. Check your repository status.",
        technicalMessage: "Git command execution failed",
        suggestions: [
            "Ensure the directory is a Git repository",
            "Check if you have uncommitted changes",
            "Verify Git is installed with 'git --version'",
            "Check your Git credentials and permissions"
        ],
        recoverable: true,
        autoFixAvailable: false
    },
    [constants_1.ERROR_CODES.TMUX_ERROR]: {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        code: constants_1.ERROR_CODES.TMUX_ERROR,
        userMessage: "Terminal session management failed.",
        technicalMessage: "Tmux operation failed",
        suggestions: [
            "Install tmux with your package manager",
            "Check if tmux is in your PATH",
            "Kill existing tmux sessions if they're stuck",
            "Try running the command directly without tmux"
        ],
        recoverable: true,
        autoFixAvailable: false
    },
    [constants_1.ERROR_CODES.PORT_UNAVAILABLE]: {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK,
        code: constants_1.ERROR_CODES.PORT_UNAVAILABLE,
        userMessage: "The required port is already in use by another application.",
        technicalMessage: "Network port is not available",
        suggestions: [
            "Try a different port number",
            "Stop the application using this port",
            "Use 'lsof -i :PORT' to see what's using the port",
            "Let magents auto-select an available port"
        ],
        recoverable: true,
        autoFixAvailable: true
    },
    [constants_1.ERROR_CODES.MAX_AGENTS_REACHED]: {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.AGENT,
        code: constants_1.ERROR_CODES.MAX_AGENTS_REACHED,
        userMessage: "You've reached the maximum number of agents. Remove some agents first.",
        technicalMessage: "Maximum agent limit exceeded",
        suggestions: [
            "Stop unused agents with 'magents stop <name>'",
            "Remove agents you no longer need",
            "Check your subscription limits",
            "Consider upgrading your plan for more agents"
        ],
        recoverable: true,
        autoFixAvailable: false
    }
};
/**
 * Create a structured error with enhanced context
 */
function createMagentsError(code, context, overrides) {
    const baseError = exports.ERROR_MESSAGES[code];
    if (!baseError) {
        // Fallback for unknown errors
        return new MagentsError({
            timestamp: new Date(),
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.SYSTEM,
            code: 'UNKNOWN_ERROR',
            userMessage: 'An unexpected error occurred. Please try again.',
            technicalMessage: `Unknown error code: ${code}`,
            suggestions: [
                'Try refreshing the page or restarting the application',
                'Check the console for more details',
                'Report this issue if it persists'
            ],
            recoverable: true,
            autoFixAvailable: false,
            context,
            ...overrides
        });
    }
    return new MagentsError({
        timestamp: new Date(),
        context,
        ...baseError,
        ...overrides
    });
}
/**
 * Create error from generic Error object
 */
function createMagentsErrorFromGeneric(error, code, context) {
    // Try to match common error patterns to known error codes
    const message = error.message.toLowerCase();
    let detectedCode = code;
    if (!detectedCode) {
        if (message.includes('not found')) {
            detectedCode = constants_1.ERROR_CODES.AGENT_NOT_FOUND;
        }
        else if (message.includes('already exists')) {
            detectedCode = constants_1.ERROR_CODES.AGENT_ALREADY_EXISTS;
        }
        else if (message.includes('docker')) {
            detectedCode = constants_1.ERROR_CODES.DOCKER_ERROR;
        }
        else if (message.includes('port') && message.includes('use')) {
            detectedCode = constants_1.ERROR_CODES.PORT_UNAVAILABLE;
        }
        else if (message.includes('git')) {
            detectedCode = constants_1.ERROR_CODES.GIT_ERROR;
        }
        else if (message.includes('tmux')) {
            detectedCode = constants_1.ERROR_CODES.TMUX_ERROR;
        }
    }
    if (detectedCode && exports.ERROR_MESSAGES[detectedCode]) {
        return createMagentsError(detectedCode, {
            ...context,
            originalError: error.message,
            originalStack: error.stack
        });
    }
    // Generic error fallback
    return new MagentsError({
        timestamp: new Date(),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        code: 'GENERIC_ERROR',
        userMessage: 'Something went wrong. Please try again.',
        technicalMessage: error.message,
        suggestions: [
            'Try the operation again',
            'Check your internet connection',
            'Restart the application if the problem persists'
        ],
        context: {
            ...context,
            originalError: error.message,
            originalStack: error.stack
        },
        recoverable: true,
        autoFixAvailable: false
    });
}
/**
 * Auto-fix functionality for supported errors
 */
async function attemptAutoFix(error) {
    if (!error.autoFixAvailable) {
        return false;
    }
    try {
        switch (error.code) {
            case constants_1.ERROR_CODES.AGENT_ALREADY_EXISTS:
                // Auto-suggest alternative name
                const originalName = error.context?.agentName;
                if (originalName) {
                    const timestamp = Date.now().toString().slice(-4);
                    const suggestedName = `${originalName}-${timestamp}`;
                    error.context = {
                        ...error.context,
                        suggestedName
                    };
                }
                return true;
            case constants_1.ERROR_CODES.PORT_UNAVAILABLE:
                // Auto-select available port
                const startPort = error.context?.requestedPort || 3000;
                // This would integrate with port scanning logic
                error.context = {
                    ...error.context,
                    suggestedPort: startPort + Math.floor(Math.random() * 1000)
                };
                return true;
            case constants_1.ERROR_CODES.INVALID_CONFIG:
                // Could attempt to fix common config issues
                return false; // Not implemented yet
            default:
                return false;
        }
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map