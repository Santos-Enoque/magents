/**
 * Unified Data Model for Magents
 * 
 * This module defines the unified data structures that serve as the single source of truth
 * for agent and task data shared between CLI and GUI. It replaces complex nested structures
 * with flattened, normalized schemas optimized for SQLite storage and real-time synchronization.
 */

import { z } from 'zod';

// ============================================================================
// Core Entity IDs
// ============================================================================

export const EntityIdSchema = z.string().min(1).refine((val) => val.trim().length > 0, {
  message: "Entity ID cannot be empty or whitespace only"
});
export type EntityId = z.infer<typeof EntityIdSchema>;

// ============================================================================
// Unified Agent Data Schema
// ============================================================================

export const AgentStatusSchema = z.enum(['CREATED', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR', 'SUSPENDED']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentModeSchema = z.enum(['tmux', 'docker', 'hybrid']);
export type AgentMode = z.infer<typeof AgentModeSchema>;

export const UnifiedAgentDataSchema = z.object({
  // Core identification
  id: EntityIdSchema,
  name: z.string().min(1),
  projectId: EntityIdSchema,
  
  // Status and lifecycle
  status: AgentStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastAccessedAt: z.coerce.date().optional(),
  
  // Execution environment
  mode: AgentModeSchema,
  branch: z.string().min(1),
  worktreePath: z.string().min(1),
  
  // Tmux-specific fields
  tmuxSession: z.string().optional(),
  
  // Docker-specific fields
  dockerContainer: z.string().optional(),
  dockerImage: z.string().optional(),
  dockerPorts: z.array(z.string()).default([]),
  dockerVolumes: z.array(z.string()).default([]),
  dockerNetwork: z.string().optional(),
  
  // Configuration
  autoAccept: z.boolean().default(false),
  portRange: z.string().optional(), // e.g., "3000-3010"
  environmentVars: z.record(z.string(), z.string()).default({}),
  
  // Task assignment
  currentTaskId: z.string().optional(),
  assignedTasks: z.array(z.string()).default([]),
  
  // Resource limits
  resourceLimits: z.object({
    maxMemory: z.string().optional(), // e.g., "1G"
    maxCpu: z.number().optional(), // CPU cores
    maxProcesses: z.number().optional(),
  }).optional(),
  
  // Metadata
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type UnifiedAgentData = z.infer<typeof UnifiedAgentDataSchema>;

// ============================================================================
// Unified Project Data Schema
// ============================================================================

export const ProjectStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ERROR']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const UnifiedProjectDataSchema = z.object({
  // Core identification
  id: EntityIdSchema,
  name: z.string().min(1),
  path: z.string().min(1),
  
  // Status and lifecycle
  status: ProjectStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastAccessedAt: z.coerce.date().optional(),
  
  // Git information
  gitRepository: z.object({
    branch: z.string(),
    remote: z.string().optional(),
    lastCommit: z.string().optional(),
    isClean: z.boolean().default(true),
  }).optional(),
  
  // Agent management
  agentIds: z.array(EntityIdSchema).default([]),
  maxAgents: z.number().default(10),
  
  // Network configuration
  portRange: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
  dockerNetwork: z.string().optional(),
  
  // Task Master integration
  taskMasterEnabled: z.boolean().default(false),
  taskMasterConfig: z.object({
    configPath: z.string().optional(),
    initialized: z.boolean().default(false),
    lastSync: z.coerce.date().optional(),
  }).optional(),
  
  // Project type detection
  projectType: z.object({
    type: z.enum(['node', 'python', 'java', 'go', 'rust', 'unknown']),
    packageManager: z.string().optional(),
    frameworks: z.array(z.string()).default([]),
    detectedAt: z.coerce.date(),
  }).optional(),
  
  // Metadata
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type UnifiedProjectData = z.infer<typeof UnifiedProjectDataSchema>;

// ============================================================================
// Unified Task Data Schema
// ============================================================================

export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in-progress', 'done', 'blocked', 'cancelled', 'deferred']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const UnifiedTaskDataSchema = z.object({
  // Core identification
  id: EntityIdSchema,
  taskMasterId: z.string().optional(), // Original Task Master ID
  projectId: EntityIdSchema,
  
  // Basic information
  title: z.string().min(1),
  description: z.string().optional(),
  details: z.string().optional(),
  
  // Status and priority
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  
  // Lifecycle
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  assignedAt: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  
  // Assignment
  assignedToAgentId: EntityIdSchema.optional(),
  
  // Hierarchy
  parentTaskId: EntityIdSchema.optional(),
  subtaskIds: z.array(EntityIdSchema).default([]),
  dependencies: z.array(EntityIdSchema).default([]),
  
  // Testing
  testStrategy: z.string().optional(),
  testResults: z.object({
    passed: z.number().default(0),
    failed: z.number().default(0),
    lastRun: z.coerce.date().optional(),
    coverage: z.number().optional(),
  }).optional(),
  
  // Metadata
  estimatedEffort: z.number().optional(), // in hours
  actualEffort: z.number().optional(), // in hours
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type UnifiedTaskData = z.infer<typeof UnifiedTaskDataSchema>;

// ============================================================================
// Configuration Data Schema
// ============================================================================

export const UnifiedConfigDataSchema = z.object({
  // Core settings
  maxAgents: z.number().default(10),
  defaultMode: AgentModeSchema.default('docker'),
  autoAccept: z.boolean().default(false),
  
  // Docker settings
  docker: z.object({
    enabled: z.boolean().default(true),
    defaultImage: z.string().default('magents:latest'),
    network: z.string().optional(),
    resourceLimits: z.object({
      memory: z.string().default('1G'),
      cpu: z.number().default(1),
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
  ports: z.object({
    defaultRange: z.object({
      start: z.number().default(3000),
      end: z.number().default(3999),
    }),
    reservedPorts: z.array(z.number()).default([]),
  }).default({
    defaultRange: {
      start: 3000,
      end: 3999,
    },
    reservedPorts: [],
  }),
  
  // Task Master integration
  taskMaster: z.object({
    enabled: z.boolean().default(true),
    autoSync: z.boolean().default(true),
    syncInterval: z.number().default(30000), // milliseconds
  }).default({
    enabled: true,
    autoSync: true,
    syncInterval: 30000,
  }),
  
  // Paths and directories
  paths: z.object({
    workspace: z.string().optional(),
    dataDir: z.string().optional(),
    tempDir: z.string().optional(),
  }).default({}),
  
  // Metadata
  version: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UnifiedConfigData = z.infer<typeof UnifiedConfigDataSchema>;

// ============================================================================
// Event and Sync Data Schemas
// ============================================================================

export const EventTypeSchema = z.enum([
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

export type EventType = z.infer<typeof EventTypeSchema>;

export const UnifiedEventDataSchema = z.object({
  // Core identification
  id: EntityIdSchema,
  type: EventTypeSchema,
  
  // Timing
  timestamp: z.coerce.date(),
  
  // Context
  entityId: EntityIdSchema,
  entityType: z.enum(['agent', 'project', 'task', 'config']),
  projectId: EntityIdSchema.optional(),
  
  // Event data
  data: z.record(z.string(), z.any()).default({}),
  previousData: z.record(z.string(), z.any()).optional(),
  
  // Source information
  source: z.enum(['cli', 'gui', 'api', 'system', 'external']),
  userId: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).default({}),
});

export type UnifiedEventData = z.infer<typeof UnifiedEventDataSchema>;

// ============================================================================
// Database Schema Definitions
// ============================================================================

export const DATABASE_VERSION = 1;

export const TABLE_SCHEMAS = {
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
} as const;

export const INDEXES = [
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
] as const;

// ============================================================================
// Validation Helpers
// ============================================================================

export class UnifiedDataValidator {
  static validateAgent(data: unknown): UnifiedAgentData {
    return UnifiedAgentDataSchema.parse(data);
  }
  
  static validateProject(data: unknown): UnifiedProjectData {
    return UnifiedProjectDataSchema.parse(data);
  }
  
  static validateTask(data: unknown): UnifiedTaskData {
    return UnifiedTaskDataSchema.parse(data);
  }
  
  static validateConfig(data: unknown): UnifiedConfigData {
    return UnifiedConfigDataSchema.parse(data);
  }
  
  static validateEvent(data: unknown): UnifiedEventData {
    return UnifiedEventDataSchema.parse(data);
  }
  
  static isValidEntityId(id: string): boolean {
    return EntityIdSchema.safeParse(id).success;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isUnifiedAgentData(data: unknown): data is UnifiedAgentData {
  return UnifiedAgentDataSchema.safeParse(data).success;
}

export function isUnifiedProjectData(data: unknown): data is UnifiedProjectData {
  return UnifiedProjectDataSchema.safeParse(data).success;
}

export function isUnifiedTaskData(data: unknown): data is UnifiedTaskData {
  return UnifiedTaskDataSchema.safeParse(data).success;
}

export function isUnifiedConfigData(data: unknown): data is UnifiedConfigData {
  return UnifiedConfigDataSchema.safeParse(data).success;
}

export function isUnifiedEventData(data: unknown): data is UnifiedEventData {
  return UnifiedEventDataSchema.safeParse(data).success;
}

// ============================================================================
// Migration Helpers
// ============================================================================

export interface MigrationDefinition {
  version: number;
  name: string;
  up: string[];
  down: string[];
}

export const MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: [
      ...Object.values(TABLE_SCHEMAS),
      ...INDEXES,
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
];