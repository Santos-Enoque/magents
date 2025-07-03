import { AgentManager, DockerAgentManager } from '@magents/cli';
import { AgentManagerDB } from './AgentManagerDB';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * AgentService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
export class AgentService {
  private static instance: AgentManagerDB | DockerAgentManager;
  private static useDatabase: boolean = false;

  /**
   * Get the appropriate AgentManager implementation
   * This allows for graceful transition from CLI-only to database-backed storage
   */
  public static getInstance(): AgentManagerDB | DockerAgentManager {
    if (!AgentService.instance) {
      // Check if database file exists to determine which implementation to use
      const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
      AgentService.useDatabase = fs.existsSync(dbPath);
      
      if (AgentService.useDatabase) {
        console.log('[AgentService] Using database-backed implementation');
        AgentService.instance = AgentManagerDB.getInstance();
      } else {
        console.log('[AgentService] Using CLI-only implementation');
        AgentService.instance = new DockerAgentManager();
      }
    }
    
    return AgentService.instance;
  }

  /**
   * Force the service to use database implementation
   * Useful after running migration
   */
  public static useDatabaseImplementation(): void {
    console.log('[AgentService] Switching to database-backed implementation');
    AgentService.useDatabase = true;
    AgentService.instance = AgentManagerDB.getInstance();
  }

  /**
   * Check if currently using database implementation
   */
  public static isUsingDatabase(): boolean {
    return AgentService.useDatabase;
  }

  /**
   * Reset the instance (useful for testing)
   */
  public static reset(): void {
    AgentService.instance = null as any;
    AgentService.useDatabase = false;
  }
}