/**
 * Unified Database Service for Magents
 *
 * This module provides SQLite database functionality with migration support,
 * connection management, and proper cleanup for the unified data model.
 */
interface Database {
    prepare(query: string): any;
    exec(query: string): any;
    close(): any;
    backup(target: Database): any;
    pragma(query: string, options?: any): any;
    transaction<T>(fn: () => T): () => T;
}
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData, UnifiedConfigData, UnifiedEventData } from '../types/unified';
export interface DatabaseConfig {
    dbPath?: string;
    inMemory?: boolean;
    readOnly?: boolean;
    timeout?: number;
    verbose?: boolean;
}
export interface DatabaseConnection {
    db: Database;
    version: number;
    path: string;
    isReadOnly: boolean;
}
export interface MigrationResult {
    success: boolean;
    fromVersion: number;
    toVersion: number;
    migrationsApplied: string[];
    errors: string[];
}
export declare class UnifiedDatabaseService {
    private connection;
    private config;
    constructor(config?: DatabaseConfig);
    /**
     * Initialize the database connection and run migrations
     */
    initialize(): Promise<DatabaseConnection>;
    /**
     * Get the current database connection
     */
    getConnection(): DatabaseConnection;
    /**
     * Run pending migrations
     */
    runMigrations(): Promise<MigrationResult>;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
    /**
     * Create a backup of the database
     */
    backup(backupPath: string): Promise<void>;
    /**
     * Restore database from backup
     */
    restore(backupPath: string): Promise<void>;
    /**
     * Execute a raw SQL query
     */
    execute(query: string, params?: any[]): any;
    /**
     * Execute a prepared statement
     */
    prepare(query: string): any;
    /**
     * Start a transaction
     */
    transaction<T>(fn: () => T): T;
    /**
     * Get database statistics
     */
    getStats(): any;
    /**
     * Get list of tables
     */
    private getTables;
    /**
     * Get current database version
     */
    private getCurrentVersion;
    /**
     * Ensure migrations table exists
     */
    private ensureMigrationsTable;
    /**
     * Get default database path
     */
    private getDefaultDbPath;
    /**
     * Check if query is a write operation
     */
    private isWriteQuery;
    /**
     * Dynamic import of better-sqlite3 to handle optional dependency
     */
    private importDatabase;
}
export declare class BaseRepository<T> {
    protected db: UnifiedDatabaseService;
    protected tableName: string;
    constructor(db: UnifiedDatabaseService, tableName: string);
    /**
     * Find record by ID
     */
    findById(id: string): T | null;
    /**
     * Find all records
     */
    findAll(): T[];
    /**
     * Find records by criteria
     */
    findBy(criteria: Partial<T>): T[];
    /**
     * Create new record
     */
    create(data: T): T;
    /**
     * Update existing record
     */
    update(id: string, data: Partial<T>): T | null;
    /**
     * Delete record by ID
     */
    delete(id: string): boolean;
    /**
     * Count records
     */
    count(): number;
    /**
     * Serialize data for database storage
     */
    protected serialize(data: T): any;
    /**
     * Deserialize data from database
     */
    protected deserialize(row: any): T;
    /**
     * Get list of fields that should be stored as JSON
     */
    protected getJsonFields(): string[];
    /**
     * Get list of fields that should be converted to Date objects
     */
    protected getDateFields(): string[];
}
export declare class AgentRepository extends BaseRepository<UnifiedAgentData> {
    constructor(db: UnifiedDatabaseService);
    protected getJsonFields(): string[];
    findByProject(projectId: string): UnifiedAgentData[];
    findByStatus(status: string): UnifiedAgentData[];
}
export declare class ProjectRepository extends BaseRepository<UnifiedProjectData> {
    constructor(db: UnifiedDatabaseService);
    protected getJsonFields(): string[];
    protected deserialize(row: any): UnifiedProjectData;
    findByStatus(status: string): UnifiedProjectData[];
    findByPath(path: string): UnifiedProjectData | null;
}
export declare class TaskRepository extends BaseRepository<UnifiedTaskData> {
    constructor(db: UnifiedDatabaseService);
    protected getJsonFields(): string[];
    findByProject(projectId: string): UnifiedTaskData[];
    findByAgent(agentId: string): UnifiedTaskData[];
    findByStatus(status: string): UnifiedTaskData[];
    findSubtasks(parentTaskId: string): UnifiedTaskData[];
}
export declare class ConfigRepository extends BaseRepository<UnifiedConfigData> {
    constructor(db: UnifiedDatabaseService);
    protected getJsonFields(): string[];
    getGlobalConfig(): UnifiedConfigData | null;
    updateGlobalConfig(config: Partial<UnifiedConfigData>): UnifiedConfigData | null;
}
export declare class EventRepository extends BaseRepository<UnifiedEventData> {
    constructor(db: UnifiedDatabaseService);
    protected getJsonFields(): string[];
    findByEntity(entityId: string): UnifiedEventData[];
    findByType(type: string): UnifiedEventData[];
    findRecent(limit?: number): UnifiedEventData[];
}
export declare class DatabaseFactory {
    private static instances;
    static create(config?: DatabaseConfig): Promise<UnifiedDatabaseService>;
    static createInMemory(): Promise<UnifiedDatabaseService>;
    static closeAll(): Promise<void>;
}
export declare const createDatabase: typeof DatabaseFactory.create;
export declare const createInMemoryDatabase: typeof DatabaseFactory.createInMemory;
export {};
//# sourceMappingURL=index.d.ts.map