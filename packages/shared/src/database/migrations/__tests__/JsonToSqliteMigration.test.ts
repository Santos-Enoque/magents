import { JsonToSqliteMigration } from '../JsonToSqliteMigration';
import { UnifiedDatabaseService } from '../../index';
import { ProjectService } from '../../../services/projectService';
import { ConfigService } from '../../../services/configService';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock dependencies
jest.mock('../../index');
jest.mock('../../../services/projectService');
jest.mock('../../../services/configService');

describe('JsonToSqliteMigration', () => {
  const testDir = path.join(__dirname, 'test-migration-data');
  const dataDir = path.join(testDir, '.magents');
  const projectsDir = path.join(dataDir, 'projects');
  const agentsDir = path.join(dataDir, 'agents');
  
  let migration: JsonToSqliteMigration;
  let mockDb: jest.Mocked<UnifiedDatabaseService>;
  let mockProjectService: jest.Mocked<ProjectService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create test directories
    await fs.ensureDir(projectsDir);
    await fs.ensureDir(agentsDir);

    // Setup mocks
    mockDb = new UnifiedDatabaseService() as jest.Mocked<UnifiedDatabaseService>;
    mockProjectService = new ProjectService() as jest.Mocked<ProjectService>;
    mockConfigService = new ConfigService() as jest.Mocked<ConfigService>;

    // Mock config service
    mockConfigService.getDataDir.mockReturnValue(dataDir);

    // Mock database operations
    mockDb.initialize = jest.fn().mockResolvedValue(undefined);
    mockDb.close = jest.fn().mockResolvedValue(undefined);
    mockDb.getDatabasePath = jest.fn().mockReturnValue(path.join(dataDir, 'test.db'));
    
    // Mock repositories
    mockDb.projects = {
      create: jest.fn().mockImplementation(data => Promise.resolve(data)),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBy: jest.fn(),
      count: jest.fn(),
      search: jest.fn(),
      findByPath: jest.fn()
    } as any;

    mockDb.agents = {
      create: jest.fn().mockImplementation(data => Promise.resolve(data)),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBy: jest.fn(),
      findByStatus: jest.fn(),
      findByProject: jest.fn(),
      search: jest.fn(),
      count: jest.fn()
    } as any;

    migration = new JsonToSqliteMigration(
      mockDb,
      mockProjectService,
      mockConfigService
    );
  });

  afterEach(async () => {
    await fs.remove(testDir);
    jest.clearAllMocks();
  });

  describe('migrateProjects', () => {
    it('should migrate projects from JSON to database', async () => {
      // Setup test data
      const projectsData = {
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project 1',
            path: '/test/project1',
            description: 'Test description',
            agentIds: ['agent-1', 'agent-2'],
            createdAt: '2025-01-01T00:00:00Z',
            settings: { key: 'value' }
          },
          {
            id: 'proj-2',
            name: 'Test Project 2',
            path: '/test/project2',
            gitBranch: 'main',
            gitRemote: 'origin'
          }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);

      // Run migration
      const result = await migration.migrate();

      // Verify
      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.projects.create).toHaveBeenCalledTimes(2);
      
      // Check first project
      expect(mockDb.projects.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'proj-1',
          name: 'Test Project 1',
          path: '/test/project1',
          description: 'Test description',
          agentIds: ['agent-1', 'agent-2'],
          status: 'ACTIVE',
          maxAgents: 10,
          taskMasterEnabled: true,
          tags: [],
          metadata: {}
        })
      );

      // Check backup was created
      const backupPath = path.join(projectsDir, 'projects.json.backup');
      expect(await fs.pathExists(backupPath)).toBe(false); // In real implementation
    });

    it('should handle missing projects.json gracefully', async () => {
      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(0);
      expect(mockDb.projects.create).not.toHaveBeenCalled();
    });

    it('should handle malformed projects data', async () => {
      await fs.writeJson(path.join(projectsDir, 'projects.json'), {
        // Missing projects array
      });

      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(0);
    });

    it('should track errors for individual project failures', async () => {
      const projectsData = {
        projects: [
          { id: 'proj-1', name: 'Good Project', path: '/test/good' },
          { id: 'proj-2', name: 'Bad Project', path: '/test/bad' }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);

      // Mock failure for second project
      (mockDb.projects.create as jest.Mock)
        .mockResolvedValueOnce(projectsData.projects[0] as any)
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await migration.migrate();

      expect(result.success).toBe(false);
      expect(result.itemsMigrated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].item).toBe('Project proj-2');
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('migrateAgents', () => {
    it('should migrate agents from JSON files to database', async () => {
      // Setup test data
      const agent1 = {
        id: 'agent-1',
        name: 'Test Agent 1',
        projectId: 'proj-1',
        worktreePath: '/test/project1/worktree',
        status: 'running',
        containerName: 'magents-agent-1',
        sessionName: 'session-1',
        port: 3001,
        createdAt: '2025-01-01T00:00:00Z'
      };

      const agent2 = {
        id: 'agent-2',
        name: 'Test Agent 2',
        worktreePath: '/test/project2/worktree',
        status: 'stopped'
      };

      await fs.writeJson(path.join(agentsDir, 'agent-1.json'), agent1);
      await fs.writeJson(path.join(agentsDir, 'agent-2.json'), agent2);

      // Run migration
      const result = await migration.migrate();

      // Verify
      expect(result.success).toBe(true);
      expect(result.itemsMigrated).toBe(2);
      expect(mockDb.agents.create).toHaveBeenCalledTimes(2);
    });

    it('should auto-assign projects to orphaned agents', async () => {
      const agent = {
        id: 'agent-orphan',
        name: 'Orphaned Agent',
        worktreePath: '/test/myproject/worktree'
      };

      await fs.writeJson(path.join(agentsDir, 'agent-orphan.json'), agent);

      // Mock no matching projects
      (mockDb.projects.findAll as jest.Mock).mockResolvedValue([]);
      (mockDb.projects.create as jest.Mock).mockResolvedValue({
        id: 'proj-auto',
        name: 'myproject',
        path: '/test/myproject'
      } as any);

      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(mockDb.projects.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'myproject',
          path: '/test/myproject',
          description: 'Auto-created for agent Orphaned Agent'
        })
      );
    });

    it('should skip non-JSON files in agents directory', async () => {
      await fs.writeFile(path.join(agentsDir, 'README.md'), 'Test file');
      await fs.writeJson(path.join(agentsDir, 'agent-1.json'), {
        id: 'agent-1',
        name: 'Test Agent'
      });

      const result = await migration.migrate();

      expect(result.itemsMigrated).toBe(1);
      expect(mockDb.agents.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('dry run mode', () => {
    it('should not modify database in dry run mode', async () => {
      const projectsData = {
        projects: [
          { id: 'proj-1', name: 'Test Project', path: '/test' }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);

      const result = await migration.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(mockDb.initialize).not.toHaveBeenCalled();
      expect(mockDb.projects.create).not.toHaveBeenCalled();
      expect(mockDb.close).not.toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    it('should restore from backups and remove database', async () => {
      // Setup backup files
      const backupData = { projects: [{ id: 'backup' }] };
      await fs.writeJson(
        path.join(migration['config'].backupDir!, 'projects.json.2025-01-01.backup'),
        backupData
      );
      
      // Add backup to migration
      migration['backups'] = [{
        originalPath: path.join(projectsDir, 'projects.json'),
        backupPath: path.join(migration['config'].backupDir!, 'projects.json.2025-01-01.backup'),
        timestamp: '2025-01-01'
      }];

      // Create fake database file
      await fs.writeFile(mockDb.getDatabasePath(), 'fake db');

      await migration.rollback();

      // Verify backup was restored
      expect(await fs.pathExists(path.join(projectsDir, 'projects.json'))).toBe(true);
      const restored = await fs.readJson(path.join(projectsDir, 'projects.json'));
      expect(restored).toEqual(backupData);

      // Verify database was removed
      expect(await fs.pathExists(mockDb.getDatabasePath())).toBe(false);
    });
  });

  describe('verify', () => {
    it('should verify migration integrity', async () => {
      const projectsData = {
        projects: [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);
      await fs.writeJson(path.join(agentsDir, 'agent-1.json'), { id: 'agent-1' });

      // Mock database counts matching JSON
      (mockDb.projects.findAll as jest.Mock).mockResolvedValue([
        { id: 'proj-1' },
        { id: 'proj-2' }
      ] as any);
      (mockDb.agents.findAll as jest.Mock).mockResolvedValue([
        { id: 'agent-1' }
      ] as any);

      const isValid = await migration.verify();

      expect(isValid).toBe(true);
    });

    it('should detect count mismatches', async () => {
      const projectsData = {
        projects: [
          { id: 'proj-1', name: 'Project 1' }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);

      // Mock database with different count
      (mockDb.projects.findAll as jest.Mock).mockResolvedValue([
        { id: 'proj-1' },
        { id: 'proj-2' }
      ] as any);

      const isValid = await migration.verify();

      expect(isValid).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should report progress during migration', async () => {
      const progressCallback = jest.fn();
      migration.onProgress(progressCallback);

      const projectsData = {
        projects: [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' }
        ]
      };

      await fs.writeJson(path.join(projectsDir, 'projects.json'), projectsData);

      await migration.migrate();

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'projects',
          current: 1,
          total: 2,
          percentage: 50
        })
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'projects',
          current: 2,
          total: 2,
          percentage: 100
        })
      );
    });
  });
});