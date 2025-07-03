import { ProjectManager } from './ProjectManager';
import { ProjectManagerDB } from './ProjectManagerDB';
/**
 * ProjectService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
export declare class ProjectService {
    private static instance;
    private static useDatabase;
    /**
     * Get the appropriate ProjectManager implementation
     * This allows for graceful transition from file-based to database-based storage
     */
    static getInstance(): ProjectManager | ProjectManagerDB;
    /**
     * Force the service to use database implementation
     * Useful after running migration
     */
    static useDatabaseImplementation(): void;
    /**
     * Check if currently using database implementation
     */
    static isUsingDatabase(): boolean;
    /**
     * Reset the instance (useful for testing)
     */
    static reset(): void;
}
//# sourceMappingURL=ProjectService.d.ts.map