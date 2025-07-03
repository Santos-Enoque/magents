/**
 * TaskMaster Integration Configuration
 */

export interface TaskMasterConfig {
  /**
   * Whether TaskMaster integration is enabled
   */
  enabled: boolean;

  /**
   * Whether to auto-install TaskMaster in Docker containers
   */
  autoInstall: boolean;

  /**
   * Path to TaskMaster configuration file
   */
  configPath?: string;

  /**
   * Default API keys for TaskMaster AI features
   */
  apiKeys?: {
    anthropic?: string;
    perplexity?: string;
    openai?: string;
    google?: string;
    mistral?: string;
  };

  /**
   * Model configuration for TaskMaster
   */
  models?: {
    main?: string;
    research?: string;
    fallback?: string;
  };

  /**
   * Additional TaskMaster CLI flags
   */
  cliFlags?: string[];
}

export const DEFAULT_TASKMASTER_CONFIG: TaskMasterConfig = {
  enabled: false,
  autoInstall: false,
  apiKeys: {},
  models: {
    main: 'claude-3-5-sonnet-20241022',
    research: 'perplexity-llama-3.1-sonar-large-128k-online',
    fallback: 'gpt-4o-mini'
  },
  cliFlags: []
};

/**
 * Check if TaskMaster should be enabled based on environment
 */
export function shouldEnableTaskMaster(): boolean {
  // Check environment variables
  if (process.env.TASKMASTER_ENABLED === 'true') {
    return true;
  }

  if (process.env.TASK_MASTER_ENABLED === 'true') {
    return true;
  }

  // Check if any TaskMaster API keys are set
  const apiKeyEnvVars = [
    'ANTHROPIC_API_KEY',
    'PERPLEXITY_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'MISTRAL_API_KEY'
  ];

  return apiKeyEnvVars.some(key => !!process.env[key]);
}

/**
 * Get TaskMaster configuration from environment
 */
export function getTaskMasterConfigFromEnv(): TaskMasterConfig {
  const config: TaskMasterConfig = {
    ...DEFAULT_TASKMASTER_CONFIG,
    enabled: shouldEnableTaskMaster()
  };

  // Auto-install if enabled and in Docker environment
  if (config.enabled && process.env.RUNNING_IN_DOCKER === 'true') {
    config.autoInstall = true;
  }

  // Collect API keys from environment
  if (process.env.ANTHROPIC_API_KEY) {
    config.apiKeys!.anthropic = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.PERPLEXITY_API_KEY) {
    config.apiKeys!.perplexity = process.env.PERPLEXITY_API_KEY;
  }
  if (process.env.OPENAI_API_KEY) {
    config.apiKeys!.openai = process.env.OPENAI_API_KEY;
  }
  if (process.env.GOOGLE_API_KEY) {
    config.apiKeys!.google = process.env.GOOGLE_API_KEY;
  }
  if (process.env.MISTRAL_API_KEY) {
    config.apiKeys!.mistral = process.env.MISTRAL_API_KEY;
  }

  // Override models from environment
  if (process.env.TASKMASTER_MODEL_MAIN) {
    config.models!.main = process.env.TASKMASTER_MODEL_MAIN;
  }
  if (process.env.TASKMASTER_MODEL_RESEARCH) {
    config.models!.research = process.env.TASKMASTER_MODEL_RESEARCH;
  }
  if (process.env.TASKMASTER_MODEL_FALLBACK) {
    config.models!.fallback = process.env.TASKMASTER_MODEL_FALLBACK;
  }

  return config;
}