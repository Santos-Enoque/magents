// Export all types
export * from './types';

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