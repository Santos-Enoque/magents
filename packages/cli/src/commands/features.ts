import { Command } from 'commander';
import { ConfigService } from '../services/ConfigService';
import { UIService } from '../services/UIService';
import axios from 'axios';

const ui = new UIService();
const configService = new ConfigService();

interface FeatureFlags {
  taskMasterIntegration: boolean;
  internalTaskSystem: boolean;
  multipleTaskIntegrations: boolean;
  taskAnalytics: boolean;
  aiTaskSuggestions: boolean;
  realtimeTaskCollaboration: boolean;
}

export function createFeaturesCommand(): Command {
  const command = new Command('features')
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
        const response = await axios.get(`${config.backendUrl}/api/features`);
        
        if (response.data.success) {
          const flags = response.data.data as FeatureFlags;
          
          ui.header('Feature Flags');
          ui.divider();
          
          // Display each flag with its status
          const flagEntries = Object.entries(flags);
          flagEntries.forEach(([key, value]) => {
            const status = value ? ui.success('ENABLED') : ui.muted('DISABLED');
            const flagName = key.replace(/([A-Z])/g, ' $1').trim();
            ui.info(`${flagName}: ${status}`);
          });
          
          ui.divider();
          ui.muted('Use "magents features enable <flag>" to enable a feature');
          ui.muted('Use "magents features disable <flag>" to disable a feature');
        } else {
          ui.error('Failed to get feature flags');
        }
      } catch (error) {
        ui.error('Failed to connect to backend');
        ui.muted('Make sure the backend is running');
      }
    });

  // Enable a feature flag
  command
    .command('enable <flag>')
    .description('Enable a feature flag')
    .action(async (flag: string) => {
      try {
        const config = await configService.getBackendConfig();
        
        // Convert flag name to camelCase
        const flagKey = flag.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        const response = await axios.put(`${config.backendUrl}/api/features`, {
          [flagKey]: true
        });
        
        if (response.data.success) {
          ui.success(`Feature '${flag}' enabled`);
          ui.muted('Note: This is a runtime override. To persist, set environment variables.');
        } else {
          ui.error(`Failed to enable feature '${flag}'`);
        }
      } catch (error: any) {
        if (error.response?.status === 400) {
          ui.error(`Invalid feature flag: ${flag}`);
          ui.muted('Use "magents features list" to see available flags');
        } else {
          ui.error('Failed to connect to backend');
        }
      }
    });

  // Disable a feature flag
  command
    .command('disable <flag>')
    .description('Disable a feature flag')
    .action(async (flag: string) => {
      try {
        const config = await configService.getBackendConfig();
        
        // Convert flag name to camelCase
        const flagKey = flag.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        const response = await axios.put(`${config.backendUrl}/api/features`, {
          [flagKey]: false
        });
        
        if (response.data.success) {
          ui.success(`Feature '${flag}' disabled`);
          ui.muted('Note: This is a runtime override. To persist, set environment variables.');
        } else {
          ui.error(`Failed to disable feature '${flag}'`);
        }
      } catch (error: any) {
        if (error.response?.status === 400) {
          ui.error(`Invalid feature flag: ${flag}`);
          ui.muted('Use "magents features list" to see available flags');
        } else {
          ui.error('Failed to connect to backend');
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
        const response = await axios.post(`${config.backendUrl}/api/features/reset`);
        
        if (response.data.success) {
          ui.success('Feature flags reset to defaults');
        } else {
          ui.error('Failed to reset feature flags');
        }
      } catch (error) {
        ui.error('Failed to connect to backend');
      }
    });

  // Clear overrides
  command
    .command('clear')
    .description('Clear runtime overrides')
    .action(async () => {
      try {
        const config = await configService.getBackendConfig();
        const response = await axios.post(`${config.backendUrl}/api/features/clear-overrides`);
        
        if (response.data.success) {
          ui.success('Runtime overrides cleared');
          ui.muted('Feature flags now reflect environment variables and defaults');
        } else {
          ui.error('Failed to clear overrides');
        }
      } catch (error) {
        ui.error('Failed to connect to backend');
      }
    });

  return command;
}