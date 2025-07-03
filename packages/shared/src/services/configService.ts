import * as path from 'path';
import * as os from 'os';

/**
 * Configuration service for accessing app configuration
 */
export class ConfigService {
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(os.homedir(), '.magents');
  }

  getDataDir(): string {
    return this.dataDir;
  }

  setDataDir(dir: string): void {
    this.dataDir = dir;
  }
}