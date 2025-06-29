import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MCPConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  scope: 'global' | 'project' | 'agent';
}

export interface SettingsSyncResult {
  success: boolean;
  message: string;
  syncedFiles: string[];
  errors: string[];
}

export class SettingsManager {
  private homeDir: string;
  private claudeConfigDir: string;

  constructor() {
    this.homeDir = os.homedir();
    this.claudeConfigDir = path.join(this.homeDir, '.claude');
  }

  public async syncSettingsToAgent(agentPath: string): Promise<SettingsSyncResult> {
    const result: SettingsSyncResult = {
      success: true,
      message: '',
      syncedFiles: [],
      errors: []
    };

    try {
      const targetClaudeDir = path.join(agentPath, '.claude');
      
      // Create target directory
      if (!fs.existsSync(targetClaudeDir)) {
        fs.mkdirSync(targetClaudeDir, { recursive: true });
      }

      // Sync settings.json
      await this.syncFile(
        path.join(this.claudeConfigDir, 'settings.json'),
        path.join(targetClaudeDir, 'settings.json'),
        result
      );

      // Sync .claude.json from home directory
      await this.syncFile(
        path.join(this.homeDir, '.claude.json'),
        path.join(agentPath, '.claude.json'),
        result
      );

      // Sync commands directory
      await this.syncDirectory(
        path.join(this.claudeConfigDir, 'commands'),
        path.join(targetClaudeDir, 'commands'),
        result
      );

      // Sync MCPs directory
      await this.syncDirectory(
        path.join(this.claudeConfigDir, 'mcps'),
        path.join(targetClaudeDir, 'mcps'),
        result
      );

      result.message = `Successfully synced ${result.syncedFiles.length} files to agent`;
      
    } catch (error) {
      result.success = false;
      result.message = `Failed to sync settings: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(result.message);
    }

    return result;
  }

  public async createProjectSettings(projectPath: string, settings: any): Promise<void> {
    const projectSettingsDir = path.join(projectPath, '.magents', 'claude');
    
    if (!fs.existsSync(projectSettingsDir)) {
      fs.mkdirSync(projectSettingsDir, { recursive: true });
    }

    const settingsFile = path.join(projectSettingsDir, 'settings.json');
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  }

  public loadProjectSettings(projectPath: string): any {
    const settingsFile = path.join(projectPath, '.magents', 'claude', 'settings.json');
    
    if (!fs.existsSync(settingsFile)) {
      return {};
    }

    try {
      const data = fs.readFileSync(settingsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Error loading project settings: ${error}`);
      return {};
    }
  }

  public mergeMCPConfigs(globalMCPs: MCPConfig[], projectMCPs: MCPConfig[] = []): MCPConfig[] {
    const merged = [...globalMCPs];
    
    // Add project MCPs that don't conflict with global ones
    projectMCPs.forEach(projectMCP => {
      const existingIndex = merged.findIndex(mcp => mcp.name === projectMCP.name);
      
      if (existingIndex >= 0) {
        // Override global MCP with project-specific one
        merged[existingIndex] = projectMCP;
      } else {
        // Add new project MCP
        merged.push(projectMCP);
      }
    });

    return merged;
  }

  public validateMCPConfig(mcp: MCPConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!mcp.name || mcp.name.trim().length === 0) {
      errors.push('MCP name is required');
    }

    if (!mcp.command || mcp.command.trim().length === 0) {
      errors.push('MCP command is required');
    }

    if (!['global', 'project', 'agent'].includes(mcp.scope)) {
      errors.push('MCP scope must be global, project, or agent');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getClaudeConfigFiles(): string[] {
    const files: string[] = [];

    // Check for settings.json
    const settingsFile = path.join(this.claudeConfigDir, 'settings.json');
    if (fs.existsSync(settingsFile)) {
      files.push(settingsFile);
    }

    // Check for .claude.json
    const claudeJsonFile = path.join(this.homeDir, '.claude.json');
    if (fs.existsSync(claudeJsonFile)) {
      files.push(claudeJsonFile);
    }

    // Check for commands directory
    const commandsDir = path.join(this.claudeConfigDir, 'commands');
    if (fs.existsSync(commandsDir)) {
      const commandFiles = fs.readdirSync(commandsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(commandsDir, file));
      files.push(...commandFiles);
    }

    return files;
  }

  private async syncFile(source: string, target: string, result: SettingsSyncResult): Promise<void> {
    try {
      if (fs.existsSync(source)) {
        // Ensure target directory exists
        const targetDir = path.dirname(target);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.copyFileSync(source, target);
        result.syncedFiles.push(target);
      }
    } catch (error) {
      const errorMsg = `Error syncing ${source}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      result.success = false;
    }
  }

  private async syncDirectory(source: string, target: string, result: SettingsSyncResult): Promise<void> {
    try {
      if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
        // Create target directory
        if (!fs.existsSync(target)) {
          fs.mkdirSync(target, { recursive: true });
        }

        // Copy all files in directory
        const files = fs.readdirSync(source);
        for (const file of files) {
          const sourcePath = path.join(source, file);
          const targetPath = path.join(target, file);
          
          if (fs.statSync(sourcePath).isFile()) {
            await this.syncFile(sourcePath, targetPath, result);
          }
        }
      }
    } catch (error) {
      const errorMsg = `Error syncing directory ${source}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      result.success = false;
    }
  }
}