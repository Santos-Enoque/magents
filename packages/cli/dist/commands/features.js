"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeaturesCommand = createFeaturesCommand;
const commander_1 = require("commander");
const ConfigService_1 = require("../services/ConfigService");
const UIService_1 = require("../ui/UIService");
const axios_1 = __importDefault(require("axios"));
const configService = new ConfigService_1.ConfigService();
function createFeaturesCommand() {
    const command = new commander_1.Command('features')
        .description('Manage feature flags')
        .alias('ff');
    // List current feature flags
    command
        .command('list')
        .alias('ls')
        .description('List current feature flags')
        .action(async () => {
        try {
            const config = await configService.getBackendConfig();
            const response = await axios_1.default.get(`${config.backendUrl}/api/features`);
            if (response.data.success) {
                const flags = response.data.data;
                UIService_1.ui.header('Feature Flags');
                UIService_1.ui.divider();
                // Display each flag with its status
                const flagEntries = Object.entries(flags);
                flagEntries.forEach(([key, value]) => {
                    const status = value ? UIService_1.ui.success('ENABLED') : UIService_1.ui.muted('DISABLED');
                    const flagName = key.replace(/([A-Z])/g, ' $1').trim();
                    UIService_1.ui.info(`${flagName}: ${status}`);
                });
                UIService_1.ui.divider();
                UIService_1.ui.muted('Use "magents features enable <flag>" to enable a feature');
                UIService_1.ui.muted('Use "magents features disable <flag>" to disable a feature');
            }
            else {
                UIService_1.ui.error('Failed to get feature flags');
            }
        }
        catch (error) {
            UIService_1.ui.error('Failed to connect to backend');
            UIService_1.ui.muted('Make sure the backend is running');
        }
    });
    // Enable a feature flag
    command
        .command('enable <flag>')
        .description('Enable a feature flag')
        .action(async (flag) => {
        try {
            const config = await configService.getBackendConfig();
            // Convert flag name to camelCase
            const flagKey = flag.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const response = await axios_1.default.put(`${config.backendUrl}/api/features`, {
                [flagKey]: true
            });
            if (response.data.success) {
                UIService_1.ui.success(`Feature '${flag}' enabled`);
                UIService_1.ui.muted('Note: This is a runtime override. To persist, set environment variables.');
            }
            else {
                UIService_1.ui.error(`Failed to enable feature '${flag}'`);
            }
        }
        catch (error) {
            if (error.response?.status === 400) {
                UIService_1.ui.error(`Invalid feature flag: ${flag}`);
                UIService_1.ui.muted('Use "magents features list" to see available flags');
            }
            else {
                UIService_1.ui.error('Failed to connect to backend');
            }
        }
    });
    // Disable a feature flag
    command
        .command('disable <flag>')
        .description('Disable a feature flag')
        .action(async (flag) => {
        try {
            const config = await configService.getBackendConfig();
            // Convert flag name to camelCase
            const flagKey = flag.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const response = await axios_1.default.put(`${config.backendUrl}/api/features`, {
                [flagKey]: false
            });
            if (response.data.success) {
                UIService_1.ui.success(`Feature '${flag}' disabled`);
                UIService_1.ui.muted('Note: This is a runtime override. To persist, set environment variables.');
            }
            else {
                UIService_1.ui.error(`Failed to disable feature '${flag}'`);
            }
        }
        catch (error) {
            if (error.response?.status === 400) {
                UIService_1.ui.error(`Invalid feature flag: ${flag}`);
                UIService_1.ui.muted('Use "magents features list" to see available flags');
            }
            else {
                UIService_1.ui.error('Failed to connect to backend');
            }
        }
    });
    // Reset feature flags
    command
        .command('reset')
        .description('Reset feature flags to defaults')
        .action(async () => {
        try {
            const config = await configService.getBackendConfig();
            const response = await axios_1.default.post(`${config.backendUrl}/api/features/reset`);
            if (response.data.success) {
                UIService_1.ui.success('Feature flags reset to defaults');
            }
            else {
                UIService_1.ui.error('Failed to reset feature flags');
            }
        }
        catch (error) {
            UIService_1.ui.error('Failed to connect to backend');
        }
    });
    // Clear overrides
    command
        .command('clear')
        .description('Clear runtime overrides')
        .action(async () => {
        try {
            const config = await configService.getBackendConfig();
            const response = await axios_1.default.post(`${config.backendUrl}/api/features/clear-overrides`);
            if (response.data.success) {
                UIService_1.ui.success('Runtime overrides cleared');
                UIService_1.ui.muted('Feature flags now reflect environment variables and defaults');
            }
            else {
                UIService_1.ui.error('Failed to clear overrides');
            }
        }
        catch (error) {
            UIService_1.ui.error('Failed to connect to backend');
        }
    });
    return command;
}
//# sourceMappingURL=features.js.map