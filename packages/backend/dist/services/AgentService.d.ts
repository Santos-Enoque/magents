import { AgentManager } from '@magents/cli';
import { AgentManagerDB } from './AgentManagerDB';
/**
 * AgentService factory that provides the appropriate implementation
 * based on whether the database has been initialized
 */
export declare class AgentService {
    private static instance;
    private static useDatabase;
    /**
     * Get the appropriate AgentManager implementation
     * This allows for graceful transition from CLI-only to database-backed storage
     */
    static getInstance(): AgentManagerDB | AgentManager;
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
//# sourceMappingURL=AgentService.d.ts.map