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
export declare const DEFAULT_FEATURE_FLAGS: FeatureFlags;
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
export declare function getFeatureFlagsFromEnv(): Partial<FeatureFlags>;
/**
 * Feature flag manager
 */
export declare class FeatureFlagManager {
    private static instance;
    private flags;
    private overrides;
    private constructor();
    static getInstance(): FeatureFlagManager;
    /**
     * Load feature flags from environment
     */
    private loadFromEnvironment;
    /**
     * Get current feature flags
     */
    getFlags(): FeatureFlags;
    /**
     * Check if a feature is enabled
     */
    isEnabled(feature: keyof FeatureFlags): boolean;
    /**
     * Override feature flags at runtime
     */
    setOverrides(overrides: Partial<FeatureFlags>): void;
    /**
     * Clear runtime overrides
     */
    clearOverrides(): void;
    /**
     * Reset to default flags
     */
    reset(): void;
}
export declare const featureFlags: FeatureFlagManager;
//# sourceMappingURL=features.d.ts.map