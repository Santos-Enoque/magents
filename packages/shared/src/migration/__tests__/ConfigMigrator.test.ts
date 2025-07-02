/**
 * Test suite for ConfigMigrator
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigMigrator,
  LegacyAgentConfig,
  LegacyProjectConfig,
  LegacyTaskConfig,
  LegacyGlobalConfig,
  MigrationOptions,
  createMigrator,
  runMigration,
} from '../ConfigMigrator';
import { UnifiedDatabaseService, DatabaseFactory } from '../../database';
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData, UnifiedConfigData } from '../../types/unified';

describe('ConfigMigrator', () => {
  let migrator: ConfigMigrator;
  let db: UnifiedDatabaseService;
  let tempDir: string;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseFactory.createInMemory();
    migrator = new ConfigMigrator(db);
    
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magents-migration-test-'));
  });

  afterEach(async () => {
    await db.close();
    
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('agent migration', () => {
    it('should migrate legacy agents to unified format', async () => {
      const legacyAgents: LegacyAgentConfig[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          project: 'test-project',
          branch: 'feature/test',
          worktreePath: '/path/to/worktree',
          port: 3000,
          autoAccept: true,
          status: 'running',
          mode: 'docker',
          volumes: ['/host:/container'],
          environment: { NODE_ENV: 'development' },
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          name: 'Test Agent 2',
          project: 'test-project-2',
          status: 'stopped',
          mode: 'hybrid',
        },
      ];

      // Write legacy agents config
      const agentsPath = path.join(tempDir, 'agents.json');
      fs.writeFileSync(agentsPath, JSON.stringify(legacyAgents));

      const result = await migrator.testMigrateAgents({ sourceDirectory: tempDir });

      expect(result.migratedAgents).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      // Verify agents were migrated correctly
      const migratedAgents = (migrator as any).agentRepo.findAll();
      expect(migratedAgents).toHaveLength(2);
      
      const agent1 = migratedAgents.find((a: UnifiedAgentData) => a.name === 'Test Agent 1');
      expect(agent1).toBeDefined();
      expect(agent1.status).toBe('RUNNING');
      expect(agent1.mode).toBe('docker');
      expect(agent1.dockerPorts).toEqual(['3000:3000']);
      expect(agent1.dockerVolumes).toEqual(['/host:/container']);
      expect(agent1.environmentVars).toEqual({ NODE_ENV: 'development' });
      expect(agent1.metadata.migratedFrom).toBe('legacy');

      const agent2 = migratedAgents.find((a: UnifiedAgentData) => a.name === 'Test Agent 2');
      expect(agent2).toBeDefined();
      expect(agent2.mode).toBe('hybrid');
    });

    it('should handle missing agents configuration', async () => {
      const result = await migrator.testMigrateAgents({ sourceDirectory: tempDir });

      expect(result.warnings).toContain('No legacy agents configuration found');
      expect(result.migratedAgents).toBe(0);
    });

    it('should skip existing agents when not forcing overwrite', async () => {
      const legacyAgents: LegacyAgentConfig[] = [
        {
          id: 'existing-agent',
          name: 'Existing Agent',
          project: 'test-project',
        },
      ];

      // Create existing agent
      const existingAgent: UnifiedAgentData = {
        id: 'existing-agent',
        name: 'Existing Agent',
        projectId: 'test-project',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'main',
        worktreePath: '',
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
      
      (migrator as any).agentRepo.create(existingAgent);

      // Write legacy agents config
      const agentsPath = path.join(tempDir, 'agents.json');
      fs.writeFileSync(agentsPath, JSON.stringify(legacyAgents));

      const result = await migrator.testMigrateAgents({ sourceDirectory: tempDir });

      expect(result.skipped).toContain('Agent Existing Agent already exists');
      expect(result.migratedAgents).toBe(0);
    });

    it('should handle dry run mode', async () => {
      const legacyAgents: LegacyAgentConfig[] = [
        {
          name: 'Test Agent',
          project: 'test-project',
        },
      ];

      const agentsPath = path.join(tempDir, 'agents.json');
      fs.writeFileSync(agentsPath, JSON.stringify(legacyAgents));

      await migrator.testMigrateAgents({ sourceDirectory: tempDir, dryRun: true });

      // No agents should be created in dry run
      const agents = (migrator as any).agentRepo.findAll();
      expect(agents).toHaveLength(0);
    });
  });

  describe('project migration', () => {
    it('should migrate legacy projects to unified format', async () => {
      const legacyProjects: LegacyProjectConfig[] = [
        {
          id: 'project-1',
          name: 'Test Project',
          path: '/path/to/project',
          agents: ['agent-1', 'agent-2'],
          settings: {
            maxAgents: 5,
            defaultBranch: 'main',
            taskMasterEnabled: true,
          },
          metadata: { framework: 'react' },
        },
      ];

      const projectsPath = path.join(tempDir, 'projects.json');
      fs.writeFileSync(projectsPath, JSON.stringify(legacyProjects));

      const result = await migrator.testMigrateProjects({ sourceDirectory: tempDir });

      expect(result.migratedProjects).toBe(1);
      expect(result.errors).toHaveLength(0);

      const projects = (migrator as any).projectRepo.findAll();
      expect(projects).toHaveLength(1);
      
      const project = projects[0];
      expect(project.name).toBe('Test Project');
      expect(project.path).toBe('/path/to/project');
      expect(project.agentIds).toEqual(['agent-1', 'agent-2']);
      expect(project.maxAgents).toBe(5);
      expect(project.taskMasterEnabled).toBe(true);
      expect(project.metadata.framework).toBe('react');
    });

    it('should handle missing projects configuration', async () => {
      const result = await migrator.testMigrateProjects({ sourceDirectory: tempDir });

      expect(result.warnings).toContain('No legacy projects configuration found');
      expect(result.migratedProjects).toBe(0);
    });
  });

  describe('task migration', () => {
    it('should migrate legacy tasks to unified format', async () => {
      const legacyTasks: LegacyTaskConfig[] = [
        {
          id: 'task-1',
          title: 'Test Task',
          description: 'A test task',
          status: 'in-progress',
          priority: 'high',
          assignedTo: 'agent-1',
          project: 'project-1',
          dependencies: ['task-2'],
          metadata: { category: 'frontend' },
        },
      ];

      const tasksPath = path.join(tempDir, 'tasks.json');
      fs.writeFileSync(tasksPath, JSON.stringify(legacyTasks));

      const result = await migrator.testMigrateTasks({ sourceDirectory: tempDir });

      expect(result.migratedTasks).toBe(1);
      expect(result.errors).toHaveLength(0);

      const tasks = (migrator as any).taskRepo.findAll();
      expect(tasks).toHaveLength(1);
      
      const task = tasks[0];
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('A test task');
      expect(task.status).toBe('in-progress');
      expect(task.priority).toBe('high');
      expect(task.assignedToAgentId).toBe('agent-1');
      expect(task.dependencies).toEqual(['task-2']);
    });

    it('should handle missing tasks configuration', async () => {
      const result = await migrator.testMigrateTasks({ sourceDirectory: tempDir });

      expect(result.warnings).toContain('No legacy tasks configuration found');
      expect(result.migratedTasks).toBe(0);
    });
  });

  describe('global config migration', () => {
    it('should migrate legacy global config to unified format', async () => {
      const legacyConfig: LegacyGlobalConfig = {
        version: '0.5.0',
        maxAgents: 20,
        defaultDockerImage: 'custom:latest',
        defaultPorts: {
          start: 4000,
          end: 4999,
        },
        paths: {
          workspaceRoot: '/workspace',
          logsPath: '/logs',
        },
        docker: {
          enabled: true,
          defaultResources: {
            memory: '2G',
            cpu: 2,
          },
        },
        taskMaster: {
          enabled: true,
          syncInterval: 60000,
        },
      };

      const configPath = path.join(tempDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(legacyConfig));

      const result = await migrator.testMigrateGlobalConfig({ sourceDirectory: tempDir });

      expect(result.migratedConfigs).toBe(1);
      expect(result.errors).toHaveLength(0);

      const config = (migrator as any).configRepo.getGlobalConfig();
      expect(config).toBeDefined();
      expect(config.maxAgents).toBe(20);
      expect(config.docker.defaultImage).toBe('custom:latest');
      expect(config.ports.defaultRange.start).toBe(4000);
      expect(config.docker.resourceLimits.memory).toBe('2G');
      expect(config.taskMaster.syncInterval).toBe(60000);
    });

    it('should handle missing global config', async () => {
      const result = await migrator.testMigrateGlobalConfig({ sourceDirectory: tempDir });

      expect(result.warnings).toContain('No legacy global configuration found');
      expect(result.migratedConfigs).toBe(0);
    });
  });

  describe('status mapping', () => {
    it('should map agent statuses correctly', () => {
      const testCases = [
        { input: 'active', expected: 'RUNNING' },
        { input: 'running', expected: 'RUNNING' },
        { input: 'stopped', expected: 'STOPPED' },
        { input: 'inactive', expected: 'STOPPED' },
        { input: 'error', expected: 'ERROR' },
        { input: 'failed', expected: 'ERROR' },
        { input: 'starting', expected: 'STARTING' },
        { input: 'unknown', expected: 'STOPPED' },
        { input: undefined, expected: 'STOPPED' },
      ];

      for (const testCase of testCases) {
        const result = (migrator as any).mapAgentStatus(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should map task statuses correctly', () => {
      const testCases = [
        { input: 'todo', expected: 'pending' },
        { input: 'pending', expected: 'pending' },
        { input: 'in-progress', expected: 'in-progress' },
        { input: 'active', expected: 'in-progress' },
        { input: 'done', expected: 'done' },
        { input: 'completed', expected: 'done' },
        { input: 'blocked', expected: 'blocked' },
        { input: 'cancelled', expected: 'cancelled' },
        { input: 'deferred', expected: 'deferred' },
        { input: 'unknown', expected: 'pending' },
      ];

      for (const testCase of testCases) {
        const result = (migrator as any).mapTaskStatus(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should map task priorities correctly', () => {
      const testCases = [
        { input: 'low', expected: 'low' },
        { input: 'minor', expected: 'low' },
        { input: 'medium', expected: 'medium' },
        { input: 'normal', expected: 'medium' },
        { input: 'high', expected: 'high' },
        { input: 'important', expected: 'high' },
        { input: 'critical', expected: 'critical' },
        { input: 'urgent', expected: 'critical' },
        { input: 'unknown', expected: 'medium' },
      ];

      for (const testCase of testCases) {
        const result = (migrator as any).mapTaskPriority(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('full migration', () => {
    it('should perform complete migration', async () => {
      // Create all legacy configuration files
      const legacyAgents: LegacyAgentConfig[] = [
        { name: 'Agent 1', project: 'project-1' },
        { name: 'Agent 2', project: 'project-1' },
      ];

      const legacyProjects: LegacyProjectConfig[] = [
        {
          name: 'Project 1',
          path: '/project1',
          agents: ['agent-1', 'agent-2'],
        },
      ];

      const legacyTasks: LegacyTaskConfig[] = [
        {
          title: 'Task 1',
          project: 'project-1',
          status: 'pending',
        },
      ];

      const legacyConfig: LegacyGlobalConfig = {
        maxAgents: 15,
        version: '0.9.0',
      };

      fs.writeFileSync(path.join(tempDir, 'agents.json'), JSON.stringify(legacyAgents));
      fs.writeFileSync(path.join(tempDir, 'projects.json'), JSON.stringify(legacyProjects));
      fs.writeFileSync(path.join(tempDir, 'tasks.json'), JSON.stringify(legacyTasks));
      fs.writeFileSync(path.join(tempDir, 'config.json'), JSON.stringify(legacyConfig));

      const result = await migrator.migrateAll({
        sourceDirectory: tempDir,
        includeTaskMasterData: true,
        validateAfterMigration: true,
      });

      expect(result.success).toBe(true);
      expect(result.migratedAgents).toBe(2);
      expect(result.migratedProjects).toBe(1);
      expect(result.migratedTasks).toBe(1);
      expect(result.migratedConfigs).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle dry run for full migration', async () => {
      const legacyAgents: LegacyAgentConfig[] = [
        { name: 'Agent 1', project: 'project-1' },
      ];

      fs.writeFileSync(path.join(tempDir, 'agents.json'), JSON.stringify(legacyAgents));

      const result = await migrator.migrateAll({
        sourceDirectory: tempDir,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.migratedAgents).toBe(0);
      
      // Verify no data was actually migrated
      const agents = (migrator as any).agentRepo.findAll();
      expect(agents).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON files gracefully', async () => {
      // Write invalid JSON
      const agentsPath = path.join(tempDir, 'agents.json');
      fs.writeFileSync(agentsPath, 'invalid json');

      const result = await migrator.testMigrateAgents({ sourceDirectory: tempDir });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to read legacy agents configuration');
    });

    it('should handle invalid agent data gracefully', async () => {
      const invalidAgents = [
        { name: '' }, // Invalid: empty name
      ];

      const agentsPath = path.join(tempDir, 'agents.json');
      fs.writeFileSync(agentsPath, JSON.stringify(invalidAgents));

      const result = await migrator.testMigrateAgents({ sourceDirectory: tempDir });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to migrate agent');
    });
  });
});

describe('factory functions', () => {
  let db: UnifiedDatabaseService;

  beforeEach(async () => {
    db = await DatabaseFactory.createInMemory();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create migrator instance', () => {
    const migrator = createMigrator(db);
    expect(migrator).toBeInstanceOf(ConfigMigrator);
  });

  it('should run migration', async () => {
    const result = await runMigration(db, { dryRun: true });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});