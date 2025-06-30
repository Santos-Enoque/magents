import { MagentsConfig, DEFAULT_CONFIG } from '@magents/shared';

// In-memory storage for scaffolding
let currentConfig: MagentsConfig = { ...DEFAULT_CONFIG };

export const configController = {
  async getConfig(): Promise<MagentsConfig> {
    return currentConfig;
  },

  async updateConfig(updates: Partial<MagentsConfig>): Promise<MagentsConfig> {
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

  async resetConfig(): Promise<MagentsConfig> {
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }
};