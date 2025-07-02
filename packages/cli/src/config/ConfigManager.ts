import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MagentsConfig } from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private configFile: string;
  private agentsDir: string;
  private config: MagentsConfig | null = null;

  private constructor() {
    this.configFile = path.join(os.homedir(), '.magents-config');
    this.agentsDir = path.join(os.homedir(), '.magents');
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfigPath(): string {
    return this.configFile;
  }

  public getAgentsDir(): string {
    return this.agentsDir;
  }

  public initializeConfig(): void {
    // Create agents directory
    if (!fs.existsSync(this.agentsDir)) {
      fs.mkdirSync(this.agentsDir, { recursive: true });
    }

    // Create default config if it doesn't exist
    if (!fs.existsSync(this.configFile)) {
      const defaultConfig = `# magents Configuration
DEFAULT_BASE_BRANCH=main
TMUX_SESSION_PREFIX=magent
WORKTREE_PREFIX=agent
MAX_AGENTS=5
CLAUDE_CODE_PATH=claude
CLAUDE_AUTO_ACCEPT=true
DOCKER_ENABLED=false
DOCKER_IMAGE=magents/agent:latest
`;
      fs.writeFileSync(this.configFile, defaultConfig);
    }
  }

  public loadConfig(): MagentsConfig {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configFile)) {
      this.initializeConfig();
    }

    const configContent = fs.readFileSync(this.configFile, 'utf8');
    const config: Partial<MagentsConfig> = {};

    // Parse simple key=value format
    configContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && value) {
          const cleanKey = key.trim() as keyof MagentsConfig;
          const cleanValue = value.trim();

          switch (cleanKey) {
            case 'MAX_AGENTS':
              config[cleanKey] = parseInt(cleanValue, 10);
              break;
            case 'CLAUDE_AUTO_ACCEPT':
            case 'DOCKER_ENABLED':
              config[cleanKey] = cleanValue.toLowerCase() === 'true';
              break;
            case 'DEFAULT_BASE_BRANCH':
            case 'TMUX_SESSION_PREFIX':
            case 'WORKTREE_PREFIX':
            case 'CLAUDE_CODE_PATH':
            case 'DOCKER_IMAGE':
              config[cleanKey] = cleanValue;
              break;
          }
        }
      }
    });

    // Set defaults for missing values
    this.config = {
      DEFAULT_BASE_BRANCH: config.DEFAULT_BASE_BRANCH || 'main',
      TMUX_SESSION_PREFIX: config.TMUX_SESSION_PREFIX || 'magent',
      WORKTREE_PREFIX: config.WORKTREE_PREFIX || 'agent',
      MAX_AGENTS: config.MAX_AGENTS || 5,
      CLAUDE_CODE_PATH: config.CLAUDE_CODE_PATH || 'claude',
      CLAUDE_AUTO_ACCEPT: config.CLAUDE_AUTO_ACCEPT !== undefined ? config.CLAUDE_AUTO_ACCEPT : true,
      DOCKER_ENABLED: config.DOCKER_ENABLED !== undefined ? config.DOCKER_ENABLED : false,
      DOCKER_IMAGE: config.DOCKER_IMAGE || 'magents/agent:latest',
    };

    return this.config;
  }

  public updateConfig(updates: Partial<MagentsConfig>): void {
    const currentConfig = this.loadConfig();
    const newConfig = { ...currentConfig, ...updates };

    const configLines = [
      '# magents Configuration',
      `DEFAULT_BASE_BRANCH=${newConfig.DEFAULT_BASE_BRANCH}`,
      `TMUX_SESSION_PREFIX=${newConfig.TMUX_SESSION_PREFIX}`,
      `WORKTREE_PREFIX=${newConfig.WORKTREE_PREFIX}`,
      `MAX_AGENTS=${newConfig.MAX_AGENTS}`,
      `CLAUDE_CODE_PATH=${newConfig.CLAUDE_CODE_PATH}`,
      `CLAUDE_AUTO_ACCEPT=${newConfig.CLAUDE_AUTO_ACCEPT}`,
      `DOCKER_ENABLED=${newConfig.DOCKER_ENABLED}`,
      `DOCKER_IMAGE=${newConfig.DOCKER_IMAGE}`,
    ];

    fs.writeFileSync(this.configFile, configLines.join('\n') + '\n');
    this.config = newConfig;
  }
}