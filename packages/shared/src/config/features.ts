/**
 * Feature flags configuration for Magents
 */

export interface FeatureFlags {
  /**
   * Enable TaskMaster integration
   */
  taskMasterIntegration: boolean;

  /**
   * Enable internal task management system
   */
  internalTaskSystem: boolean;

  /**
   * Enable multiple task integrations simultaneously
   */
  multipleTaskIntegrations: boolean;

  /**
   * Enable task analytics and reporting
   */
  taskAnalytics: boolean;

  /**
   * Enable AI-powered task suggestions
   */
  aiTaskSuggestions: boolean;

  /**
   * Enable real-time task collaboration
   */
  realtimeTaskCollaboration: boolean;
}

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  taskMasterIntegration: true, // Enabled by default for backward compatibility
  internalTaskSystem: false,
  multipleTaskIntegrations: false,
  taskAnalytics: false,
  aiTaskSuggestions: false,
  realtimeTaskCollaboration: false
};

/**
 * Feature flag sources priority (highest to lowest):
 * 1. Runtime configuration (API/UI)
 * 2. Environment variables
 * 3. Configuration file
 * 4. Default values
 */

/**
 * Get feature flags from environment variables
 */
export function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};

  // TaskMaster integration
  if (process.env.FEATURE_TASKMASTER_INTEGRATION !== undefined) {
    flags.taskMasterIntegration = process.env.FEATURE_TASKMASTER_INTEGRATION === 'true';
  }

  // Internal task system
  if (process.env.FEATURE_INTERNAL_TASKS !== undefined) {
    flags.internalTaskSystem = process.env.FEATURE_INTERNAL_TASKS === 'true';
  }

  // Multiple integrations
  if (process.env.FEATURE_MULTIPLE_INTEGRATIONS !== undefined) {
    flags.multipleTaskIntegrations = process.env.FEATURE_MULTIPLE_INTEGRATIONS === 'true';
  }

  // Task analytics
  if (process.env.FEATURE_TASK_ANALYTICS !== undefined) {
    flags.taskAnalytics = process.env.FEATURE_TASK_ANALYTICS === 'true';
  }

  // AI suggestions
  if (process.env.FEATURE_AI_SUGGESTIONS !== undefined) {
    flags.aiTaskSuggestions = process.env.FEATURE_AI_SUGGESTIONS === 'true';
  }

  // Real-time collaboration
  if (process.env.FEATURE_REALTIME_COLLAB !== undefined) {
    flags.realtimeTaskCollaboration = process.env.FEATURE_REALTIME_COLLAB === 'true';
  }

  return flags;
}

/**
 * Feature flag manager
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;
  private overrides: Partial<FeatureFlags> = {};

  private constructor() {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
    this.loadFromEnvironment();
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Load feature flags from environment
   */
  private loadFromEnvironment(): void {
    const envFlags = getFeatureFlagsFromEnv();
    this.flags = { ...this.flags, ...envFlags };
  }

  /**
   * Get current feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags, ...this.overrides };
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    const flags = this.getFlags();
    return flags[feature];
  }

  /**
   * Override feature flags at runtime
   */
  setOverrides(overrides: Partial<FeatureFlags>): void {
    this.overrides = { ...this.overrides, ...overrides };
  }

  /**
   * Clear runtime overrides
   */
  clearOverrides(): void {
    this.overrides = {};
  }

  /**
   * Reset to default flags
   */
  reset(): void {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
    this.overrides = {};
    this.loadFromEnvironment();
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();