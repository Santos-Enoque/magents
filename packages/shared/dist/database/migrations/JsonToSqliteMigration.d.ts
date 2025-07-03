import { BaseMigration } from './BaseMigration';
import { MigrationConfig, MigrationResult } from './types';
import { UnifiedDatabaseService } from '../index';
import { ProjectService } from '../../services/projectService';
import { ConfigService } from '../../services/configService';
/**
 * Migration class for converting JSON-based storage to SQLite database
 */
export declare class JsonToSqliteMigration extends BaseMigration {
    private db;
    private projectService;
    private configService;
    private itemCounts;
    private migratedCounts;
    constructor(db?: UnifiedDatabaseService, projectService?: ProjectService, configService?: ConfigService, config?: MigrationConfig);
    /**
     * Execute the migration
     */
    migrate(config?: MigrationConfig): Promise<MigrationResult>;
    /**
     * Count items to migrate for progress tracking
     */
    private countItems;
    /**
     * Migrate projects from JSON to database
     */
    private migrateProjects;
    /**
     * Migrate agents from JSON to database
     */
    private migrateAgents;
    /**
     * Migrate tasks (placeholder for future implementation)
     */
    private migrateTasks;
    /**
     * Convert project data to unified format
     */
    private convertProjectToUnified;
    /**
     * Convert agent data to unified format
     */
    private convertAgentToUnified;
    /**
     * Find or create project for orphaned agent
     */
    private findOrCreateProjectForAgent;
    /**
     * Rollback the migration
     */
    rollback(): Promise<void>;
    /**
     * Verify migration integrity
     */
    verify(): Promise<boolean>;
}
//# sourceMappingURL=JsonToSqliteMigration.d.ts.map