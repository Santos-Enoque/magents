"use strict";
/**
 * Configuration Migration Tool
 *
 * This tool migrates existing agent configurations, project settings, and data
 * from the legacy format to the new unified data model structure.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = exports.createMigrator = exports.ConfigMigrator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const unified_1 = require("../types/unified");
const database_1 = require("../database");
const utils_1 = require("../utils");
class ConfigMigrator {
    constructor(db) {
        this.db = db;
        this.agentRepo = new database_1.AgentRepository(db);
        this.projectRepo = new database_1.ProjectRepository(db);
        this.taskRepo = new database_1.TaskRepository(db);
        this.configRepo = new database_1.ConfigRepository(db);
    }
    /**
     * Migrate legacy agent configurations (public for testing)
     */
    async testMigrateAgents(options = {}) {
        const result = {
            success: true,
            migratedAgents: 0,
            migratedProjects: 0,
            migratedTasks: 0,
            migratedConfigs: 0,
            errors: [],
            warnings: [],
            skipped: [],
        };
        await this.migrateAgents(options, result);
        return result;
    }
    /**
     * Migrate legacy project configurations (public for testing)
     */
    async testMigrateProjects(options = {}) {
        const result = {
            success: true,
            migratedAgents: 0,
            migratedProjects: 0,
            migratedTasks: 0,
            migratedConfigs: 0,
            errors: [],
            warnings: [],
            skipped: [],
        };
        await this.migrateProjects(options, result);
        return result;
    }
    /**
     * Migrate legacy task configurations (public for testing)
     */
    async testMigrateTasks(options = {}) {
        const result = {
            success: true,
            migratedAgents: 0,
            migratedProjects: 0,
            migratedTasks: 0,
            migratedConfigs: 0,
            errors: [],
            warnings: [],
            skipped: [],
        };
        await this.migrateTasks(options, result);
        return result;
    }
    /**
     * Migrate legacy global configuration (public for testing)
     */
    async testMigrateGlobalConfig(options = {}) {
        const result = {
            success: true,
            migratedAgents: 0,
            migratedProjects: 0,
            migratedTasks: 0,
            migratedConfigs: 0,
            errors: [],
            warnings: [],
            skipped: [],
        };
        await this.migrateGlobalConfig(options, result);
        return result;
    }
    /**
     * Migrate all legacy configurations to the unified format
     */
    async migrateAll(options = {}) {
        const result = {
            success: true,
            migratedAgents: 0,
            migratedProjects: 0,
            migratedTasks: 0,
            migratedConfigs: 0,
            errors: [],
            warnings: [],
            skipped: [],
        };
        try {
            console.log('Starting configuration migration...');
            // Create backup if requested
            if (options.backupExisting) {
                await this.createBackup();
            }
            // Migrate global configuration first
            await this.migrateGlobalConfig(options, result);
            // Migrate projects
            await this.migrateProjects(options, result);
            // Migrate agents
            await this.migrateAgents(options, result);
            // Migrate tasks (if TaskMaster data is available)
            if (options.includeTaskMasterData) {
                await this.migrateTasks(options, result);
            }
            // Validate migration if requested
            if (options.validateAfterMigration) {
                await this.validateMigration(result);
            }
            console.log('Migration completed successfully');
            this.logMigrationSummary(result);
        }
        catch (error) {
            result.success = false;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Migration failed: ${errorMsg}`);
            console.error('Migration failed:', error);
        }
        return result;
    }
    /**
     * Migrate legacy agent configurations
     */
    async migrateAgents(options, result) {
        const sourceDir = options.sourceDirectory || this.getDefaultSourceDirectory();
        const agentsConfigPath = path.join(sourceDir, 'agents.json');
        if (!fs.existsSync(agentsConfigPath)) {
            result.warnings.push('No legacy agents configuration found');
            return;
        }
        try {
            const legacyAgents = JSON.parse(fs.readFileSync(agentsConfigPath, 'utf-8'));
            for (const legacyAgent of legacyAgents) {
                try {
                    const unifiedAgent = this.convertLegacyAgent(legacyAgent);
                    if (options.dryRun) {
                        console.log(`[DRY RUN] Would migrate agent: ${unifiedAgent.name}`);
                        continue;
                    }
                    // Check if agent already exists
                    const existing = this.agentRepo.findById(unifiedAgent.id);
                    if (existing && !options.forceOverwrite) {
                        result.skipped.push(`Agent ${unifiedAgent.name} already exists`);
                        continue;
                    }
                    // Validate unified agent data
                    unified_1.UnifiedAgentDataSchema.parse(unifiedAgent);
                    if (existing) {
                        this.agentRepo.update(unifiedAgent.id, unifiedAgent);
                    }
                    else {
                        this.agentRepo.create(unifiedAgent);
                    }
                    result.migratedAgents++;
                    console.log(`Migrated agent: ${unifiedAgent.name}`);
                }
                catch (error) {
                    const errorMsg = `Failed to migrate agent ${legacyAgent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg);
                }
            }
        }
        catch (error) {
            const errorMsg = `Failed to read legacy agents configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }
    /**
     * Migrate legacy project configurations
     */
    async migrateProjects(options, result) {
        const sourceDir = options.sourceDirectory || this.getDefaultSourceDirectory();
        const projectsConfigPath = path.join(sourceDir, 'projects.json');
        if (!fs.existsSync(projectsConfigPath)) {
            result.warnings.push('No legacy projects configuration found');
            return;
        }
        try {
            const legacyProjects = JSON.parse(fs.readFileSync(projectsConfigPath, 'utf-8'));
            for (const legacyProject of legacyProjects) {
                try {
                    const unifiedProject = this.convertLegacyProject(legacyProject);
                    if (options.dryRun) {
                        console.log(`[DRY RUN] Would migrate project: ${unifiedProject.name}`);
                        continue;
                    }
                    // Check if project already exists
                    const existing = this.projectRepo.findByPath(unifiedProject.path);
                    if (existing && !options.forceOverwrite) {
                        result.skipped.push(`Project ${unifiedProject.name} already exists`);
                        continue;
                    }
                    // Validate unified project data
                    unified_1.UnifiedProjectDataSchema.parse(unifiedProject);
                    if (existing) {
                        this.projectRepo.update(existing.id, unifiedProject);
                    }
                    else {
                        this.projectRepo.create(unifiedProject);
                    }
                    result.migratedProjects++;
                    console.log(`Migrated project: ${unifiedProject.name}`);
                }
                catch (error) {
                    const errorMsg = `Failed to migrate project ${legacyProject.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg);
                }
            }
        }
        catch (error) {
            const errorMsg = `Failed to read legacy projects configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }
    /**
     * Migrate legacy task configurations
     */
    async migrateTasks(options, result) {
        const sourceDir = options.sourceDirectory || this.getDefaultSourceDirectory();
        const tasksConfigPath = path.join(sourceDir, 'tasks.json');
        if (!fs.existsSync(tasksConfigPath)) {
            result.warnings.push('No legacy tasks configuration found');
            return;
        }
        try {
            const legacyTasks = JSON.parse(fs.readFileSync(tasksConfigPath, 'utf-8'));
            for (const legacyTask of legacyTasks) {
                try {
                    const unifiedTask = this.convertLegacyTask(legacyTask);
                    if (options.dryRun) {
                        console.log(`[DRY RUN] Would migrate task: ${unifiedTask.title}`);
                        continue;
                    }
                    // Check if task already exists
                    const existing = this.taskRepo.findById(unifiedTask.id);
                    if (existing && !options.forceOverwrite) {
                        result.skipped.push(`Task ${unifiedTask.title} already exists`);
                        continue;
                    }
                    // Validate unified task data
                    unified_1.UnifiedTaskDataSchema.parse(unifiedTask);
                    if (existing) {
                        this.taskRepo.update(unifiedTask.id, unifiedTask);
                    }
                    else {
                        this.taskRepo.create(unifiedTask);
                    }
                    result.migratedTasks++;
                    console.log(`Migrated task: ${unifiedTask.title}`);
                }
                catch (error) {
                    const errorMsg = `Failed to migrate task ${legacyTask.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg);
                }
            }
        }
        catch (error) {
            const errorMsg = `Failed to read legacy tasks configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }
    /**
     * Migrate legacy global configuration
     */
    async migrateGlobalConfig(options, result) {
        const sourceDir = options.sourceDirectory || this.getDefaultSourceDirectory();
        const configPath = path.join(sourceDir, 'config.json');
        if (!fs.existsSync(configPath)) {
            result.warnings.push('No legacy global configuration found');
            return;
        }
        try {
            const legacyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const unifiedConfig = this.convertLegacyGlobalConfig(legacyConfig);
            if (options.dryRun) {
                console.log('[DRY RUN] Would migrate global configuration');
                return;
            }
            // Validate unified config data
            unified_1.UnifiedConfigDataSchema.parse(unifiedConfig);
            // Update global configuration
            this.configRepo.updateGlobalConfig(unifiedConfig);
            result.migratedConfigs++;
            console.log('Migrated global configuration');
        }
        catch (error) {
            const errorMsg = `Failed to migrate global configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }
    /**
     * Convert legacy agent to unified format
     */
    convertLegacyAgent(legacy) {
        const now = new Date();
        return {
            id: legacy.id || (0, utils_1.generateAgentId)(legacy.name),
            name: legacy.name,
            projectId: legacy.project || 'default-project',
            status: this.mapAgentStatus(legacy.status),
            mode: this.mapAgentMode(legacy.mode),
            branch: (0, utils_1.sanitizeBranchName)(legacy.branch || 'main'),
            worktreePath: legacy.worktreePath || '',
            createdAt: legacy.createdAt ? new Date(legacy.createdAt) : now,
            updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : now,
            autoAccept: legacy.autoAccept || false,
            dockerPorts: legacy.port ? [`${legacy.port}:${legacy.port}`] : [],
            dockerVolumes: legacy.volumes || [],
            environmentVars: legacy.environment || {},
            assignedTasks: [],
            tags: [],
            metadata: {
                migratedFrom: 'legacy',
                migrationDate: now.toISOString(),
                originalId: legacy.id,
            },
        };
    }
    /**
     * Convert legacy project to unified format
     */
    convertLegacyProject(legacy) {
        const now = new Date();
        return {
            id: legacy.id || (0, utils_1.generateId)(),
            name: legacy.name,
            path: legacy.path,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
            agentIds: legacy.agents || [],
            maxAgents: legacy.settings?.maxAgents || 10,
            taskMasterEnabled: legacy.settings?.taskMasterEnabled || false,
            tags: [],
            metadata: {
                migratedFrom: 'legacy',
                migrationDate: now.toISOString(),
                originalSettings: legacy.settings,
                ...legacy.metadata,
            },
        };
    }
    /**
     * Convert legacy task to unified format
     */
    convertLegacyTask(legacy) {
        const now = new Date();
        return {
            id: legacy.id || (0, utils_1.generateId)(),
            projectId: legacy.project || 'default-project',
            title: legacy.title,
            description: legacy.description,
            status: this.mapTaskStatus(legacy.status),
            priority: this.mapTaskPriority(legacy.priority),
            createdAt: now,
            updatedAt: now,
            assignedToAgentId: legacy.assignedTo,
            subtaskIds: legacy.subtasks?.map(st => st.id || (0, utils_1.generateId)()) || [],
            dependencies: legacy.dependencies || [],
            tags: [],
            metadata: {
                migratedFrom: 'legacy',
                migrationDate: now.toISOString(),
                ...legacy.metadata,
            },
        };
    }
    /**
     * Convert legacy global config to unified format
     */
    convertLegacyGlobalConfig(legacy) {
        const now = new Date();
        return {
            maxAgents: legacy.maxAgents || 10,
            defaultMode: 'docker',
            autoAccept: false,
            docker: {
                enabled: legacy.docker?.enabled !== false,
                defaultImage: legacy.defaultDockerImage || 'magents:latest',
                resourceLimits: {
                    memory: legacy.docker?.defaultResources?.memory || '1G',
                    cpu: legacy.docker?.defaultResources?.cpu || 1,
                },
            },
            ports: {
                defaultRange: {
                    start: legacy.defaultPorts?.start || 3000,
                    end: legacy.defaultPorts?.end || 3999,
                },
                reservedPorts: [],
            },
            taskMaster: {
                enabled: legacy.taskMaster?.enabled || false,
                autoSync: true,
                syncInterval: legacy.taskMaster?.syncInterval || 30000,
            },
            paths: {
                workspace: legacy.paths?.workspaceRoot,
                dataDir: legacy.paths?.logsPath,
                tempDir: legacy.paths?.configPath,
            },
            version: legacy.version || '1.0.0',
            createdAt: now,
            updatedAt: now,
        };
    }
    /**
     * Map legacy agent status to unified format
     */
    mapAgentStatus(status) {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'running':
                return 'RUNNING';
            case 'stopped':
            case 'inactive':
                return 'STOPPED';
            case 'error':
            case 'failed':
                return 'ERROR';
            case 'starting':
            case 'initializing':
                return 'STARTING';
            default:
                return 'STOPPED';
        }
    }
    /**
     * Map legacy agent mode to unified format
     */
    mapAgentMode(mode) {
        switch (mode?.toLowerCase()) {
            case 'docker':
            case 'container':
                return 'docker';
            case 'tmux':
                return 'tmux';
            case 'local':
            case 'native':
            case 'hybrid':
                return 'hybrid';
            default:
                return 'docker';
        }
    }
    /**
     * Map legacy task status to unified format
     */
    mapTaskStatus(status) {
        switch (status?.toLowerCase()) {
            case 'todo':
            case 'new':
            case 'pending':
                return 'pending';
            case 'in-progress':
            case 'active':
            case 'working':
                return 'in-progress';
            case 'done':
            case 'completed':
            case 'finished':
                return 'done';
            case 'blocked':
            case 'waiting':
                return 'blocked';
            case 'cancelled':
            case 'canceled':
                return 'cancelled';
            case 'deferred':
            case 'postponed':
                return 'deferred';
            default:
                return 'pending';
        }
    }
    /**
     * Map legacy task priority to unified format
     */
    mapTaskPriority(priority) {
        switch (priority?.toLowerCase()) {
            case 'low':
            case 'minor':
                return 'low';
            case 'medium':
            case 'normal':
                return 'medium';
            case 'high':
            case 'important':
                return 'high';
            case 'critical':
            case 'urgent':
                return 'critical';
            default:
                return 'medium';
        }
    }
    /**
     * Create backup of existing unified database
     */
    async createBackup() {
        const backupPath = this.getBackupPath();
        console.log(`Creating backup at: ${backupPath}`);
        try {
            await this.db.backup(backupPath);
            console.log('Backup created successfully');
        }
        catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }
    /**
     * Validate migration results
     */
    async validateMigration(result) {
        console.log('Validating migration results...');
        try {
            // Check data integrity
            const agents = this.agentRepo.findAll();
            const projects = this.projectRepo.findAll();
            const tasks = this.taskRepo.findAll();
            const config = this.configRepo.getGlobalConfig();
            // Validate schemas
            for (const agent of agents) {
                unified_1.UnifiedAgentDataSchema.parse(agent);
            }
            for (const project of projects) {
                unified_1.UnifiedProjectDataSchema.parse(project);
            }
            for (const task of tasks) {
                unified_1.UnifiedTaskDataSchema.parse(task);
            }
            if (config) {
                unified_1.UnifiedConfigDataSchema.parse(config);
            }
            console.log('Migration validation passed');
        }
        catch (error) {
            const errorMsg = `Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            result.warnings.push('Consider rolling back to backup');
            console.error(errorMsg);
        }
    }
    /**
     * Get default source directory for legacy configurations
     */
    getDefaultSourceDirectory() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        return path.join(homeDir, '.magents', 'legacy');
    }
    /**
     * Get backup file path
     */
    getBackupPath() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        return path.join(homeDir, '.magents', 'backups', `migration-backup-${timestamp}.db`);
    }
    /**
     * Log migration summary
     */
    logMigrationSummary(result) {
        console.log('\n=== Migration Summary ===');
        console.log(`Success: ${result.success}`);
        console.log(`Migrated Agents: ${result.migratedAgents}`);
        console.log(`Migrated Projects: ${result.migratedProjects}`);
        console.log(`Migrated Tasks: ${result.migratedTasks}`);
        console.log(`Migrated Configs: ${result.migratedConfigs}`);
        if (result.warnings.length > 0) {
            console.log(`\nWarnings (${result.warnings.length}):`);
            result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        if (result.skipped.length > 0) {
            console.log(`\nSkipped (${result.skipped.length}):`);
            result.skipped.forEach(skipped => console.log(`  - ${skipped}`));
        }
        if (result.errors.length > 0) {
            console.log(`\nErrors (${result.errors.length}):`);
            result.errors.forEach(error => console.log(`  - ${error}`));
        }
        console.log('========================\n');
    }
}
exports.ConfigMigrator = ConfigMigrator;
// Utility functions for external use
const createMigrator = (db) => {
    return new ConfigMigrator(db);
};
exports.createMigrator = createMigrator;
const runMigration = async (db, options = {}) => {
    const migrator = new ConfigMigrator(db);
    return await migrator.migrateAll(options);
};
exports.runMigration = runMigration;
//# sourceMappingURL=ConfigMigrator.js.map