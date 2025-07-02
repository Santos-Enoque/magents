import {
  UnifiedDatabaseService,
  DatabaseFactory,
  AgentRepository,
  ProjectRepository,
  TaskRepository,
  ConfigRepository,
  EventRepository,
} from '../index';
import {
  UnifiedAgentData,
  UnifiedProjectData,
  UnifiedTaskData,
  UnifiedConfigData,
  UnifiedEventData,
} from '../../types/unified';

// Mock better-sqlite3 since it might not be available in test environment
const mockDatabase = {
  prepare: jest.fn(),
  exec: jest.fn(),
  close: jest.fn(),
  backup: jest.fn(),
  pragma: jest.fn(),
  transaction: jest.fn(),
};

const mockStatement = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

// Mock the import function in UnifiedDatabaseService
const mockImportDatabase = jest.fn().mockResolvedValue(jest.fn(() => mockDatabase));

// Mock the better-sqlite3 module completely since it's an optional dependency
jest.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockDatabase),
  };
}, { virtual: true });

describe('UnifiedDatabaseService', () => {
  let dbService: UnifiedDatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockDatabase.pragma.mockReturnValue(undefined);
    mockDatabase.prepare.mockReturnValue(mockStatement);
    mockDatabase.transaction.mockImplementation((fn) => () => fn());
    mockDatabase.exec.mockReturnValue(undefined);
    
    mockStatement.get.mockReturnValue(null);
    mockStatement.all.mockReturnValue([]);
    mockStatement.run.mockReturnValue({ changes: 1 });

    dbService = new UnifiedDatabaseService({ inMemory: true });
    
    // Mock the private importDatabase method to return a constructor function
    (dbService as any).importDatabase = jest.fn().mockResolvedValue(function MockDatabase() {
      return mockDatabase;
    });
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.close();
    }
  });

  describe('initialization', () => {
    it('should initialize with in-memory database', async () => {
      const connection = await dbService.initialize();
      
      expect(connection).toBeDefined();
      expect(connection.path).toBe(':memory:');
      expect(connection.isReadOnly).toBe(false);
    });

    it('should enable foreign keys and set pragmas', async () => {
      await dbService.initialize();
      
      expect(mockDatabase.pragma).toHaveBeenCalledWith('foreign_keys = ON');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('synchronous = NORMAL');
    });

    it('should create tables during initialization', async () => {
      // Mock getCurrentVersion to return 0
      mockStatement.get.mockReturnValueOnce(null); // migrations table doesn't exist
      mockStatement.get.mockReturnValueOnce({ version: 0 }); // current version is 0
      
      await dbService.initialize();
      
      expect(mockDatabase.exec).toHaveBeenCalled();
    });
  });

  describe('migrations', () => {
    it('should run migrations from version 0 to current', async () => {
      // Mock initial state
      mockStatement.get
        .mockReturnValueOnce(null) // migrations table doesn't exist
        .mockReturnValueOnce({ version: 0 }); // current version is 0
      
      await dbService.initialize();
      
      const migrationResult = await dbService.runMigrations();
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.fromVersion).toBe(1);
      expect(migrationResult.toVersion).toBe(1);
    });

    it('should skip migrations if already up to date', async () => {
      // Mock current version equals target version
      mockStatement.get
        .mockReturnValueOnce({ name: 'migrations' }) // migrations table exists
        .mockReturnValueOnce({ version: 1 }); // current version is 1
      
      await dbService.initialize();
      
      const migrationResult = await dbService.runMigrations();
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.fromVersion).toBe(1);
      expect(migrationResult.toVersion).toBe(1);
      expect(migrationResult.migrationsApplied).toHaveLength(0);
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should execute raw SQL queries', () => {
      const mockResult = [{ id: '1', name: 'test' }];
      mockStatement.all.mockReturnValue(mockResult);
      
      const result = dbService.execute('SELECT * FROM test_table');
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM test_table');
      expect(mockStatement.all).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockResult);
    });

    it('should prevent write operations on read-only database', async () => {
      await dbService.close();
      
      const readOnlyService = new UnifiedDatabaseService({ 
        inMemory: true, 
        readOnly: true 
      });
      
      // Mock the importDatabase method for this instance
      (readOnlyService as any).importDatabase = jest.fn().mockResolvedValue(function MockDatabase() {
        return mockDatabase;
      });
      
      await readOnlyService.initialize();
      
      expect(() => {
        readOnlyService.execute('INSERT INTO test (id) VALUES (1)');
      }).toThrow('Write operations not allowed on read-only database');
      
      await readOnlyService.close();
    });

    it('should handle transactions', () => {
      const mockFn = jest.fn().mockReturnValue('result');
      
      const result = dbService.transaction(mockFn);
      
      expect(mockDatabase.transaction).toHaveBeenCalledWith(mockFn);
      expect(result).toBe('result');
    });
  });

  describe('backup and restore', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should reject backup of in-memory database', async () => {
      await expect(dbService.backup('/tmp/backup.db')).rejects.toThrow(
        'Cannot backup in-memory database'
      );
    });

    it('should handle backup errors gracefully', async () => {
      await dbService.close();
      
      const fileService = new UnifiedDatabaseService({ 
        dbPath: '/tmp/test.db' 
      });
      
      // Mock the importDatabase method for this instance
      (fileService as any).importDatabase = jest.fn().mockResolvedValue(function MockDatabase() {
        return mockDatabase;
      });
      
      await fileService.initialize();
      
      mockDatabase.backup.mockImplementation(() => {
        throw new Error('Backup failed');
      });
      
      await expect(fileService.backup('/tmp/backup.db')).rejects.toThrow(
        'Database backup failed: Backup failed'
      );
      
      await fileService.close();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    it('should return database statistics', () => {
      mockDatabase.pragma
        .mockReturnValueOnce(100) // page_count
        .mockReturnValueOnce(4096) // page_size
        .mockReturnValueOnce(10) // freelist_count
        .mockReturnValueOnce('wal') // journal_mode
        .mockReturnValueOnce(1); // foreign_keys
      
      mockStatement.all.mockReturnValue([
        { name: 'agents' },
        { name: 'projects' },
        { name: 'tasks' }
      ]);
      
      const stats = dbService.getStats();
      
      expect(stats).toMatchObject({
        path: ':memory:',
        isReadOnly: false,
        pageCount: 100,
        pageSize: 4096,
        freelistCount: 10,
        walMode: 'wal',
        foreignKeys: 1,
        tables: ['agents', 'projects', 'tasks'],
      });
    });
  });
});

