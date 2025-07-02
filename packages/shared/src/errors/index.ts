/**
 * Enhanced Error Handling System for Magents
 * Provides structured error classes, user-friendly messages, and recovery suggestions
 */

import { ERROR_CODES } from '../constants';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  AGENT = 'agent',
  PROJECT = 'project', 
  DOCKER = 'docker',
  SYSTEM = 'system',
  NETWORK = 'network',
  VALIDATION = 'validation',
  CONFIGURATION = 'configuration'
}

// Base error interface
export interface ErrorContext {
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code: string;
  userMessage: string;
  technicalMessage: string;
  suggestions: string[];
  learnMoreUrl?: string;
  context?: Record<string, any>;
  recoverable: boolean;
  autoFixAvailable: boolean;
}

// Enhanced error class
export class MagentsError extends Error {
  public readonly timestamp: Date;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly suggestions: string[];
  public readonly learnMoreUrl?: string;
  public context?: Record<string, any>; // Allow mutations for auto-fix
  public readonly recoverable: boolean;
  public readonly autoFixAvailable: boolean;

  constructor(errorContext: ErrorContext) {
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

/**
 * Error message mappings with user-friendly descriptions and recovery suggestions
 */
export const ERROR_MESSAGES: Record<string, Omit<ErrorContext, 'timestamp' | 'context'>> = {
  [ERROR_CODES.AGENT_NOT_FOUND]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AGENT,
    code: ERROR_CODES.AGENT_NOT_FOUND,
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

  [ERROR_CODES.AGENT_ALREADY_EXISTS]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AGENT,
    code: ERROR_CODES.AGENT_ALREADY_EXISTS,
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

  [ERROR_CODES.PROJECT_NOT_FOUND]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.PROJECT,
    code: ERROR_CODES.PROJECT_NOT_FOUND,
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

  [ERROR_CODES.INVALID_CONFIG]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONFIGURATION,
    code: ERROR_CODES.INVALID_CONFIG,
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

  [ERROR_CODES.DOCKER_ERROR]: {
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.DOCKER,
    code: ERROR_CODES.DOCKER_ERROR,
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

  [ERROR_CODES.GIT_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    code: ERROR_CODES.GIT_ERROR,
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

  [ERROR_CODES.TMUX_ERROR]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    code: ERROR_CODES.TMUX_ERROR,
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

  [ERROR_CODES.PORT_UNAVAILABLE]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    code: ERROR_CODES.PORT_UNAVAILABLE,
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

  [ERROR_CODES.MAX_AGENTS_REACHED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AGENT,
    code: ERROR_CODES.MAX_AGENTS_REACHED,
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
export function createMagentsError(
  code: string, 
  context?: Record<string, any>, 
  overrides?: Partial<ErrorContext>
): MagentsError {
  const baseError = ERROR_MESSAGES[code];
  
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
export function createMagentsErrorFromGeneric(
  error: Error, 
  code?: string, 
  context?: Record<string, any>
): MagentsError {
  // Try to match common error patterns to known error codes
  const message = error.message.toLowerCase();
  let detectedCode = code;

  if (!detectedCode) {
    if (message.includes('not found')) {
      detectedCode = ERROR_CODES.AGENT_NOT_FOUND;
    } else if (message.includes('already exists')) {
      detectedCode = ERROR_CODES.AGENT_ALREADY_EXISTS;
    } else if (message.includes('docker')) {
      detectedCode = ERROR_CODES.DOCKER_ERROR;
    } else if (message.includes('port') && message.includes('use')) {
      detectedCode = ERROR_CODES.PORT_UNAVAILABLE;
    } else if (message.includes('git')) {
      detectedCode = ERROR_CODES.GIT_ERROR;
    } else if (message.includes('tmux')) {
      detectedCode = ERROR_CODES.TMUX_ERROR;
    }
  }

  if (detectedCode && ERROR_MESSAGES[detectedCode]) {
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
export async function attemptAutoFix(error: MagentsError): Promise<boolean> {
  if (!error.autoFixAvailable) {
    return false;
  }

  try {
    switch (error.code) {
      case ERROR_CODES.AGENT_ALREADY_EXISTS:
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

      case ERROR_CODES.PORT_UNAVAILABLE:
        // Auto-select available port
        const startPort = error.context?.requestedPort || 3000;
        // This would integrate with port scanning logic
        error.context = {
          ...error.context,
          suggestedPort: startPort + Math.floor(Math.random() * 1000)
        };
        return true;

      case ERROR_CODES.INVALID_CONFIG:
        // Could attempt to fix common config issues
        return false; // Not implemented yet

      default:
        return false;
    }
  } catch {
    return false;
  }
}