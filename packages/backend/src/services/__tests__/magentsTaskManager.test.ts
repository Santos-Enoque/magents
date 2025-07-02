import { MagentsTaskManager, ProjectType, SimplifiedTask } from '../magentsTaskManager';
import { TaskMasterIntegrationService } from '../taskMasterIntegration';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Mock dependencies
jest.mock('../taskMasterIntegration');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  },
}));
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn((cmd, opts, callback) => {
    if (callback) callback(null, { stdout: '', stderr: '' });
  }),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

describe('MagentsTaskManager', () => {
  let manager: MagentsTaskManager;
  let mockTaskMasterService: jest.Mocked<TaskMasterIntegrationService>;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new MagentsTaskManager();
    mockTaskMasterService = (manager as any).taskMasterService;
  });

  describe('quickStart', () => {
    const projectPath = '/test/project';
    const projectName = 'Test Project';

    it('should skip initialization if Task Master is already configured', async () => {
      mockTaskMasterService.detectTaskMaster.mockResolvedValue({
        isConfigured: true,
        hasActiveTasks: true,
      });

      const result = await manager.quickStart({ projectPath });

      expect(result).toEqual({
        success: true,
        message: 'Task Master is already configured for this project',
      });
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should initialize Task Master and auto-generate PRD', async () => {
      mockTaskMasterService.detectTaskMaster.mockResolvedValue({
        isConfigured: false,
        hasActiveTasks: false,
      });

      mockFs.readdir.mockResolvedValue(['package.json', 'src', 'tests'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        name: 'test-project',
        dependencies: {
          express: '^4.0.0',
          react: '^18.0.0',
        },
      }));
      mockFs.stat.mockImplementation((path) => {
        const name = path.toString().split('/').pop();
        return Promise.resolve({
          isDirectory: () => !name?.includes('.'),
          isFile: () => name?.includes('.'),
        } as any);
      });

      const result = await manager.quickStart({ projectPath, projectName, autoDetectType: true });

      expect(mockExecSync).toHaveBeenCalledWith('task-master init', { cwd: projectPath });
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('task-master parse-prd'),
        { cwd: projectPath }
      );
      expect(result).toEqual({
        success: true,
        message: 'Task Master initialized successfully',
      });
    });

    it('should handle errors gracefully', async () => {
      mockTaskMasterService.detectTaskMaster.mockRejectedValue(new Error('Detection failed'));

      const result = await manager.quickStart({ projectPath });

      expect(result).toEqual({
        success: false,
        message: 'Something went wrong: Detection failed',
      });
    });
  });

  describe('autoAnalyze', () => {
    const projectPath = '/test/project';

    it('should run complexity analysis and expand tasks', async () => {
      mockTaskMasterService.getTasks.mockResolvedValue([
        {
          id: '1',
          title: 'Task 1',
          status: 'pending' as const,
          priority: 'high' as const,
          description: 'Test task',
          dependencies: [],
        },
        {
          id: '1.1',
          title: 'Subtask 1.1',
          status: 'pending' as const,
          priority: 'medium' as const,
          description: 'Test subtask',
          dependencies: [],
        },
      ]);

      const result = await manager.autoAnalyze(projectPath);

      expect(mockExecSync).toHaveBeenCalledWith('task-master analyze-complexity', { cwd: projectPath });
      expect(mockExecSync).toHaveBeenCalledWith('task-master expand --all', { cwd: projectPath });
      expect(result).toEqual({
        success: true,
        message: 'Analysis complete. 2 tasks created.',
        taskCount: 2,
      });
    });

    it('should handle analysis errors', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = await manager.autoAnalyze(projectPath);

      expect(result).toEqual({
        success: false,
        message: 'Task Master is not installed. Please install it first.',
      });
    });
  });

  describe('getSimplifiedTasks', () => {
    const projectPath = '/test/project';

    it('should return simplified task list', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Main Task',
          status: 'pending' as const,
          priority: 'high' as const,
          description: 'A main task',
          dependencies: [],
        },
        {
          id: '1.1',
          title: 'Subtask',
          status: 'in-progress' as const,
          priority: 'medium' as const,
          description: 'A subtask',
          dependencies: ['1'],
        },
      ];

      mockTaskMasterService.getTasks.mockResolvedValue(mockTasks);

      const result = await manager.getSimplifiedTasks(projectPath);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        title: 'Main Task',
        status: 'pending',
        priority: 'high',
        isSubtask: false,
        description: 'A main task',
      });
      expect(result[1]).toEqual({
        id: '1.1',
        title: 'Subtask',
        status: 'in-progress',
        priority: 'medium',
        isSubtask: true,
        parentId: '1',
        description: 'A subtask',
      });
    });

    it('should use cached data within TTL', async () => {
      mockTaskMasterService.getTasks.mockResolvedValue([]);

      // First call
      await manager.getSimplifiedTasks(projectPath);
      // Second call (should use cache)
      await manager.getSimplifiedTasks(projectPath);

      expect(mockTaskMasterService.getTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNextTask', () => {
    const projectPath = '/test/project';

    it('should return the next pending main task', async () => {
      mockTaskMasterService.getTasks.mockResolvedValue([
        {
          id: '1',
          title: 'Completed Task',
          status: 'done' as const,
          priority: 'high' as const,
          description: '',
          dependencies: [],
        },
        {
          id: '2',
          title: 'Pending Task',
          status: 'pending' as const,
          priority: 'medium' as const,
          description: '',
          dependencies: [],
        },
        {
          id: '2.1',
          title: 'Pending Subtask',
          status: 'pending' as const,
          priority: 'low' as const,
          description: '',
          dependencies: [],
        },
      ]);

      const result = await manager.getNextTask(projectPath);

      expect(result).toEqual({
        id: '2',
        title: 'Pending Task',
        status: 'pending',
        priority: 'medium',
        isSubtask: false,
        description: '',
      });
    });

    it('should return null if no pending tasks', async () => {
      mockTaskMasterService.getTasks.mockResolvedValue([
        {
          id: '1',
          title: 'Done Task',
          status: 'done' as const,
          priority: 'high' as const,
          description: '',
          dependencies: [],
        },
      ]);

      const result = await manager.getNextTask(projectPath);

      expect(result).toBeNull();
    });
  });

  describe('createSimpleTask', () => {
    const projectPath = '/test/project';

    it('should create a task with minimal input', async () => {
      const createdTask = {
        id: '3',
        title: 'New Task',
        status: 'pending' as const,
        priority: 'medium' as const,
        description: '',
        dependencies: [],
      };

      mockTaskMasterService.createTask.mockResolvedValue(createdTask);

      const result = await manager.createSimpleTask(projectPath, 'New Task');

      expect(mockTaskMasterService.createTask).toHaveBeenCalledWith(
        projectPath,
        'New Task',
        '',
        'medium'
      );
      expect(result).toEqual({
        id: '3',
        title: 'New Task',
        status: 'pending',
        priority: 'medium',
        isSubtask: false,
        description: '',
      });
    });
  });

  describe('detectProjectType', () => {
    it('should detect Node.js project with npm', async () => {
      mockFs.readdir.mockResolvedValue(['package.json', 'node_modules'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        dependencies: {
          express: '^4.0.0',
          react: '^18.0.0',
        },
        devDependencies: {
          '@nestjs/core': '^9.0.0',
        },
      }));

      const result = await (manager as any).detectProjectType('/test/node-project');

      expect(result).toEqual({
        type: 'node',
        packageManager: 'npm',
        frameworks: expect.arrayContaining(['express', 'react', 'nestjs']),
      });
      expect(result.frameworks).toHaveLength(3);
    });

    it('should detect Python project', async () => {
      mockFs.readdir.mockResolvedValue(['requirements.txt', 'app.py'] as any);
      mockFs.readFile.mockResolvedValue('django==4.0.0\nflask==2.0.0\n');

      const result = await (manager as any).detectProjectType('/test/python-project');

      expect(result).toEqual({
        type: 'python',
        packageManager: 'pip',
        frameworks: ['django', 'flask'],
      });
    });

    it('should detect Java Maven project', async () => {
      mockFs.readdir.mockResolvedValue(['pom.xml', 'src'] as any);

      const result = await (manager as any).detectProjectType('/test/java-project');

      expect(result).toEqual({
        type: 'java',
        packageManager: 'maven',
        frameworks: [],
      });
    });

    it('should detect Rust project', async () => {
      mockFs.readdir.mockResolvedValue(['Cargo.toml', 'src'] as any);

      const result = await (manager as any).detectProjectType('/test/rust-project');

      expect(result).toEqual({
        type: 'rust',
        packageManager: 'cargo',
        frameworks: [],
      });
    });

    it('should detect Go project', async () => {
      mockFs.readdir.mockResolvedValue(['go.mod', 'main.go'] as any);

      const result = await (manager as any).detectProjectType('/test/go-project');

      expect(result).toEqual({
        type: 'go',
        frameworks: [],
      });
    });

    it('should return unknown for unrecognized projects', async () => {
      mockFs.readdir.mockResolvedValue(['random.txt'] as any);

      const result = await (manager as any).detectProjectType('/test/unknown-project');

      expect(result).toEqual({
        type: 'unknown',
        frameworks: [],
      });
    });
  });

  describe('generatePRDFromProject', () => {
    it('should generate PRD content based on project type', async () => {
      const projectType: ProjectType = {
        type: 'node',
        packageManager: 'npm',
        frameworks: ['express', 'react'],
      };

      mockFs.readdir.mockResolvedValue(['src', 'tests', 'package.json'] as any);
      mockFs.stat.mockImplementation((path) => {
        const name = path.toString().split('/').pop();
        return Promise.resolve({
          isDirectory: () => name === 'src' || name === 'tests',
          isFile: () => name === 'package.json',
        } as any);
      });

      const prd = await (manager as any).generatePRDFromProject(
        '/test/project',
        projectType,
        'My Project'
      );

      expect(prd).toContain('Product Requirements Document');
      expect(prd).toContain('My Project');
      expect(prd).toContain('node project using npm');
      expect(prd).toContain('Frameworks: express, react');
      expect(prd).toContain('Implementation Tasks');
    });
  });

  describe('error translation', () => {
    it('should translate common errors to user-friendly messages', () => {
      const testCases = [
        { error: 'command not found', expected: 'Task Master is not installed. Please install it first.' },
        { error: 'ENOENT', expected: 'Project directory not found. Please check the path.' },
        { error: 'already initialized', expected: 'Task Master is already set up for this project.' },
        { error: 'no tasks found', expected: 'No tasks available. Try creating some tasks first.' },
        { error: 'parse error', expected: 'Could not understand the task format. Please check your input.' },
        { error: 'API error', expected: 'AI service is temporarily unavailable. Please try again later.' },
        { error: 'permission denied', expected: 'Permission denied. Please check file permissions.' },
        { error: 'unknown error xyz', expected: 'Something went wrong: unknown error xyz' },
      ];

      testCases.forEach(({ error, expected }) => {
        const result = (manager as any).translateError(new Error(error));
        expect(result).toBe(expected);
      });
    });
  });

  describe('caching', () => {
    it('should cache and retrieve data within TTL', () => {
      const testData = { test: 'data' };
      (manager as any).setCache('test-key', testData);

      const retrieved = (manager as any).getCached('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache', () => {
      const testData = { test: 'data' };
      (manager as any).cache.set('test-key', {
        data: testData,
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      });

      const retrieved = (manager as any).getCached('test-key');
      expect(retrieved).toBeNull();
    });

    it('should clear project-specific cache', () => {
      (manager as any).setCache('tasks-/project1', { data: 1 });
      (manager as any).setCache('other-/project1', { data: 2 });
      (manager as any).setCache('tasks-/project2', { data: 3 });

      (manager as any).clearProjectCache('/project1');

      expect((manager as any).cache.has('tasks-/project1')).toBe(false);
      expect((manager as any).cache.has('other-/project1')).toBe(false);
      expect((manager as any).cache.has('tasks-/project2')).toBe(true);
    });
  });

  describe('simplifyTask', () => {
    it('should simplify main task correctly', () => {
      const task = {
        id: '1',
        title: 'Main Task',
        status: 'pending' as const,
        priority: 'high' as const,
        description: 'Description',
        dependencies: [],
      };

      const simplified = (manager as any).simplifyTask(task);

      expect(simplified).toEqual({
        id: '1',
        title: 'Main Task',
        status: 'pending',
        priority: 'high',
        isSubtask: false,
        description: 'Description',
      });
    });

    it('should simplify subtask with parent ID', () => {
      const task = {
        id: '1.2.3',
        title: 'Deep Subtask',
        status: 'in-progress' as const,
        description: 'Description',
        dependencies: ['1.2'],
      };

      const simplified = (manager as any).simplifyTask(task);

      expect(simplified).toEqual({
        id: '1.2.3',
        title: 'Deep Subtask',
        status: 'in-progress',
        priority: 'medium',
        isSubtask: true,
        parentId: '1.2',
        description: 'Description',
      });
    });
  });
});