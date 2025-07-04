"use strict";
/**
 * Feature flags configuration for Magents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlags = exports.FeatureFlagManager = exports.DEFAULT_FEATURE_FLAGS = void 0;
exports.getFeatureFlagsFromEnv = getFeatureFlagsFromEnv;
/**
 * Default feature flags
 */
exports.DEFAULT_FEATURE_FLAGS = {
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
function getFeatureFlagsFromEnv() {
    const flags = {};
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
class FeatureFlagManager {
    constructor() {
        this.overrides = {};
        this.flags = { ...exports.DEFAULT_FEATURE_FLAGS };
        this.loadFromEnvironment();
    }
    static getInstance() {
        if (!FeatureFlagManager.instance) {
            FeatureFlagManager.instance = new FeatureFlagManager();
        }
        return FeatureFlagManager.instance;
    }
    /**
     * Load feature flags from environment
     */
    loadFromEnvironment() {
        const envFlags = getFeatureFlagsFromEnv();
        this.flags = { ...this.flags, ...envFlags };
    }
    /**
     * Get current feature flags
     */
    getFlags() {
        return { ...this.flags, ...this.overrides };
    }
    /**
     * Check if a feature is enabled
     */
    isEnabled(feature) {
        const flags = this.getFlags();
        return flags[feature];
    }
    /**
     * Override feature flags at runtime
     */
    setOverrides(overrides) {
        this.overrides = { ...this.overrides, ...overrides };
    }
    /**
     * Clear runtime overrides
     */
    clearOverrides() {
        this.overrides = {};
    }
    /**
     * Reset to default flags
     */
    reset() {
        this.flags = { ...exports.DEFAULT_FEATURE_FLAGS };
        this.overrides = {};
        this.loadFromEnvironment();
    }
}
exports.FeatureFlagManager = FeatureFlagManager;
// Export singleton instance
exports.featureFlags = FeatureFlagManager.getInstance();
//# sourceMappingURL=features.js.map