import { Logger } from '../../utils/logger';
import { 
  IMigration, 
  MigrationConfig, 
  MigrationResult, 
  MigrationError,
  BackupInfo,
  MigrationProgressCallback 
} from './types';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Base class for all migrations with common functionality
 */
export abstract class BaseMigration implements IMigration {
  protected logger: Logger;
  protected config: MigrationConfig;
  protected errors: MigrationError[] = [];
  protected backups: BackupInfo[] = [];
  protected startTime: number = 0;
  protected progressCallback?: MigrationProgressCallback;

  constructor(name: string, config: MigrationConfig = {}) {
    this.logger = new Logger(`Migration:${name}`);
    this.config = {
      dryRun: false,
      verbose: false,
      backupDir: path.join(process.env.HOME || '', '.magents', 'backups'),
      batchSize: 100,
      ...config
    };
  }

  /**
   * Set progress callback for real-time updates
   */
  onProgress(callback: MigrationProgressCallback): void {
    this.progressCallback = callback;
  }

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
  protected async createBackup(filePath: string): Promise<BackupInfo> {
    if (this.config.dryRun) {
      this.logger.info(`[DRY RUN] Would backup: ${filePath}`);
      return {
        originalPath: filePath,
        backupPath: '',
        timestamp: new Date().toISOString()
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}.${timestamp}.backup`;
    const backupPath = path.join(this.config.backupDir!, backupFileName);

    await fs.ensureDir(this.config.backupDir!);
    await fs.copy(filePath, backupPath);

    const backupInfo: BackupInfo = {
      originalPath: filePath,
      backupPath,
      timestamp
    };

    this.backups.push(backupInfo);
    this.logger.info(`Created backup: ${backupPath}`);

    return backupInfo;
  }

  /**
   * Restore from backups
   */
  protected async restoreBackups(): Promise<void> {
    for (const backup of this.backups) {
      if (await fs.pathExists(backup.backupPath)) {
        await fs.copy(backup.backupPath, backup.originalPath, { overwrite: true });
        await fs.remove(backup.backupPath);
        this.logger.info(`Restored: ${backup.originalPath}`);
      }
    }
  }

  /**
   * Add error to collection
   */
  protected addError(item: string, error: Error | string): void {
    const errorObj: MigrationError = {
      item,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    };
    this.errors.push(errorObj);
    this.logger.error(`Error migrating ${item}: ${errorObj.error}`);
  }

  /**
   * Update progress
   */
  protected updateProgress(phase: string, current: number, total: number): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    if (this.progressCallback) {
      this.progressCallback({
        phase: phase as any,
        current,
        total,
        percentage
      });
    }

    if (this.config.verbose) {
      this.logger.info(`${phase}: ${current}/${total} (${percentage}%)`);
    }
  }

  /**
   * Start timing
   */
  protected startTiming(): void {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time in seconds
   */
  protected getElapsedTime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Build migration result
   */
  protected buildResult(itemsMigrated: number): MigrationResult {
    return {
      success: this.errors.length === 0,
      itemsMigrated,
      errors: this.errors,
      backupPaths: this.backups.map(b => b.backupPath),
      duration: this.getElapsedTime()
    };
  }

  /**
   * Log summary of migration
   */
  protected logSummary(result: MigrationResult): void {
    this.logger.info('='.repeat(50));
    this.logger.info('Migration Summary:');
    this.logger.info(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    this.logger.info(`Items migrated: ${result.itemsMigrated}`);
    this.logger.info(`Errors: ${result.errors.length}`);
    this.logger.info(`Duration: ${result.duration.toFixed(2)}s`);
    this.logger.info(`Backups created: ${result.backupPaths.length}`);
    
    if (result.errors.length > 0) {
      this.logger.error('Errors encountered:');
      result.errors.forEach(err => {
        this.logger.error(`  - ${err.item}: ${err.error}`);
      });
    }
    
    this.logger.info('='.repeat(50));
  }
}