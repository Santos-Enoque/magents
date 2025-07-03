import { UnifiedDatabaseService } from '@magents/shared';
/**
 * Backend Database Service for managing database connections and initialization
 * This service handles the lifecycle of database connections for the backend
 */
export declare class DatabaseService {
    private static instance;
    private db;
    private initialized;
    private healthCheckInterval?;
    private constructor();
    static getInstance(): DatabaseService;
    /**
     * Initialize database connection and migrate services if database exists
     */
    initialize(): Promise<void>;
    /**
     * Check if database is available and initialized
     */
    isAvailable(): boolean;
    /**
     * Get database health status
     */
    getHealthStatus(): Promise<{
        status: 'healthy' | 'unhealthy' | 'unavailable';
        message: string;
        details?: any;
    }>;
    /**
     * Get database statistics
     */
    getStatistics(): Promise<{
        projects: number;
        agents: number;
        configs: number;
        dbSize: number;
        dbPath: string;
    }>;
    /**
     * Force migration from file-based to database storage
     */
    forceMigration(): Promise<void>;
    /**
     * Start periodic health checks
     */
    private startHealthCheck;
    /**
     * Stop health checks
     */
    private stopHealthCheck;
    /**
     * Gracefully shutdown database connections
     */
    shutdown(): Promise<void>;
    /**
     * Execute a transaction across multiple operations
     */
    executeTransaction<T>(operations: (db: UnifiedDatabaseService) => Promise<T>): Promise<T>;
    /**
     * Get the underlying database service (for advanced usage)
     */
    getDatabase(): UnifiedDatabaseService;
    /**
     * Reset database service (useful for testing)
     */
    static reset(): void;
}
//# sourceMappingURL=DatabaseService.d.ts.map