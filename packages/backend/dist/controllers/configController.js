"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configController = void 0;
const shared_1 = require("@magents/shared");
// In-memory storage for scaffolding
let currentConfig = { ...shared_1.DEFAULT_CONFIG };
exports.configController = {
    async getConfig() {
        return currentConfig;
    },
    async updateConfig(updates) {
        // Validate updates
        if (updates.MAX_AGENTS && (updates.MAX_AGENTS < 1 || updates.MAX_AGENTS > 50)) {
            throw new Error('MAX_AGENTS must be between 1 and 50');
        }
        if (updates.DEFAULT_BASE_BRANCH && !updates.DEFAULT_BASE_BRANCH.trim()) {
            throw new Error('DEFAULT_BASE_BRANCH cannot be empty');
        }
        // Apply updates
        currentConfig = {
            ...currentConfig,
            ...updates
        };
        // In a real implementation, this would persist to file or database
        return currentConfig;
    },
    async resetConfig() {
        currentConfig = { ...shared_1.DEFAULT_CONFIG };
        return currentConfig;
    }
};
//# sourceMappingURL=configController.js.map