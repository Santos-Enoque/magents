"use strict";
/**
 * Unified Data Model for Magents
 *
 * This module defines the unified data structures that serve as the single source of truth
 * for agent and task data shared between CLI and GUI. It replaces complex nested structures
 * with flattened, normalized schemas optimized for SQLite storage and real-time synchronization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIGRATIONS = exports.UnifiedDataValidator = exports.INDEXES = exports.TABLE_SCHEMAS = exports.DATABASE_VERSION = exports.UnifiedEventDataSchema = exports.EventTypeSchema = exports.UnifiedConfigDataSchema = exports.UnifiedTaskDataSchema = exports.TaskPrioritySchema = exports.TaskStatusSchema = exports.UnifiedProjectDataSchema = exports.ProjectStatusSchema = exports.UnifiedAgentDataSchema = exports.AgentModeSchema = exports.AgentStatusSchema = exports.EntityIdSchema = void 0;
exports.isUnifiedAgentData = isUnifiedAgentData;
exports.isUnifiedProjectData = isUnifiedProjectData;
exports.isUnifiedTaskData = isUnifiedTaskData;
exports.isUnifiedConfigData = isUnifiedConfigData;
exports.isUnifiedEventData = isUnifiedEventData;
const zod_1 = require("zod");
// ============================================================================
// Core Entity IDs
// ============================================================================
exports.EntityIdSchema = zod_1.z.string().min(1).refine((val) => val.trim().length > 0, {
    message: "Entity ID cannot be empty or whitespace only"
});
// ============================================================================
// Unified Agent Data Schema
// ============================================================================
exports.AgentStatusSchema = zod_1.z.enum(['CREATED', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR', 'SUSPENDED']);
exports.AgentModeSchema = zod_1.z.enum(['tmux', 'docker', 'hybrid']);
exports.UnifiedAgentDataSchema = zod_1.z.object({
    // Core identification
    id: exports.EntityIdSchema,
    name: zod_1.z.string().min(1),
    projectId: exports.EntityIdSchema,
    // Status and lifecycle
    status: exports.AgentStatusSchema,
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    lastAccessedAt: zod_1.z.coerce.date().optional(),
    // Execution environment
    mode: exports.AgentModeSchema,
    branch: zod_1.z.string().min(1),
    worktreePath: zod_1.z.string().min(1),
    // Tmux-specific fields
    tmuxSession: zod_1.z.string().optional(),
    // Docker-specific fields
    dockerContainer: zod_1.z.string().optional(),
    dockerImage: zod_1.z.string().optional(),
    dockerPorts: zod_1.z.array(zod_1.z.string()).default([]),
    dockerVolumes: zod_1.z.array(zod_1.z.string()).default([]),
    dockerNetwork: zod_1.z.string().optional(),
    // Configuration
    autoAccept: zod_1.z.boolean().default(false),
    portRange: zod_1.z.string().optional(), // e.g., "3000-3010"
    environmentVars: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    // Task assignment
    currentTaskId: zod_1.z.string().optional(),
    assignedTasks: zod_1.z.array(zod_1.z.string()).default([]),
    // Resource limits
    resourceLimits: zod_1.z.object({
        maxMemory: zod_1.z.string().optional(), // e.g., "1G"
        maxCpu: zod_1.z.number().optional(), // CPU cores
        maxProcesses: zod_1.z.number().optional(),
    }).optional(),
    // Metadata
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
});
// ============================================================================
// Unified Project Data Schema
// ============================================================================
exports.ProjectStatusSchema = zod_1.z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ERROR']);
exports.UnifiedProjectDataSchema = zod_1.z.object({
    // Core identification
    id: exports.EntityIdSchema,
    name: zod_1.z.string().min(1),
    path: zod_1.z.string().min(1),
    // Status and lifecycle
    status: exports.ProjectStatusSchema,
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    lastAccessedAt: zod_1.z.coerce.date().optional(),
    // Git information
    gitRepository: zod_1.z.object({
        branch: zod_1.z.string(),
        remote: zod_1.z.string().optional(),
        lastCommit: zod_1.z.string().optional(),
        isClean: zod_1.z.boolean().default(true),
    }).optional(),
    // Agent management
    agentIds: zod_1.z.array(exports.EntityIdSchema).default([]),
    maxAgents: zod_1.z.number().default(10),
    // Network configuration
    portRange: zod_1.z.object({
        start: zod_1.z.number(),
        end: zod_1.z.number(),
    }).optional(),
    dockerNetwork: zod_1.z.string().optional(),
    // Task Master integration
    taskMasterEnabled: zod_1.z.boolean().default(false),
    taskMasterConfig: zod_1.z.object({
        configPath: zod_1.z.string().optional(),
        initialized: zod_1.z.boolean().default(false),
        lastSync: zod_1.z.coerce.date().optional(),
    }).optional(),
    // Project type detection
    projectType: zod_1.z.object({
        type: zod_1.z.enum(['node', 'python', 'java', 'go', 'rust', 'unknown']),
        packageManager: zod_1.z.string().optional(),
        frameworks: zod_1.z.array(zod_1.z.string()).default([]),
        detectedAt: zod_1.z.coerce.date(),
    }).optional(),
    // Metadata
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
});
// ============================================================================
// Unified Task Data Schema
// ============================================================================
exports.TaskStatusSchema = zod_1.z.enum(['pending', 'assigned', 'in-progress', 'done', 'blocked', 'cancelled', 'deferred']);
exports.TaskPrioritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.UnifiedTaskDataSchema = zod_1.z.object({
    // Core identification
    id: exports.EntityIdSchema,
    taskMasterId: zod_1.z.string().optional(), // Original Task Master ID
    projectId: exports.EntityIdSchema,
    // Basic information
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    details: zod_1.z.string().optional(),
    // Status and priority
    status: exports.TaskStatusSchema,
    priority: exports.TaskPrioritySchema,
    // Lifecycle
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    assignedAt: zod_1.z.coerce.date().optional(),
    startedAt: zod_1.z.coerce.date().optional(),
    completedAt: zod_1.z.coerce.date().optional(),
    // Assignment
    assignedToAgentId: exports.EntityIdSchema.optional(),
    // Hierarchy
    parentTaskId: exports.EntityIdSchema.optional(),
    subtaskIds: zod_1.z.array(exports.EntityIdSchema).default([]),
    dependencies: zod_1.z.array(exports.EntityIdSchema).default([]),
    // Testing
    testStrategy: zod_1.z.string().optional(),
    testResults: zod_1.z.object({
        passed: zod_1.z.number().default(0),
        failed: zod_1.z.number().default(0),
        lastRun: zod_1.z.coerce.date().optional(),
        coverage: zod_1.z.number().optional(),
    }).optional(),
    // Metadata
    estimatedEffort: zod_1.z.number().optional(), // in hours
    actualEffort: zod_1.z.number().optional(), // in hours
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
});
// ============================================================================
// Configuration Data Schema
// ============================================================================
exports.UnifiedConfigDataSchema = zod_1.z.object({
    // Core settings
    maxAgents: zod_1.z.number().default(10),
    defaultMode: exports.AgentModeSchema.default('docker'),
    autoAccept: zod_1.z.boolean().default(false),
    // Docker settings
    docker: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        defaultImage: zod_1.z.string().default('magents:latest'),
        network: zod_1.z.string().optional(),
        resourceLimits: zod_1.z.object({
            memory: zod_1.z.string().default('1G'),
            cpu: zod_1.z.number().default(1),
        }),
    }).default({
        enabled: true,
        defaultImage: 'magents:latest',
        resourceLimits: {
            memory: '1G',
            cpu: 1,
        },
    }),
    // Port management
    ports: zod_1.z.object({
        defaultRange: zod_1.z.object({
            start: zod_1.z.number().default(3000),
            end: zod_1.z.number().default(3999),
        }),
        reservedPorts: zod_1.z.array(zod_1.z.number()).default([]),
    }).default({
        defaultRange: {
            start: 3000,
            end: 3999,
        },
        reservedPorts: [],
    }),
    // Task Master integration
    taskMaster: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        autoSync: zod_1.z.boolean().default(true),
        syncInterval: zod_1.z.number().default(30000), // milliseconds
    }).default({
        enabled: true,
        autoSync: true,
        syncInterval: 30000,
    }),
    // Paths and directories
    paths: zod_1.z.object({
        workspace: zod_1.z.string().optional(),
        dataDir: zod_1.z.string().optional(),
        tempDir: zod_1.z.string().optional(),
    }).default({}),
    // Metadata
    version: zod_1.z.string(),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
});
// ============================================================================
// Event and Sync Data Schemas
// ============================================================================
exports.EventTypeSchema = zod_1.z.enum([
    'agent.created',
    'agent.started',
    'agent.stopped',
    'agent.error',
    'agent.updated',
    'agent.deleted',
    'project.created',
    'project.updated',
    'project.deleted',
    'task.created',
    'task.assigned',
    'task.completed',
    'task.updated',
    'task.deleted',
    'config.updated',
    'sync.started',
    'sync.completed',
    'sync.error',
]);
exports.UnifiedEventDataSchema = zod_1.z.object({
    // Core identification
    id: exports.EntityIdSchema,
    type: exports.EventTypeSchema,
    // Timing
    timestamp: zod_1.z.coerce.date(),
    // Context
    entityId: exports.EntityIdSchema,
    entityType: zod_1.z.enum(['agent', 'project', 'task', 'config']),
    projectId: exports.EntityIdSchema.optional(),
    // Event data
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    previousData: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    // Source information
    source: zod_1.z.enum(['cli', 'gui', 'api', 'system', 'external']),
    userId: zod_1.z.string().optional(),
    // Metadata
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
});
// ============================================================================
// Database Schema Definitions
// ============================================================================
exports.DATABASE_VERSION = 2;
exports.TABLE_SCHEMAS = {
    agents: `
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      mode TEXT NOT NULL,
      branch TEXT NOT NULL,
      worktree_path TEXT NOT NULL,
      tmux_session TEXT,
      docker_container TEXT,
      docker_image TEXT,
      docker_ports TEXT, -- JSON array
      docker_volumes TEXT, -- JSON array
      docker_network TEXT,
      auto_accept BOOLEAN DEFAULT FALSE,
      port_range TEXT,
      environment_vars TEXT, -- JSON object
      current_task_id TEXT,
      assigned_tasks TEXT, -- JSON array
      resource_limits TEXT, -- JSON object
      description TEXT,
      tags TEXT, -- JSON array
      metadata TEXT, -- JSON object
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      last_accessed_at DATETIME,
      
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `,
    projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      git_repository TEXT, -- JSON object
      agent_ids TEXT, -- JSON array
      max_agents INTEGER DEFAULT 10,
      port_range TEXT, -- JSON object
      docker_network TEXT,
      task_master_enabled BOOLEAN DEFAULT FALSE,
      task_master_config TEXT, -- JSON object
      project_type TEXT, -- JSON object
      description TEXT,
      tags TEXT, -- JSON array
      metadata TEXT, -- JSON object
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      last_accessed_at DATETIME
    )
  `,
    tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      task_master_id TEXT,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      details TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      assigned_to_agent_id TEXT,
      parent_task_id TEXT,
      subtask_ids TEXT, -- JSON array
      dependencies TEXT, -- JSON array
      test_strategy TEXT,
      test_results TEXT, -- JSON object
      estimated_effort REAL,
      actual_effort REAL,
      tags TEXT, -- JSON array
      metadata TEXT, -- JSON object
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      assigned_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `,
    config: `
    CREATE TABLE IF NOT EXISTS config (
      id TEXT PRIMARY KEY DEFAULT 'global',
      max_agents INTEGER DEFAULT 10,
      default_mode TEXT DEFAULT 'docker',
      auto_accept BOOLEAN DEFAULT FALSE,
      docker_config TEXT, -- JSON object
      ports_config TEXT, -- JSON object
      task_master_config TEXT, -- JSON object
      paths_config TEXT, -- JSON object
      backup_metadata TEXT, -- JSON array of backup metadata
      version TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )
  `,
    events: `
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      project_id TEXT,
      data TEXT, -- JSON object
      previous_data TEXT, -- JSON object
      source TEXT NOT NULL,
      user_id TEXT,
      metadata TEXT, -- JSON object
      
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `,
    migrations: `
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      executed_at DATETIME NOT NULL
    )
  `,
};
exports.INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)',
    'CREATE INDEX IF NOT EXISTS idx_agents_mode ON agents(mode)',
    'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
    'CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_agent_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)',
    'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id)',
];
// ============================================================================
// Validation Helpers
// ============================================================================
class UnifiedDataValidator {
    static validateAgent(data) {
        return exports.UnifiedAgentDataSchema.parse(data);
    }
    static validateProject(data) {
        return exports.UnifiedProjectDataSchema.parse(data);
    }
    static validateTask(data) {
        return exports.UnifiedTaskDataSchema.parse(data);
    }
    static validateConfig(data) {
        return exports.UnifiedConfigDataSchema.parse(data);
    }
    static validateEvent(data) {
        return exports.UnifiedEventDataSchema.parse(data);
    }
    static isValidEntityId(id) {
        return exports.EntityIdSchema.safeParse(id).success;
    }
}
exports.UnifiedDataValidator = UnifiedDataValidator;
// ============================================================================
// Type Guards
// ============================================================================
function isUnifiedAgentData(data) {
    return exports.UnifiedAgentDataSchema.safeParse(data).success;
}
function isUnifiedProjectData(data) {
    return exports.UnifiedProjectDataSchema.safeParse(data).success;
}
function isUnifiedTaskData(data) {
    return exports.UnifiedTaskDataSchema.safeParse(data).success;
}
function isUnifiedConfigData(data) {
    return exports.UnifiedConfigDataSchema.safeParse(data).success;
}
function isUnifiedEventData(data) {
    return exports.UnifiedEventDataSchema.safeParse(data).success;
}
exports.MIGRATIONS = [
    {
        version: 1,
        name: 'initial_schema',
        up: [
            ...Object.values(exports.TABLE_SCHEMAS),
            ...exports.INDEXES,
        ],
        down: [
            'DROP TABLE IF EXISTS events',
            'DROP TABLE IF EXISTS tasks',
            'DROP TABLE IF EXISTS agents',
            'DROP TABLE IF EXISTS projects',
            'DROP TABLE IF EXISTS config',
            'DROP TABLE IF EXISTS migrations',
        ],
    },
    {
        version: 2,
        name: 'add_backup_metadata',
        up: [
            'ALTER TABLE config ADD COLUMN backup_metadata TEXT',
        ],
        down: [
        // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
        // For simplicity, we'll leave the column if downgrading
        ],
    },
];
//# sourceMappingURL=unified.js.map