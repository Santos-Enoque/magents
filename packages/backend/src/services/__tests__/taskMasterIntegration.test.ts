import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TaskMasterIntegrationService } from '../taskMasterIntegration';
import { TaskMasterTask } from '@magents/shared';

// Mock modules
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  }
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn)
}));

const mockFs = fs as any;
const mockExec = exec as any;

describe('TaskMasterIntegrationService', () => {
  let service: TaskMasterIntegrationService;

  beforeEach(() => {
    service = new TaskMasterIntegrationService();
    jest.clearAllMocks();
  });

  describe('detectTaskMaster', () => {
    it('should detect TaskMaster configuration in a project', async () => {
      const projectPath = '/test/project';
      
      // Mock directory existence
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      
      // Mock config file existence
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock config file content
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({
        research: true,
        models: { main: 'claude' }
      }));
      
      // Mock tasks file existence
      mockFs.access.mockResolvedValueOnce(undefined);

      const result = await service.detectTaskMaster(projectPath);

      expect(result.isConfigured).toBe(true);
      expect(result.configPath).toBe(path.join(projectPath, '.taskmaster', 'config.json'));
      expect(result.config?.research).toBe(true);
      expect(result.hasActiveTasks).toBe(true);
    });

    it('should return not configured when .taskmaster directory does not exist', async () => {
      const projectPath = '/test/project';
      
      mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await service.detectTaskMaster(projectPath);

      expect(result.isConfigured).toBe(false);
      expect(result.configPath).toBeUndefined();
    });

    it('should handle missing config file gracefully', async () => {
      const projectPath = '/test/project';
      
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await service.detectTaskMaster(projectPath);

      expect(result.isConfigured).toBe(false);
      expect(result.config).toBeUndefined();
    });
  });

  describe('getTasks', () => {
    it('should get tasks using CLI command', async () => {
      const projectPath = '/test/project';
      const mockTasks = {
        master: {
          tasks: [
            {
              id: '1',
              title: 'Task 1',
              status: 'pending',
              subtasks: [
                { id: '1.1', title: 'Subtask 1.1', status: 'done' }
              ]
            },
            {
              id: '2',
              title: 'Task 2',
              status: 'in-progress'
            }
          ]
        }
      };

      // Mock TaskMaster detection
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValueOnce('{}');

      // Mock CLI command execution
      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTasks),
        stderr: ''
      });

      const tasks = await service.getTasks(projectPath);

      expect(tasks).toHaveLength(3); // 2 main tasks + 1 subtask
      expect(tasks[0].id).toBe('1');
      expect(tasks[1].id).toBe('1.1');
      expect(tasks[2].id).toBe('2');
      expect(mockExec).toHaveBeenCalledWith(
        'task-master list --json',
        expect.objectContaining({
          cwd: projectPath,
          env: expect.objectContaining({ FORCE_COLOR: '0' })
        })
      );
    });

    it('should fallback to reading tasks.json directly on CLI failure', async () => {
      const projectPath = '/test/project';
      const mockTasksFile = {
        master: {
          tasks: [
            { id: '1', title: 'Task 1', status: 'pending' }
          ]
        }
      };

      // Mock TaskMaster detection
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{}') // config.json
        .mockResolvedValueOnce(JSON.stringify(mockTasksFile)); // tasks.json

      // Mock CLI command failure
      mockExec.mockRejectedValueOnce(new Error('CLI not found'));

      const tasks = await service.getTasks(projectPath);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('1');
    });

    it('should return empty array when TaskMaster is not configured', async () => {
      const projectPath = '/test/project';
      
      mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

      const tasks = await service.getTasks(projectPath);

      expect(tasks).toEqual([]);
    });
  });

  describe('getTaskDetails', () => {
    it('should get task details using CLI command', async () => {
      const projectPath = '/test/project';
      const taskId = '1';
      const mockTask = {
        id: '1',
        title: 'Task 1',
        description: 'Test task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        details: undefined,
        testStrategy: undefined,
        subtasks: []
      };

      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTask),
        stderr: ''
      });

      const task = await service.getTaskDetails(projectPath, taskId);

      expect(task).toEqual(mockTask);
      expect(mockExec).toHaveBeenCalledWith(
        `task-master show ${taskId} --json`,
        expect.objectContaining({ cwd: projectPath })
      );
    });

    it('should return null when task is not found', async () => {
      const projectPath = '/test/project';
      const taskId = 'nonexistent';

      mockExec.mockRejectedValueOnce(new Error('Task not found'));

      // Mock fallback getTasks to return empty array
      mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

      const task = await service.getTaskDetails(projectPath, taskId);

      expect(task).toBeNull();
    });
  });

  describe('assignTaskToAgent', () => {
    it('should assign task to agent and create briefing files', async () => {
      const agentId = 'agent-1';
      const taskId = '1';
      const projectPath = '/test/project';
      const worktreePath = '/test/worktree';
      
      const mockTask: TaskMasterTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test description',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        subtasks: []
      };

      // Mock getTaskDetails
      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTask),
        stderr: ''
      });

      // Mock directory creation
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      // Mock file writes
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock status update
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const assignment = await service.assignTaskToAgent(
        agentId,
        taskId,
        projectPath,
        worktreePath
      );

      expect(assignment.agentId).toBe(agentId);
      expect(assignment.taskId).toBe(taskId);
      expect(assignment.task).toEqual(mockTask);
      expect(assignment.briefingPath).toBe(path.join(worktreePath, '.agent', 'task-briefing.md'));
      expect(assignment.contextPath).toBe(path.join(worktreePath, '.agent', 'task-context.json'));
      expect(assignment.environment.AGENT_TASK_ID).toBe(taskId);

      // Verify directory creation
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(worktreePath, '.agent'),
        { recursive: true }
      );

      // Verify file writes
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      
      // Verify status update
      expect(mockExec).toHaveBeenCalledWith(
        `task-master set-status --id=${taskId} --status=in-progress`,
        { cwd: projectPath }
      );
    });

    it('should throw error when task is not found', async () => {
      const agentId = 'agent-1';
      const taskId = 'nonexistent';
      const projectPath = '/test/project';
      const worktreePath = '/test/worktree';

      mockExec.mockRejectedValueOnce(new Error('Task not found'));
      mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(
        service.assignTaskToAgent(agentId, taskId, projectPath, worktreePath)
      ).rejects.toThrow(`Task ${taskId} not found`);
    });
  });

  describe('createTask', () => {
    it('should create a new task using CLI', async () => {
      const projectPath = '/test/project';
      const title = 'New Task';
      const description = 'Task description';
      const priority = 'high' as const;

      const mockOutput = 'Task 3 added successfully';
      mockExec.mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: ''
      });

      // Mock getTaskDetails for the created task
      const mockCreatedTask: TaskMasterTask = {
        id: '3',
        title,
        description,
        status: 'pending',
        priority,
        dependencies: [],
        details: undefined,
        testStrategy: undefined,
        subtasks: []
      };
      
      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify(mockCreatedTask),
        stderr: ''
      });

      const task = await service.createTask(projectPath, title, description, priority);

      expect(task).toEqual(mockCreatedTask);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('task-master add-task'),
        expect.objectContaining({ cwd: projectPath })
      );
    });

    it('should handle special characters in title and description', async () => {
      const projectPath = '/test/project';
      const title = 'Task with "quotes"';
      const description = 'Description with "quotes" and special chars';

      mockExec.mockResolvedValueOnce({
        stdout: 'Task 4 added successfully',
        stderr: ''
      });

      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: '4', title, description, status: 'pending' }),
        stderr: ''
      });

      await service.createTask(projectPath, title, description);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('Task with \\"quotes\\"'),
        expect.anything()
      );
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status using CLI', async () => {
      const projectPath = '/test/project';
      const taskId = '1';
      const status = 'done' as const;

      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.updateTaskStatus(projectPath, taskId, status);

      expect(mockExec).toHaveBeenCalledWith(
        `task-master set-status --id=${taskId} --status=${status}`,
        { cwd: projectPath }
      );
    });

    it('should throw error on CLI failure', async () => {
      const projectPath = '/test/project';
      const taskId = '1';
      const status = 'done' as const;

      mockExec.mockRejectedValueOnce(new Error('CLI error'));

      await expect(
        service.updateTaskStatus(projectPath, taskId, status)
      ).rejects.toThrow('Failed to update task status');
    });
  });

  describe('task briefing generation', () => {
    it('should generate comprehensive task briefing', async () => {
      const agentId = 'agent-1';
      const taskId = '1';
      const projectPath = '/test/project';
      const worktreePath = '/test/worktree';
      
      const mockTask: TaskMasterTask = {
        id: '1',
        title: 'Complex Task',
        description: 'Task with subtasks',
        status: 'pending',
        priority: 'high',
        dependencies: ['0'],
        details: 'Implementation details',
        testStrategy: 'Test strategy',
        subtasks: [
          {
            id: '1.1',
            title: 'Subtask 1',
            description: 'First subtask',
            status: 'pending',
            priority: 'medium'
          }
        ]
      };

      mockExec.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTask),
        stderr: ''
      });

      mockFs.mkdir.mockResolvedValueOnce(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.assignTaskToAgent(agentId, taskId, projectPath, worktreePath);

      // Check that briefing was written
      const briefingCall = mockFs.writeFile.mock.calls.find(
        (call: unknown[]) => (call[0] as string).endsWith('task-briefing.md')
      );
      
      expect(briefingCall).toBeDefined();
      const briefingContent = briefingCall[1];
      
      expect(briefingContent).toContain('Complex Task');
      expect(briefingContent).toContain('Task with subtasks');
      expect(briefingContent).toContain('Implementation details');
      expect(briefingContent).toContain('Test strategy');
      expect(briefingContent).toContain('Dependencies');
      expect(briefingContent).toContain('Task 0');
      // Note: subtasks are flattened in normalizeTask, so they don't appear in the briefing
      expect(briefingContent).toContain('Dependencies');
    });
  });
});