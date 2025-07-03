import { BaseMigration } from '../BaseMigration';
import { MigrationConfig, MigrationResult } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock concrete implementation for testing
class TestMigration extends BaseMigration {
  constructor(config?: MigrationConfig) {
    super('Test', config);
  }

  async migrate(config?: MigrationConfig): Promise<MigrationResult> {
    this.startTiming();
    
    // Simulate migration
    this.updateProgress('test', 1, 2);
    this.updateProgress('test', 2, 2);
    
    return this.buildResult(2);
  }

  async rollback(): Promise<void> {
    await this.restoreBackups();
  }

  async verify(): Promise<boolean> {
    return true;
  }
}

describe('BaseMigration', () => {
  const testDir = path.join(__dirname, 'test-data');
  const backupDir = path.join(testDir, 'backups');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(backupDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const migration = new TestMigration();
      expect(migration).toBeDefined();
    });

    it('should merge custom config', () => {
      const migration = new TestMigration({ 
        dryRun: true, 
        verbose: true,
        backupDir 
      });
      expect(migration['config'].dryRun).toBe(true);
      expect(migration['config'].verbose).toBe(true);
      expect(migration['config'].backupDir).toBe(backupDir);
    });
  });

  describe('createBackup', () => {
    it('should create backup file', async () => {
      const migration = new TestMigration({ backupDir });
      const testFile = path.join(testDir, 'test.json');
      
      await fs.writeJson(testFile, { test: true });
      
      const backup = await migration['createBackup'](testFile);
      
      expect(backup.originalPath).toBe(testFile);
      expect(backup.backupPath).toContain('test.json');
      expect(await fs.pathExists(backup.backupPath)).toBe(true);
    });

    it('should skip backup in dry run mode', async () => {
      const migration = new TestMigration({ 
        dryRun: true, 
        backupDir 
      });
      const testFile = path.join(testDir, 'test.json');
      
      await fs.writeJson(testFile, { test: true });
      
      const backup = await migration['createBackup'](testFile);
      
      expect(backup.backupPath).toBe('');
      const backupFiles = await fs.readdir(backupDir).catch(() => []);
      expect(backupFiles.length).toBe(0);
    });
  });

  describe('restoreBackups', () => {
    it('should restore files from backups', async () => {
      const migration = new TestMigration({ backupDir });
      const testFile = path.join(testDir, 'test.json');
      const originalContent = { original: true };
      const modifiedContent = { modified: true };
      
      // Create original file
      await fs.writeJson(testFile, originalContent);
      
      // Create backup
      await migration['createBackup'](testFile);
      
      // Modify original file
      await fs.writeJson(testFile, modifiedContent);
      
      // Restore
      await migration['restoreBackups']();
      
      // Check restored content
      const restoredContent = await fs.readJson(testFile);
      expect(restoredContent).toEqual(originalContent);
    });
  });

  describe('error handling', () => {
    it('should track errors', () => {
      const migration = new TestMigration();
      
      migration['addError']('test-item', new Error('Test error'));
      migration['addError']('test-item-2', 'String error');
      
      expect(migration['errors'].length).toBe(2);
      expect(migration['errors'][0].item).toBe('test-item');
      expect(migration['errors'][0].error).toBe('Test error');
      expect(migration['errors'][1].item).toBe('test-item-2');
      expect(migration['errors'][1].error).toBe('String error');
    });
  });

  describe('progress tracking', () => {
    it('should call progress callback', () => {
      const migration = new TestMigration();
      const progressCallback = jest.fn();
      
      migration.onProgress(progressCallback);
      migration['updateProgress']('test', 1, 10);
      
      expect(progressCallback).toHaveBeenCalledWith({
        phase: 'test',
        current: 1,
        total: 10,
        percentage: 10
      });
    });
  });

  describe('timing', () => {
    it('should track elapsed time', async () => {
      const migration = new TestMigration();
      
      migration['startTiming']();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const elapsed = migration['getElapsedTime']();
      expect(elapsed).toBeGreaterThan(0.1);
      expect(elapsed).toBeLessThan(0.2);
    });
  });

  describe('buildResult', () => {
    it('should build success result', async () => {
      const migration = new TestMigration();
      migration['startTiming']();
      
      // Add small delay to ensure non-zero duration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = migration['buildResult'](10);
      
      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(10);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should build failure result with errors', () => {
      const migration = new TestMigration();
      migration['startTiming']();
      migration['addError']('test', 'error');
      
      const result = migration['buildResult'](10);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});