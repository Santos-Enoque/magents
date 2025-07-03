import { ProjectManager } from './ProjectManager';
import { ProjectManagerDB } from './ProjectManagerDB';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * ProjectService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
export class ProjectService {
  private static instance: ProjectManager | ProjectManagerDB;
  private static useDatabase: boolean = false;

  /**
   * Get the appropriate ProjectManager implementation
   * This allows for graceful transition from file-based to database-based storage
   */
  public static getInstance(): ProjectManager | ProjectManagerDB {
    if (!ProjectService.instance) {
      // Check if database file exists to determine which implementation to use
      const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
      ProjectService.useDatabase = fs.existsSync(dbPath);
      
      if (ProjectService.useDatabase) {
        console.log('[ProjectService] Using database-backed implementation');
        ProjectService.instance = ProjectManagerDB.getInstance();
      } else {
        console.log('[ProjectService] Using file-based implementation');
        ProjectService.instance = ProjectManager.getInstance();
      }
    }
    
    return ProjectService.instance;
  }

  /**
   * Force the service to use database implementation
   * Useful after running migration
   */
  public static useDatabaseImplementation(): void {
    console.log('[ProjectService] Switching to database-backed implementation');
    ProjectService.useDatabase = true;
    ProjectService.instance = ProjectManagerDB.getInstance();
  }

  /**
   * Check if currently using database implementation
   */
  public static isUsingDatabase(): boolean {
    return ProjectService.useDatabase;
  }

  /**
   * Reset the instance (useful for testing)
   */
  public static reset(): void {
    ProjectService.instance = null as any;
    ProjectService.useDatabase = false;
  }
}