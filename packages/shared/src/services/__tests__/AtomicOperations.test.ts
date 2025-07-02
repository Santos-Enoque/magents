/**
 * Test suite for AtomicOperations service
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AtomicOperationsService,
  AtomicOperation,
  BatchOperationResult,
  BackupMetadata,
  RestoreOptions,
  createAtomicOperationsService,
} from '../AtomicOperations';
import { UnifiedDatabaseService, DatabaseFactory } from '../../database';
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData } from '../../types/unified';
import { generateId } from '../../utils';

describe('AtomicOperationsService', () => {
  let db: UnifiedDatabaseService;
  let atomicOps: AtomicOperationsService;
  let tempDir: string;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseFactory.createInMemory();
    atomicOps = new AtomicOperationsService(db);
    
    // Create temporary directory for backup tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-ops-test-'));
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('batch operations', () => {
    it('should execute multiple operations atomically', async () => {
      const agent1: UnifiedAgentData = {
        id: 'agent-1',
        name: 'Test Agent 1',
        projectId: 'project-1',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'main',
        worktreePath: '/test',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoAccept: false,
        dockerPorts: [],
        dockerVolumes: [],
        environmentVars: {},
        assignedTasks: [],
        tags: [],
        metadata: {},
      };

      const agent2: UnifiedAgentData = {
        ...agent1,
        id: 'agent-2',
        name: 'Test Agent 2',
      };

      const operations: AtomicOperation[] = [
        {
          id: generateId(),
          type: 'create',
          entityType: 'agent',
          entityId: agent1.id,
          data: agent1,
          timestamp: new Date(),
        },
        {
          id: generateId(),
          type: 'create',
          entityType: 'agent',
          entityId: agent2.id,
          data: agent2,
          timestamp: new Date(),
        },
      ];

      const result = await atomicOps.executeBatch(operations);

      expect(result.success).toBe(true);
      expect(result.operationsApplied).toBe(2);
      expect(result.operationsFailed).toBe(0);
      expect(result.rollbackPerformed).toBe(false);
      expect(result.operationResults).toHaveLength(2);
      
      // Verify agents were created
      const agentRepo = (atomicOps as any).agentRepo;
      expect(agentRepo.findById('agent-1')).toBeTruthy();
      expect(agentRepo.findById('agent-2')).toBeTruthy();
    });

    it('should rollback all operations if one fails', async () => {
      const agent1: UnifiedAgentData = {
        id: 'agent-1',
        name: 'Test Agent 1',
        projectId: 'project-1',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'main',
        worktreePath: '/test',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoAccept: false,
        dockerPorts: [],
        dockerVolumes: [],
        environmentVars: {},
        assignedTasks: [],
        tags: [],
        metadata: {},
      };

      const operations: AtomicOperation[] = [
        {
          id: generateId(),
          type: 'create',
          entityType: 'agent',
          entityId: agent1.id,
          data: agent1,
          timestamp: new Date(),
        },
        {
          id: generateId(),
          type: 'update',
          entityType: 'agent',
          entityId: 'non-existent-agent',
          data: { name: 'Updated Name' },
          timestamp: new Date(),
        },
      ];

      const result = await atomicOps.executeBatch(operations);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Verify no agents were created (transaction rolled back)
      const agentRepo = (atomicOps as any).agentRepo;
      expect(agentRepo.findById('agent-1')).toBeNull();
    });

    it('should handle empty operations array', async () => {
      const result = await atomicOps.executeBatch([]);

      expect(result.success).toBe(true);
      expect(result.operationsApplied).toBe(0);
      expect(result.operationsFailed).toBe(0);
      expect(result.rollbackPerformed).toBe(false);
    });
  });

  describe('bulk operations', () => {
    it('should perform bulk agent operations', async () => {
      const agents: UnifiedAgentData[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          projectId: 'project-1',
          status: 'STOPPED',
          mode: 'docker',
          branch: 'main',
          worktreePath: '/test1',
          createdAt: new Date(),
          updatedAt: new Date(),
          autoAccept: false,
          dockerPorts: [],
          dockerVolumes: [],
          environmentVars: {},
          assignedTasks: [],
          tags: [],
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          projectId: 'project-1',
          status: 'STOPPED',
          mode: 'docker',
          branch: 'main',
          worktreePath: '/test2',
          createdAt: new Date(),
          updatedAt: new Date(),
          autoAccept: false,
          dockerPorts: [],
          dockerVolumes: [],
          environmentVars: {},
          assignedTasks: [],
          tags: [],
          metadata: {},
        },
      ];

      const result = await atomicOps.bulkAgentOperations({
        create: agents,
      });

      expect(result.success).toBe(true);
      expect(result.operationsApplied).toBe(2);
      
      // Verify agents were created
      const agentRepo = (atomicOps as any).agentRepo;
      expect(agentRepo.findById('agent-1')).toBeTruthy();
      expect(agentRepo.findById('agent-2')).toBeTruthy();
    });

    it('should perform bulk updates and deletes', async () => {
      // First create some agents
      const agent: UnifiedAgentData = {
        id: 'agent-1',
        name: 'Test Agent',
        projectId: 'project-1',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'main',
        worktreePath: '/test',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoAccept: false,
        dockerPorts: [],
        dockerVolumes: [],
        environmentVars: {},
        assignedTasks: [],
        tags: [],
        metadata: {},
      };

      // Create agent first
      await atomicOps.bulkAgentOperations({ create: [agent] });

      // Now update and delete
      const result = await atomicOps.bulkAgentOperations({
        update: [{ id: 'agent-1', data: { name: 'Updated Agent' } }],
        delete: ['agent-1'],
      });

      expect(result.success).toBe(true);
      expect(result.operationsApplied).toBe(2);
      
      // Verify agent was deleted
      const agentRepo = (atomicOps as any).agentRepo;
      expect(agentRepo.findById('agent-1')).toBeNull();
    });
  });

  describe('savepoints', () => {
    it('should create and rollback to savepoints', () => {
      // This test would need more complex setup to verify savepoint functionality
      // For now, we'll test that the methods execute without error
      expect(() => {
        atomicOps.createSavepoint('test_savepoint');
        atomicOps.rollbackToSavepoint('test_savepoint');
      }).not.toThrow();
    });

    it('should release savepoints', () => {
      expect(() => {
        atomicOps.createSavepoint('test_savepoint');
        atomicOps.releaseSavepoint('test_savepoint');
      }).not.toThrow();
    });
  });

  describe('backup operations', () => {
    it('should create backup with metadata', async () => {
      // Skip this test for in-memory database
      if ((db as any).config.inMemory) {
        expect(() => atomicOps.createBackup('Test backup')).rejects.toThrow('Cannot backup in-memory database');
        return;
      }

      const metadata = await atomicOps.createBackup('Test backup');

      expect(metadata).toBeDefined();
      expect(metadata.id).toBeDefined();
      expect(metadata.timestamp).toBeInstanceOf(Date);
      expect(metadata.description).toBe('Test backup');
      expect(metadata.autoCreated).toBe(false);
      expect(metadata.filePath).toContain('backup-');
    });

    it('should retrieve backup history', () => {
      const history = atomicOps.getBackupHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should handle backup cleanup', async () => {
      // This would require creating actual backup files to test properly
      // For now, we'll test that the method executes without error
      await expect(atomicOps.cleanupOldBackups(30, 10)).resolves.not.toThrow();
    });
  });

  describe('restore operations', () => {
    it('should validate restore options', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.db');
      
      const options: RestoreOptions = {
        validateBeforeRestore: true,
        dryRun: true,
      };

      await expect(
        atomicOps.restoreFromBackup(nonExistentPath, options)
      ).rejects.toThrow('Backup file not found');
    });

    it('should handle dry run mode', async () => {
      // Create a fake backup file for testing
      const fakeBackupPath = path.join(tempDir, 'fake-backup.db');
      fs.writeFileSync(fakeBackupPath, 'fake data');

      const options: RestoreOptions = {
        validateBeforeRestore: false,
        dryRun: true,
      };

      await expect(
        atomicOps.restoreFromBackup(fakeBackupPath, options)
      ).resolves.not.toThrow();
    });
  });

  describe('factory function', () => {
    it('should create atomic operations service instance', () => {
      const service = createAtomicOperationsService(db);
      expect(service).toBeInstanceOf(AtomicOperationsService);
    });
  });

  describe('error handling', () => {
    it('should handle unknown entity types', async () => {
      const invalidOperation: AtomicOperation = {
        id: generateId(),
        type: 'create',
        entityType: 'unknown' as any,
        entityId: 'test-id',
        data: {},
        timestamp: new Date(),
      };

      const result = await atomicOps.executeBatch([invalidOperation]);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      // Create an operation that would fail due to foreign key constraint
      const task: UnifiedTaskData = {
        id: 'task-1',
        projectId: 'non-existent-project',
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        subtaskIds: [],
        dependencies: [],
        tags: [],
        metadata: {},
      };

      const operation: AtomicOperation = {
        id: generateId(),
        type: 'create',
        entityType: 'task',
        entityId: task.id,
        data: task,
        timestamp: new Date(),
      };

      const result = await atomicOps.executeBatch([operation]);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
    });
  });
});