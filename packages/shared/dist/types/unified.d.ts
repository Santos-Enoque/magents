/**
 * Unified Data Model for Magents
 *
 * This module defines the unified data structures that serve as the single source of truth
 * for agent and task data shared between CLI and GUI. It replaces complex nested structures
 * with flattened, normalized schemas optimized for SQLite storage and real-time synchronization.
 */
import { z } from 'zod';
export declare const EntityIdSchema: z.ZodEffects<z.ZodString, string, string>;
export type EntityId = z.infer<typeof EntityIdSchema>;
export declare const AgentStatusSchema: z.ZodEnum<["CREATED", "STARTING", "RUNNING", "STOPPING", "STOPPED", "ERROR", "SUSPENDED"]>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export declare const AgentModeSchema: z.ZodEnum<["tmux", "docker", "hybrid"]>;
export type AgentMode = z.infer<typeof AgentModeSchema>;
export declare const UnifiedAgentDataSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    name: z.ZodString;
    projectId: z.ZodEffects<z.ZodString, string, string>;
    status: z.ZodEnum<["CREATED", "STARTING", "RUNNING", "STOPPING", "STOPPED", "ERROR", "SUSPENDED"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    lastAccessedAt: z.ZodOptional<z.ZodDate>;
    mode: z.ZodEnum<["tmux", "docker", "hybrid"]>;
    branch: z.ZodString;
    worktreePath: z.ZodString;
    tmuxSession: z.ZodOptional<z.ZodString>;
    dockerContainer: z.ZodOptional<z.ZodString>;
    dockerImage: z.ZodOptional<z.ZodString>;
    dockerPorts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dockerVolumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dockerNetwork: z.ZodOptional<z.ZodString>;
    autoAccept: z.ZodDefault<z.ZodBoolean>;
    portRange: z.ZodOptional<z.ZodString>;
    environmentVars: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    currentTaskId: z.ZodOptional<z.ZodString>;
    assignedTasks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    resourceLimits: z.ZodOptional<z.ZodObject<{
        maxMemory: z.ZodOptional<z.ZodString>;
        maxCpu: z.ZodOptional<z.ZodNumber>;
        maxProcesses: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxMemory?: string | undefined;
        maxCpu?: number | undefined;
        maxProcesses?: number | undefined;
    }, {
        maxMemory?: string | undefined;
        maxCpu?: number | undefined;
        maxProcesses?: number | undefined;
    }>>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    projectId: string;
    status: "RUNNING" | "STOPPED" | "ERROR" | "CREATED" | "STARTING" | "STOPPING" | "SUSPENDED";
    createdAt: Date;
    updatedAt: Date;
    mode: "tmux" | "docker" | "hybrid";
    branch: string;
    worktreePath: string;
    dockerPorts: string[];
    dockerVolumes: string[];
    autoAccept: boolean;
    environmentVars: Record<string, string>;
    assignedTasks: string[];
    tags: string[];
    metadata: Record<string, any>;
    lastAccessedAt?: Date | undefined;
    tmuxSession?: string | undefined;
    dockerContainer?: string | undefined;
    dockerImage?: string | undefined;
    dockerNetwork?: string | undefined;
    portRange?: string | undefined;
    currentTaskId?: string | undefined;
    resourceLimits?: {
        maxMemory?: string | undefined;
        maxCpu?: number | undefined;
        maxProcesses?: number | undefined;
    } | undefined;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    projectId: string;
    status: "RUNNING" | "STOPPED" | "ERROR" | "CREATED" | "STARTING" | "STOPPING" | "SUSPENDED";
    createdAt: Date;
    updatedAt: Date;
    mode: "tmux" | "docker" | "hybrid";
    branch: string;
    worktreePath: string;
    lastAccessedAt?: Date | undefined;
    tmuxSession?: string | undefined;
    dockerContainer?: string | undefined;
    dockerImage?: string | undefined;
    dockerPorts?: string[] | undefined;
    dockerVolumes?: string[] | undefined;
    dockerNetwork?: string | undefined;
    autoAccept?: boolean | undefined;
    portRange?: string | undefined;
    environmentVars?: Record<string, string> | undefined;
    currentTaskId?: string | undefined;
    assignedTasks?: string[] | undefined;
    resourceLimits?: {
        maxMemory?: string | undefined;
        maxCpu?: number | undefined;
        maxProcesses?: number | undefined;
    } | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type UnifiedAgentData = z.infer<typeof UnifiedAgentDataSchema>;
export declare const ProjectStatusSchema: z.ZodEnum<["ACTIVE", "INACTIVE", "ARCHIVED", "ERROR"]>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export declare const UnifiedProjectDataSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    name: z.ZodString;
    path: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "INACTIVE", "ARCHIVED", "ERROR"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    lastAccessedAt: z.ZodOptional<z.ZodDate>;
    gitRepository: z.ZodOptional<z.ZodObject<{
        branch: z.ZodString;
        remote: z.ZodOptional<z.ZodString>;
        lastCommit: z.ZodOptional<z.ZodString>;
        isClean: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        branch: string;
        isClean: boolean;
        remote?: string | undefined;
        lastCommit?: string | undefined;
    }, {
        branch: string;
        remote?: string | undefined;
        lastCommit?: string | undefined;
        isClean?: boolean | undefined;
    }>>;
    agentIds: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    maxAgents: z.ZodDefault<z.ZodNumber>;
    portRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>>;
    dockerNetwork: z.ZodOptional<z.ZodString>;
    taskMasterEnabled: z.ZodDefault<z.ZodBoolean>;
    taskMasterConfig: z.ZodOptional<z.ZodObject<{
        configPath: z.ZodOptional<z.ZodString>;
        initialized: z.ZodDefault<z.ZodBoolean>;
        lastSync: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        initialized: boolean;
        configPath?: string | undefined;
        lastSync?: Date | undefined;
    }, {
        configPath?: string | undefined;
        initialized?: boolean | undefined;
        lastSync?: Date | undefined;
    }>>;
    projectType: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["node", "python", "java", "go", "rust", "unknown"]>;
        packageManager: z.ZodOptional<z.ZodString>;
        frameworks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        detectedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        type: "unknown" | "node" | "python" | "java" | "go" | "rust";
        frameworks: string[];
        detectedAt: Date;
        packageManager?: string | undefined;
    }, {
        type: "unknown" | "node" | "python" | "java" | "go" | "rust";
        detectedAt: Date;
        packageManager?: string | undefined;
        frameworks?: string[] | undefined;
    }>>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    id: string;
    name: string;
    status: "ERROR" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    metadata: Record<string, any>;
    agentIds: string[];
    maxAgents: number;
    taskMasterEnabled: boolean;
    lastAccessedAt?: Date | undefined;
    dockerNetwork?: string | undefined;
    portRange?: {
        start: number;
        end: number;
    } | undefined;
    description?: string | undefined;
    gitRepository?: {
        branch: string;
        isClean: boolean;
        remote?: string | undefined;
        lastCommit?: string | undefined;
    } | undefined;
    taskMasterConfig?: {
        initialized: boolean;
        configPath?: string | undefined;
        lastSync?: Date | undefined;
    } | undefined;
    projectType?: {
        type: "unknown" | "node" | "python" | "java" | "go" | "rust";
        frameworks: string[];
        detectedAt: Date;
        packageManager?: string | undefined;
    } | undefined;
}, {
    path: string;
    id: string;
    name: string;
    status: "ERROR" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt?: Date | undefined;
    dockerNetwork?: string | undefined;
    portRange?: {
        start: number;
        end: number;
    } | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    gitRepository?: {
        branch: string;
        remote?: string | undefined;
        lastCommit?: string | undefined;
        isClean?: boolean | undefined;
    } | undefined;
    agentIds?: string[] | undefined;
    maxAgents?: number | undefined;
    taskMasterEnabled?: boolean | undefined;
    taskMasterConfig?: {
        configPath?: string | undefined;
        initialized?: boolean | undefined;
        lastSync?: Date | undefined;
    } | undefined;
    projectType?: {
        type: "unknown" | "node" | "python" | "java" | "go" | "rust";
        detectedAt: Date;
        packageManager?: string | undefined;
        frameworks?: string[] | undefined;
    } | undefined;
}>;
export type UnifiedProjectData = z.infer<typeof UnifiedProjectDataSchema>;
export declare const TaskStatusSchema: z.ZodEnum<["pending", "assigned", "in-progress", "done", "blocked", "cancelled", "deferred"]>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export declare const TaskPrioritySchema: z.ZodEnum<["low", "medium", "high", "critical"]>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export declare const UnifiedTaskDataSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    taskMasterId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "assigned", "in-progress", "done", "blocked", "cancelled", "deferred"]>;
    priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    assignedAt: z.ZodOptional<z.ZodDate>;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    assignedToAgentId: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    parentTaskId: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    subtaskIds: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    testStrategy: z.ZodOptional<z.ZodString>;
    testResults: z.ZodOptional<z.ZodObject<{
        passed: z.ZodDefault<z.ZodNumber>;
        failed: z.ZodDefault<z.ZodNumber>;
        lastRun: z.ZodOptional<z.ZodDate>;
        coverage: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        passed: number;
        failed: number;
        lastRun?: Date | undefined;
        coverage?: number | undefined;
    }, {
        passed?: number | undefined;
        failed?: number | undefined;
        lastRun?: Date | undefined;
        coverage?: number | undefined;
    }>>;
    estimatedEffort: z.ZodOptional<z.ZodNumber>;
    actualEffort: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    projectId: string;
    status: "pending" | "in-progress" | "done" | "blocked" | "cancelled" | "assigned" | "deferred";
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    metadata: Record<string, any>;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    subtaskIds: string[];
    dependencies: string[];
    description?: string | undefined;
    taskMasterId?: string | undefined;
    details?: string | undefined;
    assignedAt?: Date | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    assignedToAgentId?: string | undefined;
    parentTaskId?: string | undefined;
    testStrategy?: string | undefined;
    testResults?: {
        passed: number;
        failed: number;
        lastRun?: Date | undefined;
        coverage?: number | undefined;
    } | undefined;
    estimatedEffort?: number | undefined;
    actualEffort?: number | undefined;
}, {
    id: string;
    projectId: string;
    status: "pending" | "in-progress" | "done" | "blocked" | "cancelled" | "assigned" | "deferred";
    createdAt: Date;
    updatedAt: Date;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    taskMasterId?: string | undefined;
    details?: string | undefined;
    assignedAt?: Date | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    assignedToAgentId?: string | undefined;
    parentTaskId?: string | undefined;
    subtaskIds?: string[] | undefined;
    dependencies?: string[] | undefined;
    testStrategy?: string | undefined;
    testResults?: {
        passed?: number | undefined;
        failed?: number | undefined;
        lastRun?: Date | undefined;
        coverage?: number | undefined;
    } | undefined;
    estimatedEffort?: number | undefined;
    actualEffort?: number | undefined;
}>;
export type UnifiedTaskData = z.infer<typeof UnifiedTaskDataSchema>;
export declare const UnifiedConfigDataSchema: z.ZodObject<{
    maxAgents: z.ZodDefault<z.ZodNumber>;
    defaultMode: z.ZodDefault<z.ZodEnum<["tmux", "docker", "hybrid"]>>;
    autoAccept: z.ZodDefault<z.ZodBoolean>;
    docker: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        defaultImage: z.ZodDefault<z.ZodString>;
        network: z.ZodOptional<z.ZodString>;
        resourceLimits: z.ZodObject<{
            memory: z.ZodDefault<z.ZodString>;
            cpu: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            memory: string;
            cpu: number;
        }, {
            memory?: string | undefined;
            cpu?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        resourceLimits: {
            memory: string;
            cpu: number;
        };
        enabled: boolean;
        defaultImage: string;
        network?: string | undefined;
    }, {
        resourceLimits: {
            memory?: string | undefined;
            cpu?: number | undefined;
        };
        enabled?: boolean | undefined;
        defaultImage?: string | undefined;
        network?: string | undefined;
    }>>;
    ports: z.ZodDefault<z.ZodObject<{
        defaultRange: z.ZodObject<{
            start: z.ZodDefault<z.ZodNumber>;
            end: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start?: number | undefined;
            end?: number | undefined;
        }>;
        reservedPorts: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        defaultRange: {
            start: number;
            end: number;
        };
        reservedPorts: number[];
    }, {
        defaultRange: {
            start?: number | undefined;
            end?: number | undefined;
        };
        reservedPorts?: number[] | undefined;
    }>>;
    taskMaster: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoSync: z.ZodDefault<z.ZodBoolean>;
        syncInterval: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        autoSync: boolean;
        syncInterval: number;
    }, {
        enabled?: boolean | undefined;
        autoSync?: boolean | undefined;
        syncInterval?: number | undefined;
    }>>;
    paths: z.ZodDefault<z.ZodObject<{
        workspace: z.ZodOptional<z.ZodString>;
        dataDir: z.ZodOptional<z.ZodString>;
        tempDir: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        workspace?: string | undefined;
        dataDir?: string | undefined;
        tempDir?: string | undefined;
    }, {
        workspace?: string | undefined;
        dataDir?: string | undefined;
        tempDir?: string | undefined;
    }>>;
    version: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    docker: {
        resourceLimits: {
            memory: string;
            cpu: number;
        };
        enabled: boolean;
        defaultImage: string;
        network?: string | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
    autoAccept: boolean;
    maxAgents: number;
    defaultMode: "tmux" | "docker" | "hybrid";
    ports: {
        defaultRange: {
            start: number;
            end: number;
        };
        reservedPorts: number[];
    };
    taskMaster: {
        enabled: boolean;
        autoSync: boolean;
        syncInterval: number;
    };
    paths: {
        workspace?: string | undefined;
        dataDir?: string | undefined;
        tempDir?: string | undefined;
    };
    version: string;
}, {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    docker?: {
        resourceLimits: {
            memory?: string | undefined;
            cpu?: number | undefined;
        };
        enabled?: boolean | undefined;
        defaultImage?: string | undefined;
        network?: string | undefined;
    } | undefined;
    autoAccept?: boolean | undefined;
    maxAgents?: number | undefined;
    defaultMode?: "tmux" | "docker" | "hybrid" | undefined;
    ports?: {
        defaultRange: {
            start?: number | undefined;
            end?: number | undefined;
        };
        reservedPorts?: number[] | undefined;
    } | undefined;
    taskMaster?: {
        enabled?: boolean | undefined;
        autoSync?: boolean | undefined;
        syncInterval?: number | undefined;
    } | undefined;
    paths?: {
        workspace?: string | undefined;
        dataDir?: string | undefined;
        tempDir?: string | undefined;
    } | undefined;
}>;
export type UnifiedConfigData = z.infer<typeof UnifiedConfigDataSchema>;
export declare const EventTypeSchema: z.ZodEnum<["agent.created", "agent.started", "agent.stopped", "agent.error", "agent.updated", "agent.deleted", "project.created", "project.updated", "project.deleted", "task.created", "task.assigned", "task.completed", "task.updated", "task.deleted", "config.updated", "sync.started", "sync.completed", "sync.error"]>;
export type EventType = z.infer<typeof EventTypeSchema>;
export declare const UnifiedEventDataSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    type: z.ZodEnum<["agent.created", "agent.started", "agent.stopped", "agent.error", "agent.updated", "agent.deleted", "project.created", "project.updated", "project.deleted", "task.created", "task.assigned", "task.completed", "task.updated", "task.deleted", "config.updated", "sync.started", "sync.completed", "sync.error"]>;
    timestamp: z.ZodDate;
    entityId: z.ZodEffects<z.ZodString, string, string>;
    entityType: z.ZodEnum<["agent", "project", "task", "config"]>;
    projectId: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    previousData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    source: z.ZodEnum<["cli", "gui", "api", "system", "external"]>;
    userId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent.created" | "agent.started" | "agent.stopped" | "agent.error" | "agent.updated" | "agent.deleted" | "project.created" | "project.updated" | "project.deleted" | "task.created" | "task.assigned" | "task.completed" | "task.updated" | "task.deleted" | "config.updated" | "sync.started" | "sync.completed" | "sync.error";
    metadata: Record<string, any>;
    timestamp: Date;
    entityId: string;
    entityType: "agent" | "project" | "task" | "config";
    data: Record<string, any>;
    source: "cli" | "gui" | "api" | "system" | "external";
    projectId?: string | undefined;
    previousData?: Record<string, any> | undefined;
    userId?: string | undefined;
}, {
    id: string;
    type: "agent.created" | "agent.started" | "agent.stopped" | "agent.error" | "agent.updated" | "agent.deleted" | "project.created" | "project.updated" | "project.deleted" | "task.created" | "task.assigned" | "task.completed" | "task.updated" | "task.deleted" | "config.updated" | "sync.started" | "sync.completed" | "sync.error";
    timestamp: Date;
    entityId: string;
    entityType: "agent" | "project" | "task" | "config";
    source: "cli" | "gui" | "api" | "system" | "external";
    projectId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    data?: Record<string, any> | undefined;
    previousData?: Record<string, any> | undefined;
    userId?: string | undefined;
}>;
export type UnifiedEventData = z.infer<typeof UnifiedEventDataSchema>;
export declare const DATABASE_VERSION = 1;
export declare const TABLE_SCHEMAS: {
    readonly agents: "\n    CREATE TABLE IF NOT EXISTS agents (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      project_id TEXT NOT NULL,\n      status TEXT NOT NULL,\n      mode TEXT NOT NULL,\n      branch TEXT NOT NULL,\n      worktree_path TEXT NOT NULL,\n      tmux_session TEXT,\n      docker_container TEXT,\n      docker_image TEXT,\n      docker_ports TEXT, -- JSON array\n      docker_volumes TEXT, -- JSON array\n      docker_network TEXT,\n      auto_accept BOOLEAN DEFAULT FALSE,\n      port_range TEXT,\n      environment_vars TEXT, -- JSON object\n      current_task_id TEXT,\n      assigned_tasks TEXT, -- JSON array\n      resource_limits TEXT, -- JSON object\n      description TEXT,\n      tags TEXT, -- JSON array\n      metadata TEXT, -- JSON object\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL,\n      last_accessed_at DATETIME,\n      \n      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,\n      FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL\n    )\n  ";
    readonly projects: "\n    CREATE TABLE IF NOT EXISTS projects (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      path TEXT NOT NULL UNIQUE,\n      status TEXT NOT NULL,\n      git_repository TEXT, -- JSON object\n      agent_ids TEXT, -- JSON array\n      max_agents INTEGER DEFAULT 10,\n      port_range TEXT, -- JSON object\n      docker_network TEXT,\n      task_master_enabled BOOLEAN DEFAULT FALSE,\n      task_master_config TEXT, -- JSON object\n      project_type TEXT, -- JSON object\n      description TEXT,\n      tags TEXT, -- JSON array\n      metadata TEXT, -- JSON object\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL,\n      last_accessed_at DATETIME\n    )\n  ";
    readonly tasks: "\n    CREATE TABLE IF NOT EXISTS tasks (\n      id TEXT PRIMARY KEY,\n      task_master_id TEXT,\n      project_id TEXT NOT NULL,\n      title TEXT NOT NULL,\n      description TEXT,\n      details TEXT,\n      status TEXT NOT NULL,\n      priority TEXT NOT NULL,\n      assigned_to_agent_id TEXT,\n      parent_task_id TEXT,\n      subtask_ids TEXT, -- JSON array\n      dependencies TEXT, -- JSON array\n      test_strategy TEXT,\n      test_results TEXT, -- JSON object\n      estimated_effort REAL,\n      actual_effort REAL,\n      tags TEXT, -- JSON array\n      metadata TEXT, -- JSON object\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL,\n      assigned_at DATETIME,\n      started_at DATETIME,\n      completed_at DATETIME,\n      \n      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,\n      FOREIGN KEY (assigned_to_agent_id) REFERENCES agents(id) ON DELETE SET NULL,\n      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE\n    )\n  ";
    readonly config: "\n    CREATE TABLE IF NOT EXISTS config (\n      id TEXT PRIMARY KEY DEFAULT 'global',\n      max_agents INTEGER DEFAULT 10,\n      default_mode TEXT DEFAULT 'docker',\n      auto_accept BOOLEAN DEFAULT FALSE,\n      docker_config TEXT, -- JSON object\n      ports_config TEXT, -- JSON object\n      task_master_config TEXT, -- JSON object\n      paths_config TEXT, -- JSON object\n      version TEXT NOT NULL,\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL\n    )\n  ";
    readonly events: "\n    CREATE TABLE IF NOT EXISTS events (\n      id TEXT PRIMARY KEY,\n      type TEXT NOT NULL,\n      timestamp DATETIME NOT NULL,\n      entity_id TEXT NOT NULL,\n      entity_type TEXT NOT NULL,\n      project_id TEXT,\n      data TEXT, -- JSON object\n      previous_data TEXT, -- JSON object\n      source TEXT NOT NULL,\n      user_id TEXT,\n      metadata TEXT, -- JSON object\n      \n      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE\n    )\n  ";
    readonly migrations: "\n    CREATE TABLE IF NOT EXISTS migrations (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      version INTEGER NOT NULL UNIQUE,\n      name TEXT NOT NULL,\n      executed_at DATETIME NOT NULL\n    )\n  ";
};
export declare const INDEXES: readonly ["CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id)", "CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)", "CREATE INDEX IF NOT EXISTS idx_agents_mode ON agents(mode)", "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)", "CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)", "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)", "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)", "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_agent_id)", "CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id)", "CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)", "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)", "CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_id)", "CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id)"];
export declare class UnifiedDataValidator {
    static validateAgent(data: unknown): UnifiedAgentData;
    static validateProject(data: unknown): UnifiedProjectData;
    static validateTask(data: unknown): UnifiedTaskData;
    static validateConfig(data: unknown): UnifiedConfigData;
    static validateEvent(data: unknown): UnifiedEventData;
    static isValidEntityId(id: string): boolean;
}
export declare function isUnifiedAgentData(data: unknown): data is UnifiedAgentData;
export declare function isUnifiedProjectData(data: unknown): data is UnifiedProjectData;
export declare function isUnifiedTaskData(data: unknown): data is UnifiedTaskData;
export declare function isUnifiedConfigData(data: unknown): data is UnifiedConfigData;
export declare function isUnifiedEventData(data: unknown): data is UnifiedEventData;
export interface MigrationDefinition {
    version: number;
    name: string;
    up: string[];
    down: string[];
}
export declare const MIGRATIONS: MigrationDefinition[];
//# sourceMappingURL=unified.d.ts.map