#!/usr/bin/env ts-node

/**
 * Manual Test Script for Unified Data Model
 * 
 * This script demonstrates and tests all the key functionality of the unified data model:
 * - Database operations (CRUD)
 * - Data synchronization
 * - Atomic operations
 * - Backup/restore
 * - Configuration migration
 * 
 * Run with: npx ts-node src/manual-test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Import all our unified data model components
import {
  UnifiedDatabaseService,
  DatabaseFactory,
  AgentRepository,
  ProjectRepository,
  TaskRepository,
  ConfigRepository,
} from './database';

import {
  DataSyncManager,
  DataSyncClient,
  DataSyncServer,
} from './services/DataSync';

import {
  AtomicOperationsService,
  createAtomicOperationsService,
} from './services/AtomicOperations';

import {
  ConfigMigrator,
  LegacyAgentConfig,
  LegacyProjectConfig,
} from './migration/ConfigMigrator';

import {
  UnifiedAgentData,
  UnifiedProjectData,
  UnifiedTaskData,
  UnifiedConfigData,
  generateId,
  generateAgentId,
} from './index';

class ManualTester {
  private db: UnifiedDatabaseService | null = null;
  private testDir: string;
  private syncManager: DataSyncManager | null = null;
  private atomicOps: AtomicOperationsService | null = null;

  constructor() {
    this.testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magents-manual-test-'));
    console.log(`🧪 Test directory: ${this.testDir}`);
  }

  async runAllTests(): Promise<void> {
    try {
      console.log('🚀 Starting Unified Data Model Manual Tests\n');

      await this.testDatabaseOperations();
      await this.testRepositoryOperations();
      await this.testAtomicOperations();
      await this.testBackupRestore();
      await this.testDataSync();
      await this.testConfigMigration();

      console.log('\n✅ All manual tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testDatabaseOperations(): Promise<void> {
    console.log('📊 Testing Database Operations...');

    // Test database creation and initialization
    const dbPath = path.join(this.testDir, 'test.db');
    this.db = await DatabaseFactory.create({ dbPath });

    console.log('  ✓ Database created and initialized');

    // Test database stats
    const stats = this.db.getStats();
    console.log(`  ✓ Database stats:`, {
      version: stats.version,
      path: stats.path,
      readOnly: stats.readOnly,
    });

    // Test raw SQL execution
    const result = this.db.execute('SELECT COUNT(*) as count FROM agents');
    console.log(`  ✓ Agent count: ${result}`);

    console.log('  📊 Database operations test completed\n');
  }

  async testRepositoryOperations(): Promise<void> {
    console.log('🗃️  Testing Repository Operations...');

    if (!this.db) throw new Error('Database not initialized');

    const agentRepo = new AgentRepository(this.db);
    const projectRepo = new ProjectRepository(this.db);
    const taskRepo = new TaskRepository(this.db);
    const configRepo = new ConfigRepository(this.db);

    // Test project creation
    const project: UnifiedProjectData = {
      id: 'test-project-1',
      name: 'Test Project',
      path: '/test/project',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      agentIds: [],
      maxAgents: 5,
      taskMasterEnabled: true,
      tags: ['test', 'demo'],
      metadata: { framework: 'typescript' },
    };

    projectRepo.create(project);
    console.log('  ✓ Project created');

    // Test agent creation
    const agent: UnifiedAgentData = {
      id: generateAgentId('test-agent'),
      name: 'Test Agent',
      projectId: project.id,
      status: 'STOPPED',
      mode: 'docker',
      branch: 'main',
      worktreePath: '/test/worktree',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: ['3000:3000'],
      dockerVolumes: ['/host:/container'],
      environmentVars: { NODE_ENV: 'test' },
      assignedTasks: [],
      tags: ['test'],
      metadata: { createdBy: 'manual-test' },
    };

    agentRepo.create(agent);
    console.log('  ✓ Agent created');

    // Test task creation
    const task: UnifiedTaskData = {
      id: generateId(),
      projectId: project.id,
      title: 'Test Task',
      description: 'A test task for manual testing',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedToAgentId: agent.id,
      subtaskIds: [],
      dependencies: [],
      tags: ['test'],
      metadata: { complexity: 'low' },
    };

    taskRepo.create(task);
    console.log('  ✓ Task created');

    // Test global config
    const config: UnifiedConfigData = {
      maxAgents: 10,
      defaultMode: 'docker',
      autoAccept: false,
      docker: {
        enabled: true,
        defaultImage: 'magents:test',
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
      paths: {
        workspace: '/test/workspace',
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    configRepo.updateGlobalConfig(config);
    console.log('  ✓ Global config updated');

    // Test queries
    const allAgents = agentRepo.findAll();
    const allProjects = projectRepo.findAll();
    const allTasks = taskRepo.findAll();
    const globalConfig = configRepo.getGlobalConfig();

    console.log(`  ✓ Query results: ${allAgents.length} agents, ${allProjects.length} projects, ${allTasks.length} tasks`);
    console.log(`  ✓ Global config version: ${globalConfig?.version}`);

    // Test updates
    agentRepo.update(agent.id, { status: 'RUNNING', updatedAt: new Date() });
    const updatedAgent = agentRepo.findById(agent.id);
    console.log(`  ✓ Agent status updated to: ${updatedAgent?.status}`);

    console.log('  🗃️  Repository operations test completed\n');
  }

  async testAtomicOperations(): Promise<void> {
    console.log('⚛️  Testing Atomic Operations...');

    if (!this.db) throw new Error('Database not initialized');

    this.atomicOps = createAtomicOperationsService(this.db);

    // Test batch agent creation
    const agents: UnifiedAgentData[] = [
      {
        id: 'batch-agent-1',
        name: 'Batch Agent 1',
        projectId: 'test-project-1',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'feature/batch-1',
        worktreePath: '/batch/1',
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
        id: 'batch-agent-2',
        name: 'Batch Agent 2',
        projectId: 'test-project-1',
        status: 'STOPPED',
        mode: 'docker',
        branch: 'feature/batch-2',
        worktreePath: '/batch/2',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoAccept: true,
        dockerPorts: [],
        dockerVolumes: [],
        environmentVars: {},
        assignedTasks: [],
        tags: [],
        metadata: {},
      },
    ];

    const batchResult = await this.atomicOps.bulkAgentOperations({ create: agents });
    console.log(`  ✓ Batch operation result: ${batchResult.operationsApplied} applied, success: ${batchResult.success}`);

    // Test savepoints
    this.atomicOps.createSavepoint('test_savepoint');
    console.log('  ✓ Savepoint created');

    this.atomicOps.releaseSavepoint('test_savepoint');
    console.log('  ✓ Savepoint released');

    console.log('  ⚛️  Atomic operations test completed\n');
  }

  async testBackupRestore(): Promise<void> {
    console.log('💾 Testing Backup/Restore...');

    if (!this.atomicOps || !this.db) throw new Error('Services not initialized');

    try {
      // Test backup creation
      const backupMetadata = await this.atomicOps.createBackup('Manual test backup');
      console.log(`  ✓ Backup created: ${backupMetadata.id} (${backupMetadata.size} bytes)`);

      // Test backup history
      const history = this.atomicOps.getBackupHistory();
      console.log(`  ✓ Backup history retrieved: ${history.length} backups`);

      // Test backup cleanup (dry run)
      await this.atomicOps.cleanupOldBackups(30, 5);
      console.log('  ✓ Backup cleanup completed');

      console.log('  💾 Backup/restore test completed\n');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot backup in-memory database')) {
        console.log('  ⚠️  Skipping backup test (in-memory database not supported)');
      } else {
        throw error;
      }
    }
  }

  async testDataSync(): Promise<void> {
    console.log('🔄 Testing Data Synchronization...');

    if (!this.db) throw new Error('Database not initialized');

    // Create sync manager
    this.syncManager = new DataSyncManager(this.db);

    // Test sync stats
    const stats = this.syncManager.getStats();
    console.log(`  ✓ Sync stats: ${stats.eventsProcessed} events processed`);

    // Test manual sync events
    const testAgent: UnifiedAgentData = {
      id: 'sync-test-agent',
      name: 'Sync Test Agent',
      projectId: 'test-project-1',
      status: 'STOPPED',
      mode: 'docker',
      branch: 'sync-test',
      worktreePath: '/sync/test',
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

    this.syncManager.syncAgentChange('create', testAgent);
    console.log('  ✓ Agent sync event triggered');

    console.log('  🔄 Data synchronization test completed\n');
  }

  async testConfigMigration(): Promise<void> {
    console.log('🔄 Testing Configuration Migration...');

    if (!this.db) throw new Error('Database not initialized');

    // Create legacy config files for testing
    const legacyDir = path.join(this.testDir, 'legacy');
    fs.mkdirSync(legacyDir, { recursive: true });

    // Create legacy agent config
    const legacyAgents: LegacyAgentConfig[] = [
      {
        id: 'legacy-agent-1',
        name: 'Legacy Agent 1',
        project: 'legacy-project',
        status: 'running',
        mode: 'docker',
        port: 3001,
        volumes: ['/legacy:/container'],
        environment: { LEGACY: 'true' },
      },
      {
        name: 'Legacy Agent 2',
        project: 'legacy-project',
        status: 'stopped',
        mode: 'local',
      },
    ];

    fs.writeFileSync(
      path.join(legacyDir, 'agents.json'),
      JSON.stringify(legacyAgents, null, 2)
    );

    // Create legacy project config
    const legacyProjects: LegacyProjectConfig[] = [
      {
        name: 'Legacy Project',
        path: '/legacy/project',
        agents: ['legacy-agent-1', 'legacy-agent-2'],
        settings: {
          maxAgents: 3,
          taskMasterEnabled: true,
        },
        metadata: { framework: 'legacy' },
      },
    ];

    fs.writeFileSync(
      path.join(legacyDir, 'projects.json'),
      JSON.stringify(legacyProjects, null, 2)
    );

    // Test migration
    const migrator = new ConfigMigrator(this.db);
    
    // Test dry run first
    const dryRunResult = await migrator.migrateAll({
      sourceDirectory: legacyDir,
      dryRun: true,
    });

    console.log(`  ✓ Dry run completed: ${dryRunResult.success}`);

    // Test actual migration
    const migrationResult = await migrator.migrateAll({
      sourceDirectory: legacyDir,
      validateAfterMigration: true,
    });

    console.log(`  ✓ Migration completed: ${migrationResult.migratedAgents} agents, ${migrationResult.migratedProjects} projects`);
    console.log(`  ✓ Migration errors: ${migrationResult.errors.length}`);

    console.log('  🔄 Configuration migration test completed\n');
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');

    if (this.syncManager) {
      await this.syncManager.stop();
    }

    if (this.db) {
      await this.db.close();
    }

    // Clean up test directory
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true });
    }

    console.log('  ✓ Cleanup completed');
  }
}

// Run the manual test if this file is executed directly
if (require.main === module) {
  const tester = new ManualTester();
  tester.runAllTests().catch((error) => {
    console.error('❌ Manual test failed:', error);
    process.exit(1);
  });
}

export default ManualTester;