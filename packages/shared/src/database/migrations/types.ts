/**
 * Types and interfaces for database migrations
 */

export interface MigrationConfig {
  dryRun?: boolean;
  verbose?: boolean;
  backupDir?: string;
  batchSize?: number;
}

export interface MigrationResult {
  success: boolean;
  itemsMigrated: number;
  errors: MigrationError[];
  backupPaths: string[];
  duration: number;
}

export interface MigrationError {
  item: string;
  error: string;
  stack?: string;
}

export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: string;
}

export interface MigrationProgress {
  phase: 'projects' | 'agents' | 'tasks' | 'complete';
  current: number;
  total: number;
  percentage: number;
}

export type MigrationProgressCallback = (progress: MigrationProgress) => void;

export interface IMigration {
  migrate(config?: MigrationConfig): Promise<MigrationResult>;
  rollback(): Promise<void>;
  verify(): Promise<boolean>;
}