import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface BackendConfig {
  backendUrl: string;
  backendPort: number;
}

export class ConfigService {
  private configDir: string;
  private configFile: string;
  private defaultBackendUrl = 'http://localhost:3456';
  private defaultBackendPort = 3456;

  constructor() {
    this.configDir = path.join(os.homedir(), '.magents');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  async getBackendConfig(): Promise<BackendConfig> {
    // Check environment variables first
    if (process.env.MAGENTS_BACKEND_URL) {
      const url = new URL(process.env.MAGENTS_BACKEND_URL);
      return {
        backendUrl: process.env.MAGENTS_BACKEND_URL,
        backendPort: parseInt(url.port) || this.defaultBackendPort
      };
    }

    // Check config file
    if (fs.existsSync(this.configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
        if (config.backendUrl) {
          return {
            backendUrl: config.backendUrl,
            backendPort: config.backendPort || this.defaultBackendPort
          };
        }
      } catch (error) {
        // Fall through to defaults
      }
    }

    // Return defaults
    return {
      backendUrl: this.defaultBackendUrl,
      backendPort: this.defaultBackendPort
    };
  }

  async saveBackendConfig(config: Partial<BackendConfig>): Promise<void> {
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    let existingConfig = {};
    if (fs.existsSync(this.configFile)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      } catch (error) {
        // Ignore parsing errors
      }
    }

    const newConfig = {
      ...existingConfig,
      ...config
    };

    fs.writeFileSync(this.configFile, JSON.stringify(newConfig, null, 2));
  }
}