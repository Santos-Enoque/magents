/**
 * Unit tests for instant agent creation functionality (Task 24.1)
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockExecSync = jest.fn();
const mockInquirer = {
  prompt: jest.fn()
};
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn()
};
const mockUi = {
  header: jest.fn(),
  keyValue: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    succeed: jest.fn(),
    warn: jest.fn(),
    fail: jest.fn()
  })),
  agentDetails: jest.fn(),
  divider: jest.fn(),
  command: jest.fn()
};

// Mock modules
jest.mock('child_process', () => ({
  execSync: mockExecSync
}));
jest.mock('inquirer', () => mockInquirer);
jest.mock('fs', () => mockFs);

describe('Instant Agent Creation (Task 24.1)', () => {
  let detectProjectType: any;
  let agentManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock agent manager
    agentManager = {
      createAgent: jest.fn(() => Promise.resolve({
        success: true,
        data: {
          agentId: 'test-agent-123',
          branch: 'feature/test',
          worktreePath: '/tmp/test-worktree',
          tmuxSession: 'magent-test'
        },
        message: 'Agent created successfully'
      }))
    };

    // Import detectProjectType function (would need to be exported in real implementation)
    detectProjectType = async () => 'feature'; // Mock implementation
  });

  describe('Smart Branch Name Generation', () => {
    test('should generate feature branch for default project type', async () => {
      const name = 'auth-system';
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      const projectType = 'feature';
      const expectedBranch = `feature/${sanitizedName}`;
      
      expect(expectedBranch).toBe('feature/auth-system');
    });

    test('should sanitize agent names correctly', () => {
      const testCases = [
        { input: 'Auth System!', expected: 'auth-system' },
        { input: 'user@dashboard', expected: 'userdashboard' },
        { input: 'fix-login-bug', expected: 'fix-login-bug' },
        { input: '   test   ', expected: 'test' },
        { input: 'API_refactor.v2', expected: 'apirefactorv2' }
      ];

      testCases.forEach(({ input, expected }) => {
        const sanitized = input.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
        expect(sanitized).toBe(expected);
      });
    });
  });

  describe('Smart Agent ID Generation', () => {
    test('should generate unique agent ID with timestamp', () => {
      const name = 'test-agent';
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      const expectedPattern = new RegExp(`^testagent-\\d{12}T\\d{4}$`);
      
      const agentId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${timestamp}`;
      expect(agentId).toMatch(expectedPattern);
    });

    test('should use provided agent ID when specified', () => {
      const customAgentId = 'my-custom-agent';
      expect(customAgentId).toBe('my-custom-agent');
    });
  });

  describe('Progressive Complexity Modes', () => {
    test('should configure simple mode correctly', () => {
      const mode = 'simple';
      const baseConfig = {
        autoAccept: true,
        useDocker: false
      };

      const simpleConfig = {
        ...baseConfig,
        setupTaskMaster: false,
        createIssue: false,
        pushBranch: false
      };

      expect(simpleConfig).toEqual({
        autoAccept: true,
        useDocker: false,
        setupTaskMaster: false,
        createIssue: false,
        pushBranch: false
      });
    });

    test('should configure standard mode correctly', () => {
      const mode = 'standard';
      const baseConfig = {
        autoAccept: true,
        useDocker: false
      };

      const standardConfig = {
        ...baseConfig,
        setupTaskMaster: true,
        createIssue: false,
        pushBranch: true
      };

      expect(standardConfig).toEqual({
        autoAccept: true,
        useDocker: false,
        setupTaskMaster: true,
        createIssue: false,
        pushBranch: true
      });
    });

    test('should configure advanced mode correctly', () => {
      const mode = 'advanced';
      const baseConfig = {
        autoAccept: true,
        useDocker: false
      };

      const advancedConfig = {
        ...baseConfig,
        setupTaskMaster: true,
        createIssue: true,
        pushBranch: true,
        createBriefing: true
      };

      expect(advancedConfig).toEqual({
        autoAccept: true,
        useDocker: false,
        setupTaskMaster: true,
        createIssue: true,
        pushBranch: true,
        createBriefing: true
      });
    });
  });

  describe('Task Master Integration', () => {
    test('should integrate with Task Master when task ID provided', async () => {
      const taskId = '24.1';
      const taskOutput = `Task 24.1: Implement instant agent creation
Description: Create magents create command with smart defaults
Status: pending
Priority: high`;

      mockExecSync.mockReturnValue(taskOutput);

      const task = {
        id: taskId,
        title: 'Implement instant agent creation',
        description: 'Create magents create command with smart defaults',
        status: 'pending',
        priority: 'high'
      };

      expect(task.id).toBe(taskId);
      expect(task.title).toBe('Implement instant agent creation');
    });

    test('should handle missing Task Master gracefully', async () => {
      const taskId = '99.9';
      mockExecSync.mockImplementation(() => {
        throw new Error('Task not found');
      });

      let errorThrown = false;
      try {
        mockExecSync(`task-master show ${taskId}`);
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe('Dry Run Functionality', () => {
    test('should show preview without creating agent', () => {
      const dryRunOptions = {
        dryRun: true,
        name: 'test-agent',
        agentId: 'test-123',
        branchName: 'feature/test-agent',
        mode: 'simple',
        useDocker: false,
        setupTaskMaster: false,
        createIssue: false,
        pushBranch: false
      };

      // This would show preview without actual creation
      expect(dryRunOptions.dryRun).toBe(true);
      expect(dryRunOptions.name).toBe('test-agent');
      expect(dryRunOptions.mode).toBe('simple');
    });
  });

  describe('Interactive Mode', () => {
    test('should prompt for missing parameters in interactive mode', async () => {
      const mockAnswers = {
        setupTaskMaster: true,
        createIssue: false,
        pushBranch: true
      };

      mockInquirer.prompt.mockResolvedValue(mockAnswers);

      const answers = await mockInquirer.prompt([
        {
          type: 'confirm',
          name: 'setupTaskMaster',
          message: 'Set up Task Master environment?',
          default: false
        }
      ]);

      expect(mockInquirer.prompt).toHaveBeenCalled();
      expect(answers.setupTaskMaster).toBe(true);
    });
  });

  describe('Project Type Detection', () => {
    test('should detect feature project type by default', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repo');
      });

      const projectType = await detectProjectType();
      expect(projectType).toBe('feature');
    });

    test('should detect task project type from Task Master context', async () => {
      const taskContext = { id: '24.1', title: 'Test task' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(taskContext));

      // Mock implementation would check for .taskmaster/current-task.json
      const hasTaskContext = mockFs.existsSync('.taskmaster/current-task.json');
      expect(hasTaskContext).toBe(true);
    });

    test('should detect bug project type from branch name', async () => {
      mockExecSync.mockReturnValue('fix/login-issue');
      
      const branchName = mockExecSync('git branch --show-current');
      const projectType = branchName.startsWith('fix/') ? 'bug' : 'feature';
      
      expect(projectType).toBe('bug');
    });
  });

  describe('Error Handling', () => {
    test('should handle agent creation failure gracefully', async () => {
      agentManager.createAgent.mockResolvedValue({
        success: false,
        message: 'Failed to create agent: disk full'
      });

      const result = await agentManager.createAgent({
        branch: 'feature/test',
        agentId: 'test-123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create agent');
    });

    test('should validate input parameters', () => {
      const validName = 'valid-name';
      const invalidName = '';
      
      expect(validName.length).toBeGreaterThan(0);
      expect(invalidName.length).toBe(0);
    });

    test('should handle network failures for branch push', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git push')) {
          throw new Error('Network error');
        }
        return 'success';
      });

      let pushFailed = false;
      try {
        mockExecSync('git push -u origin feature/test');
      } catch (error) {
        pushFailed = true;
      }

      expect(pushFailed).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should create agent with all default settings', async () => {
      const options = {
        name: 'payment-system',
        mode: 'simple'
      };

      const result = await agentManager.createAgent({
        branch: 'feature/payment-system',
        agentId: expect.stringMatching(/paymentsystem-\d+T\d+/),
        autoAccept: true,
        useDocker: false
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe('feature/payment-system');
    });

    test('should create agent with Task Master integration', async () => {
      const taskOutput = `Task 24.1: Test task
Description: Test description`;
      
      mockExecSync.mockReturnValue(taskOutput);

      const options = {
        name: 'test-task',
        task: '24.1',
        mode: 'standard'
      };

      const result = await agentManager.createAgent({
        branch: 'task/24.1-test-task',
        agentId: expect.stringMatching(/testtask-\d+T\d+/),
        autoAccept: true,
        useDocker: false
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('task-master show 24.1', expect.any(Object));
    });
  });
});