/**
 * Configuration Migration Tool
 *
 * This tool migrates existing agent configurations, project settings, and data
 * from the legacy format to the new unified data model structure.
 */
import { UnifiedDatabaseService } from '../database';
export interface LegacyAgentConfig {
    id?: string;
    name: string;
    project?: string;
    projectPath?: string;
    branch?: string;
    worktreePath?: string;
    port?: number;
    dockerImage?: string;
    autoAccept?: boolean;
    status?: string;
    mode?: string;
    volumes?: string[];
    environment?: Record<string, string>;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface LegacyProjectConfig {
    id?: string;
    name: string;
    path: string;
    agents?: string[];
    settings?: {
        maxAgents?: number;
        defaultBranch?: string;
        autoCreateWorktrees?: boolean;
        taskMasterEnabled?: boolean;
    };
    metadata?: Record<string, any>;
}
export interface LegacyTaskConfig {
    id?: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    project?: string;
    dependencies?: string[];
    subtasks?: LegacyTaskConfig[];
    metadata?: Record<string, any>;
}
export interface LegacyGlobalConfig {
    version?: string;
    maxAgents?: number;
    defaultDockerImage?: string;
    defaultPorts?: {
        start: number;
        end: number;
    };
    paths?: {
        workspaceRoot?: string;
        logsPath?: string;
        configPath?: string;
    };
    docker?: {
        enabled?: boolean;
        defaultResources?: {
            memory?: string;
            cpu?: number;
        };
    };
    taskMaster?: {
        enabled?: boolean;
        apiUrl?: string;
        syncInterval?: number;
    };
}
export interface MigrationResult {
    success: boolean;
    migratedAgents: number;
    migratedProjects: number;
    migratedTasks: number;
    migratedConfigs: number;
    errors: string[];
    warnings: string[];
    skipped: string[];
}
export interface MigrationOptions {
    sourceDirectory?: string;
    backupExisting?: boolean;
    validateAfterMigration?: boolean;
    forceOverwrite?: boolean;
    dryRun?: boolean;
    includeTaskMasterData?: boolean;
}
export declare class ConfigMigrator {
    private db;
    private agentRepo;
    private projectRepo;
    private taskRepo;
    private configRepo;
    constructor(db: UnifiedDatabaseService);
    /**
     * Migrate legacy agent configurations (public for testing)
     */
    testMigrateAgents(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Migrate legacy project configurations (public for testing)
     */
    testMigrateProjects(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Migrate legacy task configurations (public for testing)
     */
    testMigrateTasks(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Migrate legacy global configuration (public for testing)
     */
    testMigrateGlobalConfig(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Migrate all legacy configurations to the unified format
     */
    migrateAll(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Migrate legacy agent configurations
     */
    private migrateAgents;
    /**
     * Migrate legacy project configurations
     */
    private migrateProjects;
    /**
     * Migrate legacy task configurations
     */
    private migrateTasks;
    /**
     * Migrate legacy global configuration
     */
    private migrateGlobalConfig;
    /**
     * Convert legacy agent to unified format
     */
    private convertLegacyAgent;
    /**
     * Convert legacy project to unified format
     */
    private convertLegacyProject;
    /**
     * Convert legacy task to unified format
     */
    private convertLegacyTask;
    /**
     * Convert legacy global config to unified format
     */
    private convertLegacyGlobalConfig;
    /**
     * Map legacy agent status to unified format
     */
    private mapAgentStatus;
    /**
     * Map legacy agent mode to unified format
     */
    private mapAgentMode;
    /**
     * Map legacy task status to unified format
     */
    private mapTaskStatus;
    /**
     * Map legacy task priority to unified format
     */
    private mapTaskPriority;
    /**
     * Create backup of existing unified database
     */
    private createBackup;
    /**
     * Validate migration results
     */
    private validateMigration;
    /**
     * Get default source directory for legacy configurations
     */
    private getDefaultSourceDirectory;
    /**
     * Get backup file path
     */
    private getBackupPath;
    /**
     * Log migration summary
     */
    private logMigrationSummary;
}
export declare const createMigrator: (db: UnifiedDatabaseService) => ConfigMigrator;
export declare const runMigration: (db: UnifiedDatabaseService, options?: MigrationOptions) => Promise<MigrationResult>;
//# sourceMappingURL=ConfigMigrator.d.ts.map