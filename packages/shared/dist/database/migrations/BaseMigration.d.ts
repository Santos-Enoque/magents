import { Logger } from '../../utils/logger';
import { IMigration, MigrationConfig, MigrationResult, MigrationError, BackupInfo, MigrationProgressCallback } from './types';
/**
 * Base class for all migrations with common functionality
 */
export declare abstract class BaseMigration implements IMigration {
    protected logger: Logger;
    protected config: MigrationConfig;
    protected errors: MigrationError[];
    protected backups: BackupInfo[];
    protected startTime: number;
    protected progressCallback?: MigrationProgressCallback;
    constructor(name: string, config?: MigrationConfig);
    /**
     * Set progress callback for real-time updates
     */
    onProgress(callback: MigrationProgressCallback): void;
    /**
     * Main migration method to be implemented by subclasses
     */
    abstract migrate(config?: MigrationConfig): Promise<MigrationResult>;
    /**
     * Rollback method to be implemented by subclasses
     */
    abstract rollback(): Promise<void>;
    /**
     * Verify migration integrity
     */
    abstract verify(): Promise<boolean>;
    /**
     * Create backup of a file
     */
    protected createBackup(filePath: string): Promise<BackupInfo>;
    /**
     * Restore from backups
     */
    protected restoreBackups(): Promise<void>;
    /**
     * Add error to collection
     */
    protected addError(item: string, error: Error | string): void;
    /**
     * Update progress
     */
    protected updateProgress(phase: string, current: number, total: number): void;
    /**
     * Start timing
     */
    protected startTiming(): void;
    /**
     * Get elapsed time in seconds
     */
    protected getElapsedTime(): number;
    /**
     * Build migration result
     */
    protected buildResult(itemsMigrated: number): MigrationResult;
    /**
     * Log summary of migration
     */
    protected logSummary(result: MigrationResult): void;
}
//# sourceMappingURL=BaseMigration.d.ts.map