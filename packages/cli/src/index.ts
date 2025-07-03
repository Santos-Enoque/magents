// Main CLI exports
// @deprecated AgentManager is deprecated - use DockerAgentManager instead
export { AgentManager } from './services/AgentManager';
export { ConfigManager } from './config/ConfigManager';
export { ui } from './ui/UIService';
export { GitService } from './services/GitService';

// Re-export types
export * from './types';