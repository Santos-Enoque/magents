import {
  UnifiedDataValidator,
  UnifiedAgentData,
  UnifiedProjectData,
  UnifiedTaskData,
  UnifiedConfigData,
  UnifiedEventData,
  isUnifiedAgentData,
  isUnifiedProjectData,
  isUnifiedTaskData,
  isUnifiedConfigData,
  isUnifiedEventData,
} from '../unified';

describe('Unified Data Schemas', () => {
  describe('UnifiedAgentData', () => {
    const validAgentData: UnifiedAgentData = {
      id: 'agent-123',
      name: 'Test Agent',
      projectId: 'project-456',
      status: 'RUNNING',
      mode: 'docker',
      branch: 'feature/test',
      worktreePath: '/path/to/worktree',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: ['3000:3000'],
      dockerVolumes: ['/host:/container'],
      environmentVars: {},
      assignedTasks: [],
      tags: [],
      metadata: {},
    };

    it('should validate correct agent data', () => {
      expect(() => UnifiedDataValidator.validateAgent(validAgentData)).not.toThrow();
      expect(isUnifiedAgentData(validAgentData)).toBe(true);
    });

    it('should reject agent data with invalid status', () => {
      const invalidData = { ...validAgentData, status: 'INVALID_STATUS' };
      expect(() => UnifiedDataValidator.validateAgent(invalidData)).toThrow();
      expect(isUnifiedAgentData(invalidData)).toBe(false);
    });

    it('should reject agent data with missing required fields', () => {
      const invalidData = { ...validAgentData };
      delete (invalidData as any).id;
      expect(() => UnifiedDataValidator.validateAgent(invalidData)).toThrow();
      expect(isUnifiedAgentData(invalidData)).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const minimalData = {
        id: 'agent-minimal',
        name: 'Minimal Agent',
        projectId: 'project-minimal',
        status: 'CREATED' as const,
        mode: 'tmux' as const,
        branch: 'main',
        worktreePath: '/minimal/path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(() => UnifiedDataValidator.validateAgent(minimalData)).not.toThrow();
      expect(isUnifiedAgentData(minimalData)).toBe(true);
    });
  });

  describe('UnifiedProjectData', () => {
    const validProjectData: UnifiedProjectData = {
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

    it('should validate correct project data', () => {
      expect(() => UnifiedDataValidator.validateProject(validProjectData)).not.toThrow();
      expect(isUnifiedProjectData(validProjectData)).toBe(true);
    });

    it('should reject project data with invalid status', () => {
      const invalidData = { ...validProjectData, status: 'INVALID_STATUS' };
      expect(() => UnifiedDataValidator.validateProject(invalidData)).toThrow();
      expect(isUnifiedProjectData(invalidData)).toBe(false);
    });

    it('should handle git repository information', () => {
      const dataWithGit = {
        ...validProjectData,
        gitRepository: {
          branch: 'main',
          remote: 'origin',
          lastCommit: 'abc123',
          isClean: true,
        },
      };
      
      expect(() => UnifiedDataValidator.validateProject(dataWithGit)).not.toThrow();
      expect(isUnifiedProjectData(dataWithGit)).toBe(true);
    });

    it('should handle project type detection', () => {
      const dataWithType = {
        ...validProjectData,
        projectType: {
          type: 'node' as const,
          packageManager: 'npm',
          frameworks: ['express', 'react'],
          detectedAt: new Date(),
        },
      };
      
      expect(() => UnifiedDataValidator.validateProject(dataWithType)).not.toThrow();
      expect(isUnifiedProjectData(dataWithType)).toBe(true);
    });
  });

  describe('UnifiedTaskData', () => {
    const validTaskData: UnifiedTaskData = {
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

    it('should validate correct task data', () => {
      expect(() => UnifiedDataValidator.validateTask(validTaskData)).not.toThrow();
      expect(isUnifiedTaskData(validTaskData)).toBe(true);
    });

    it('should reject task data with invalid status', () => {
      const invalidData = { ...validTaskData, status: 'INVALID_STATUS' };
      expect(() => UnifiedDataValidator.validateTask(invalidData)).toThrow();
      expect(isUnifiedTaskData(invalidData)).toBe(false);
    });

    it('should reject task data with invalid priority', () => {
      const invalidData = { ...validTaskData, priority: 'INVALID_PRIORITY' };
      expect(() => UnifiedDataValidator.validateTask(invalidData)).toThrow();
      expect(isUnifiedTaskData(invalidData)).toBe(false);
    });

    it('should handle task hierarchy', () => {
      const dataWithHierarchy = {
        ...validTaskData,
        parentTaskId: 'parent-task-456',
        subtaskIds: ['subtask-789', 'subtask-101'],
        dependencies: ['dep-task-111'],
      };
      
      expect(() => UnifiedDataValidator.validateTask(dataWithHierarchy)).not.toThrow();
      expect(isUnifiedTaskData(dataWithHierarchy)).toBe(true);
    });

    it('should handle test results', () => {
      const dataWithTests = {
        ...validTaskData,
        testResults: {
          passed: 10,
          failed: 2,
          lastRun: new Date(),
          coverage: 85.5,
        },
      };
      
      expect(() => UnifiedDataValidator.validateTask(dataWithTests)).not.toThrow();
      expect(isUnifiedTaskData(dataWithTests)).toBe(true);
    });
  });

  describe('UnifiedConfigData', () => {
    const validConfigData: UnifiedConfigData = {
      maxAgents: 10,
      defaultMode: 'docker',
      autoAccept: false,
      docker: {
        enabled: true,
        defaultImage: 'magents:latest',
        resourceLimits: {
          memory: '1G',
          cpu: 1,
        },
      },
      ports: {
        defaultRange: {
          start: 3000,
          end: 3999,
        },
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

    it('should validate correct config data', () => {
      expect(() => UnifiedDataValidator.validateConfig(validConfigData)).not.toThrow();
      expect(isUnifiedConfigData(validConfigData)).toBe(true);
    });

    it('should reject config data with invalid default mode', () => {
      const invalidData = { ...validConfigData, defaultMode: 'INVALID_MODE' };
      expect(() => UnifiedDataValidator.validateConfig(invalidData)).toThrow();
      expect(isUnifiedConfigData(invalidData)).toBe(false);
    });

    it('should handle minimal config data', () => {
      const minimalData = {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(() => UnifiedDataValidator.validateConfig(minimalData)).not.toThrow();
      expect(isUnifiedConfigData(minimalData)).toBe(true);
    });
  });

  describe('UnifiedEventData', () => {
    const validEventData: UnifiedEventData = {
      id: 'event-123',
      type: 'agent.created',
      timestamp: new Date(),
      entityId: 'agent-456',
      entityType: 'agent',
      source: 'cli',
      data: {},
      metadata: {},
    };

    it('should validate correct event data', () => {
      expect(() => UnifiedDataValidator.validateEvent(validEventData)).not.toThrow();
      expect(isUnifiedEventData(validEventData)).toBe(true);
    });

    it('should reject event data with invalid type', () => {
      const invalidData = { ...validEventData, type: 'invalid.event' };
      expect(() => UnifiedDataValidator.validateEvent(invalidData)).toThrow();
      expect(isUnifiedEventData(invalidData)).toBe(false);
    });

    it('should reject event data with invalid entity type', () => {
      const invalidData = { ...validEventData, entityType: 'invalid_entity' };
      expect(() => UnifiedDataValidator.validateEvent(invalidData)).toThrow();
      expect(isUnifiedEventData(invalidData)).toBe(false);
    });

    it('should handle event with previous data', () => {
      const dataWithPrevious = {
        ...validEventData,
        previousData: { oldStatus: 'STOPPED' },
        projectId: 'project-789',
        userId: 'user-123',
      };
      
      expect(() => UnifiedDataValidator.validateEvent(dataWithPrevious)).not.toThrow();
      expect(isUnifiedEventData(dataWithPrevious)).toBe(true);
    });
  });

  describe('Entity ID validation', () => {
    it('should validate correct entity IDs', () => {
      expect(UnifiedDataValidator.isValidEntityId('agent-123')).toBe(true);
      expect(UnifiedDataValidator.isValidEntityId('project-456')).toBe(true);
      expect(UnifiedDataValidator.isValidEntityId('task-789')).toBe(true);
      expect(UnifiedDataValidator.isValidEntityId('a')).toBe(true);
    });

    it('should reject invalid entity IDs', () => {
      expect(UnifiedDataValidator.isValidEntityId('')).toBe(false);
      expect(UnifiedDataValidator.isValidEntityId('   ')).toBe(false);
    });
  });

  describe('Date handling', () => {
    it('should handle various date formats', () => {
      const dataWithStringDate = {
        id: 'test-id',
        name: 'Test',
        projectId: 'project-id',
        status: 'RUNNING' as const,
        mode: 'docker' as const,
        branch: 'main',
        worktreePath: '/path',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      
      const result = UnifiedDataValidator.validateAgent(dataWithStringDate);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle timestamp numbers', () => {
      const dataWithTimestamp = {
        id: 'test-id',
        name: 'Test',
        projectId: 'project-id',
        status: 'RUNNING' as const,
        mode: 'docker' as const,
        branch: 'main',
        worktreePath: '/path',
        createdAt: 1672531200000, // 2023-01-01T00:00:00.000Z
        updatedAt: 1672531200000,
      };
      
      const result = UnifiedDataValidator.validateAgent(dataWithTimestamp);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
});