describe('Repository Classes', () => {
  let dbService: UnifiedDatabaseService;
  let agentRepo: AgentRepository;
  let projectRepo: ProjectRepository;
  let taskRepo: TaskRepository;
  let configRepo: ConfigRepository;
  let eventRepo: EventRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockDatabase.pragma.mockReturnValue(undefined);
    mockDatabase.prepare.mockReturnValue(mockStatement);
    mockDatabase.transaction.mockImplementation((fn) => () => fn());
    mockDatabase.exec.mockReturnValue(undefined);
    
    mockStatement.get.mockReturnValue(null);
    mockStatement.all.mockReturnValue([]);
    mockStatement.run.mockReturnValue({ changes: 1 });

    dbService = new UnifiedDatabaseService({ inMemory: true });
    
    // Mock the private importDatabase method to return a constructor function
    (dbService as any).importDatabase = jest.fn().mockResolvedValue(function MockDatabase() {
      return mockDatabase;
    });
    
    await dbService.initialize();
    
    agentRepo = new AgentRepository(dbService);
    projectRepo = new ProjectRepository(dbService);
    taskRepo = new TaskRepository(dbService);
    configRepo = new ConfigRepository(dbService);
    eventRepo = new EventRepository(dbService);
  });

  afterEach(async () => {
    await dbService.close();
  });

  describe('AgentRepository', () => {
    const mockAgent: UnifiedAgentData = {
      id: 'agent-123',
      name: 'Test Agent',
      projectId: 'project-456',
      status: 'RUNNING',
      mode: 'docker',
      branch: 'main',
      worktreePath: '/path/to/worktree',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: ['3000:3000'],
      dockerVolumes: [],
      environmentVars: {},
      assignedTasks: [],
      tags: [],
      metadata: {},
    };

    it('should find agent by ID', () => {
      const mockRow = { ...mockAgent, docker_ports: '["3000:3000"]' };
      mockStatement.get.mockReturnValue(mockRow);
      
      const result = agentRepo.findById('agent-123');
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM agents WHERE id = ?');
      expect(mockStatement.get).toHaveBeenCalledWith('agent-123');
      expect(result).toBeDefined();
      expect(result?.dockerPorts).toEqual(['3000:3000']);
    });

    it('should find agents by project', () => {
      const mockRows = [{ ...mockAgent, docker_ports: '[]' }];
      mockStatement.all.mockReturnValue(mockRows);
      
      const result = agentRepo.findByProject('project-456');
      
      expect(result).toHaveLength(1);
    });

    it('should create new agent', () => {
      const result = agentRepo.create(mockAgent);
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agents')
      );
      expect(mockStatement.run).toHaveBeenCalled();
      expect(result).toEqual(mockAgent);
    });

    it('should update existing agent', () => {
      mockStatement.get.mockReturnValue({ ...mockAgent, docker_ports: '[]' });
      
      const updates = { status: 'STOPPED' as const };
      const result = agentRepo.update('agent-123', updates);
      
      expect(result?.status).toBe('STOPPED');
    });

    it('should delete agent', () => {
      const result = agentRepo.delete('agent-123');
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith('DELETE FROM agents WHERE id = ?');
      expect(mockStatement.run).toHaveBeenCalledWith('agent-123');
      expect(result).toBe(true);
    });
  });

  describe('ProjectRepository', () => {
    const mockProject: UnifiedProjectData = {
      id: 'project-123',
      name: 'Test Project',
      path: '/path/to/project',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      agentIds: [],
      maxAgents: 10,
      taskMasterEnabled: false,
      tags: [],
      metadata: {},
    };

    it('should find project by path', () => {
      const mockRow = { ...mockProject, agent_ids: '[]' };
      mockStatement.get.mockReturnValue(mockRow);
      
      const result = projectRepo.findByPath('/path/to/project');
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM projects WHERE path = ?');
      expect(result).toBeDefined();
    });

    it('should handle JSON deserialization', () => {
      const mockRow = {
        ...mockProject,
        agent_ids: '["agent-1", "agent-2"]',
        tags: '["frontend", "api"]',
        metadata: '{"framework": "react"}',
        git_repository: '{}',
        port_range: '{}',
        task_master_config: '{}',
        project_type: '{}',
      };
      mockStatement.get.mockReturnValue(mockRow);
      
      const result = projectRepo.findById('project-123');
      
      expect(result?.agentIds).toEqual(['agent-1', 'agent-2']);
      expect(result?.tags).toEqual(['frontend', 'api']);
      expect(result?.metadata).toEqual({ framework: 'react' });
    });
  });

  describe('TaskRepository', () => {
    const mockTask: UnifiedTaskData = {
      id: 'task-123',
      projectId: 'project-456',
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

    it('should find tasks by project', () => {
      const mockRows = [{ ...mockTask, subtask_ids: '[]' }];
      mockStatement.all.mockReturnValue(mockRows);
      
      const result = taskRepo.findByProject('project-456');
      
      expect(result).toHaveLength(1);
    });

    it('should find subtasks', () => {
      const mockRows = [{ ...mockTask, subtask_ids: '[]' }];
      mockStatement.all.mockReturnValue(mockRows);
      
      const result = taskRepo.findSubtasks('parent-task-123');
      
      expect(result).toHaveLength(1);
    });
  });

  describe('ConfigRepository', () => {
    const mockConfig: UnifiedConfigData = {
      maxAgents: 10,
      defaultMode: 'docker',
      autoAccept: false,
      docker: {
        enabled: true,
        defaultImage: 'magents:latest',
        resourceLimits: { memory: '1G', cpu: 1 },
      },
      ports: {
        defaultRange: { start: 3000, end: 3999 },
        reservedPorts: [],
      },
      taskMaster: {
        enabled: true,
        autoSync: true,
        syncInterval: 30000,
      },
      paths: {},
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get global config', () => {
      const mockRow = { ...mockConfig, docker_config: '{}' };
      mockStatement.get.mockReturnValue(mockRow);
      
      const result = configRepo.getGlobalConfig();
      
      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM config WHERE id = ?');
      expect(mockStatement.get).toHaveBeenCalledWith('global');
      expect(result).toBeDefined();
    });

    it('should update global config', () => {
      mockStatement.get.mockReturnValue({ ...mockConfig, docker_config: '{}' });
      
      const updates = { maxAgents: 20 };
      const result = configRepo.updateGlobalConfig(updates);
      
      expect(result?.maxAgents).toBe(20);
    });
  });

  describe('EventRepository', () => {
    const mockEvent: UnifiedEventData = {
      id: 'event-123',
      type: 'agent.created',
      timestamp: new Date(),
      entityId: 'agent-456',
      entityType: 'agent',
      source: 'cli',
      data: {},
      metadata: {},
    };

    it('should find events by entity', () => {
      const mockRows = [{ ...mockEvent, data: '{}' }];
      mockStatement.all.mockReturnValue(mockRows);
      
      const result = eventRepo.findByEntity('agent-456');
      
      expect(result).toHaveLength(1);
    });

    it('should find recent events', () => {
      const mockRows = [{ ...mockEvent, data: '{}', metadata: '{}' }];
      mockStatement.all.mockReturnValue(mockRows);
      
      const result = eventRepo.findRecent(50);
      
      // Check that the recent events query was made (it should be the last prepare call)
      const prepareCalls = mockDatabase.prepare.mock.calls;
      const lastCall = prepareCalls[prepareCalls.length - 1];
      expect(lastCall[0].replace(/\s+/g, ' ')).toContain('ORDER BY timestamp DESC LIMIT');
      expect(mockStatement.all).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseFactory', () => {
  afterEach(async () => {
    await DatabaseFactory.closeAll();
  });

  it('should create database instances', async () => {
    // Mock the importDatabase method for factory instances
    jest.spyOn(UnifiedDatabaseService.prototype as any, 'importDatabase')
      .mockResolvedValue(function MockDatabase() {
        return mockDatabase;
      });
    
    const db1 = await DatabaseFactory.create({ inMemory: true });
    const db2 = await DatabaseFactory.create({ inMemory: true });
    
    // Should return the same instance for same config
    const db3 = await DatabaseFactory.create({ inMemory: true });
    
    expect(db1).toBeDefined();
    expect(db2).toBeDefined();
    expect(db3).toBeDefined();
  });

  it('should create in-memory database', async () => {
    // Mock the importDatabase method for factory instances
    jest.spyOn(UnifiedDatabaseService.prototype as any, 'importDatabase')
      .mockResolvedValue(function MockDatabase() {
        return mockDatabase;
      });
    
    const db = await DatabaseFactory.createInMemory();
    
    expect(db).toBeDefined();
    const connection = db.getConnection();
    expect(connection.path).toBe(':memory:');
  });

  it('should close all instances', async () => {
    // Mock the importDatabase method for factory instances
    jest.spyOn(UnifiedDatabaseService.prototype as any, 'importDatabase')
      .mockResolvedValue(function MockDatabase() {
        return mockDatabase;
      });
    
    const db1 = await DatabaseFactory.create({ inMemory: true });
    const db2 = await DatabaseFactory.create({ dbPath: '/tmp/test2.db' });
    
    const closeSpy1 = jest.spyOn(db1, 'close').mockResolvedValue();
    const closeSpy2 = jest.spyOn(db2, 'close').mockResolvedValue();
    
    await DatabaseFactory.closeAll();
    
    expect(closeSpy1).toHaveBeenCalled();
    expect(closeSpy2).toHaveBeenCalled();
  });
});