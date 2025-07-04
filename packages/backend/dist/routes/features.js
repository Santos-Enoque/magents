"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureRoutes = void 0;
const express_1 = require("express");
const features_1 = require("@magents/shared/src/config/features");
const router = (0, express_1.Router)();
exports.featureRoutes = router;
/**
 * Get current feature flags
 */
router.get('/', (_req, res) => {
    try {
        const flags = features_1.featureFlags.getFlags();
        res.json({
            success: true,
            data: flags
        });
    }
    catch (error) {
        console.error('Error getting feature flags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get feature flags'
        });
    }
});
/**
 * Update feature flags (runtime overrides)
 */
router.put('/', (req, res) => {
    try {
        const updates = req.body;
        // Validate the updates
        const validKeys = [
            'taskMasterIntegration',
            'internalTaskSystem',
            'multipleTaskIntegrations',
            'taskAnalytics',
            'aiTaskSuggestions',
            'realtimeTaskCollaboration'
        ];
        const invalidKeys = Object.keys(updates).filter(key => !validKeys.includes(key));
        if (invalidKeys.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid feature flags: ${invalidKeys.join(', ')}`
            });
        }
        // Apply the overrides
        features_1.featureFlags.setOverrides(updates);
        // Return updated flags
        const flags = features_1.featureFlags.getFlags();
        res.json({
            success: true,
            data: flags,
            message: 'Feature flags updated (runtime overrides applied)'
        });
    }
    catch (error) {
        console.error('Error updating feature flags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update feature flags'
        });
    }
});
/**
 * Reset feature flags to defaults
 */
router.post('/reset', (_req, res) => {
    try {
        features_1.featureFlags.reset();
        const flags = features_1.featureFlags.getFlags();
        res.json({
            success: true,
            data: flags,
            message: 'Feature flags reset to defaults'
        });
    }
    catch (error) {
        console.error('Error resetting feature flags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset feature flags'
        });
    }
});
/**
 * Clear runtime overrides
 */
router.post('/clear-overrides', (_req, res) => {
    try {
        features_1.featureFlags.clearOverrides();
        const flags = features_1.featureFlags.getFlags();
        res.json({
            success: true,
            data: flags,
            message: 'Runtime overrides cleared'
        });
    }
    catch (error) {
        console.error('Error clearing overrides:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear overrides'
        });
    }
});
//# sourceMappingURL=features.js.map