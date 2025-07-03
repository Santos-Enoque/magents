"use strict";
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
exports.JsonToSqliteMigration = void 0;
const BaseMigration_1 = require("./BaseMigration");
const index_1 = require("../index");
const projectService_1 = require("../../services/projectService");
const configService_1 = require("../../services/configService");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Migration class for converting JSON-based storage to SQLite database
 */
class JsonToSqliteMigration extends BaseMigration_1.BaseMigration {
    constructor(db, projectService, configService, config) {
        super('JsonToSqlite', config);
        this.itemCounts = {
            projects: 0,
            agents: 0,
            tasks: 0
        };
        this.migratedCounts = {
            projects: 0,
            agents: 0,
            tasks: 0
        };
        // Dependency injection with defaults
        this.db = db || new index_1.UnifiedDatabaseService();
        this.projectService = projectService || new projectService_1.ProjectService();
        this.configService = configService || new configService_1.ConfigService();
    }
    /**
     * Execute the migration
     */
    async migrate(config) {
        // Merge config
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.logger.info('Starting JSON to SQLite migration...');
        this.logger.info(`Dry run: ${this.config.dryRun ? 'YES' : 'NO'}`);
        this.startTiming();
        this.errors = [];
        this.backups = [];
        try {
            // Initialize database
            if (!this.config.dryRun) {
                await this.db.initialize();
            }
            // Count items for progress tracking
            await this.countItems();
            // Migrate in phases
            await this.migrateProjects();
            await this.migrateAgents();
            await this.migrateTasks();
            const result = this.buildResult(this.migratedCounts.projects + this.migratedCounts.agents + this.migratedCounts.tasks);
            this.logSummary(result);
            if (result.success) {
                this.logger.info('Migration completed successfully');
            }
            else {
                this.logger.error('Migration completed with errors');
            }
            return result;
        }
        catch (error) {
            this.logger.error('Migration failed:', error);
            // Attempt rollback on failure
            if (!this.config.dryRun && this.backups.length > 0) {
                this.logger.info('Attempting automatic rollback...');
                try {
                    await this.rollback();
                }
                catch (rollbackError) {
                    this.logger.error('Rollback failed:', rollbackError);
                }
            }
            throw error;
        }
        finally {
            // Close database connection
            if (!this.config.dryRun) {
                await this.db.close();
            }
        }
    }
    /**
     * Count items to migrate for progress tracking
     */
    async countItems() {
        const projectsPath = path.join(this.configService.getDataDir(), 'projects', 'projects.json');
        if (await fs.pathExists(projectsPath)) {
            const data = await fs.readJson(projectsPath);
            this.itemCounts.projects = (data.projects || []).length;
        }
        const agentsDir = path.join(this.configService.getDataDir(), 'agents');
        if (await fs.pathExists(agentsDir)) {
            const files = await fs.readdir(agentsDir);
            this.itemCounts.agents = files.filter(f => f.endsWith('.json')).length;
        }
        const total = this.itemCounts.projects + this.itemCounts.agents + this.itemCounts.tasks;
        this.logger.info(`Found ${total} items to migrate`);
        this.logger.info(`  Projects: ${this.itemCounts.projects}`);
        this.logger.info(`  Agents: ${this.itemCounts.agents}`);
        this.logger.info(`  Tasks: ${this.itemCounts.tasks}`);
    }
    /**
     * Migrate projects from JSON to database
     */
    async migrateProjects() {
        this.logger.info('Migrating projects...');
        const projectsPath = path.join(this.configService.getDataDir(), 'projects', 'projects.json');
        if (!await fs.pathExists(projectsPath)) {
            this.logger.warn('No projects.json found, skipping project migration');
            return;
        }
        // Create backup
        if (!this.config.dryRun) {
            await this.createBackup(projectsPath);
        }
        try {
            const projectsData = await fs.readJson(projectsPath);
            const projects = projectsData.projects || [];
            let migrated = 0;
            for (const [index, project] of projects.entries()) {
                try {
                    // Convert to unified format
                    const unifiedProject = this.convertProjectToUnified(project);
                    if (!this.config.dryRun) {
                        await this.db.projects.create(unifiedProject);
                    }
                    migrated++;
                    this.updateProgress('projects', index + 1, projects.length);
                    if (this.config.verbose) {
                        this.logger.info(`Migrated project: ${project.name}`);
                    }
                }
                catch (error) {
                    this.addError(`Project ${project.id}`, error);
                }
            }
            this.migratedCounts.projects = migrated;
            this.logger.info(`Migrated ${migrated}/${projects.length} projects`);
        }
        catch (error) {
            this.logger.error('Failed to migrate projects:', error);
            throw error;
        }
    }
    /**
     * Migrate agents from JSON to database
     */
    async migrateAgents() {
        this.logger.info('Migrating agents...');
        const agentsDir = path.join(this.configService.getDataDir(), 'agents');
        if (!await fs.pathExists(agentsDir)) {
            this.logger.warn('No agents directory found, skipping agent migration');
            return;
        }
        try {
            const agentFiles = await fs.readdir(agentsDir);
            const jsonFiles = agentFiles.filter(f => f.endsWith('.json'));
            let migrated = 0;
            for (const [index, file] of jsonFiles.entries()) {
                const agentPath = path.join(agentsDir, file);
                try {
                    // Create backup
                    if (!this.config.dryRun) {
                        await this.createBackup(agentPath);
                    }
                    const agent = await fs.readJson(agentPath);
                    const unifiedAgent = await this.convertAgentToUnified(agent);
                    if (!this.config.dryRun) {
                        await this.db.agents.create(unifiedAgent);
                    }
                    migrated++;
                    this.updateProgress('agents', index + 1, jsonFiles.length);
                    if (this.config.verbose) {
                        this.logger.info(`Migrated agent: ${agent.name}`);
                    }
                }
                catch (error) {
                    this.addError(`Agent ${file}`, error);
                }
            }
            this.migratedCounts.agents = migrated;
            this.logger.info(`Migrated ${migrated}/${jsonFiles.length} agents`);
        }
        catch (error) {
            this.logger.error('Failed to migrate agents:', error);
            throw error;
        }
    }
    /**
     * Migrate tasks (placeholder for future implementation)
     */
    async migrateTasks() {
        this.logger.info('Checking for internal tasks to migrate...');
        // This will be implemented when internal task system is added
        // For now, Task Master tasks remain external
        this.logger.info('Task migration skipped (Task Master remains external)');
    }
    /**
     * Convert project data to unified format
     */
    convertProjectToUnified(project) {
        const unified = {
            id: project.id,
            name: project.name,
            path: project.path,
            status: project.status?.toUpperCase() || 'ACTIVE',
            createdAt: new Date(project.createdAt || Date.now()),
            updatedAt: new Date(project.updatedAt || Date.now()),
            agentIds: project.agentIds || [],
            maxAgents: project.maxAgents || 10,
            taskMasterEnabled: project.taskMasterEnabled !== false,
            description: project.description,
            tags: project.tags || [],
            metadata: project.metadata || {}
        };
        // Add git repository info if available
        if (project.gitBranch || project.gitRemote) {
            unified.gitRepository = {
                branch: project.gitBranch || 'main',
                remote: project.gitRemote,
                isClean: true
            };
        }
        // Add port range if available
        if (project.portRange) {
            unified.portRange = project.portRange;
        }
        return unified;
    }
    /**
     * Convert agent data to unified format
     */
    async convertAgentToUnified(agent) {
        // Map legacy status to new unified status
        const statusMap = {
            'stopped': 'STOPPED',
            'running': 'RUNNING',
            'stopping': 'STOPPING',
            'starting': 'STARTING',
            'created': 'CREATED',
            'error': 'ERROR',
            'suspended': 'SUSPENDED'
        };
        const unifiedAgent = {
            id: agent.id,
            name: agent.name,
            projectId: agent.projectId || '',
            status: statusMap[agent.status?.toLowerCase()] || 'STOPPED',
            createdAt: new Date(agent.createdAt || Date.now()),
            updatedAt: new Date(agent.updatedAt || Date.now()),
            // Execution environment
            mode: agent.dockerEnabled !== false ? 'docker' : 'hybrid',
            branch: agent.branch || 'main',
            worktreePath: agent.worktreePath,
            // Optional fields
            tmuxSession: agent.sessionName,
            dockerContainer: agent.containerName,
            dockerImage: agent.dockerImage,
            dockerPorts: agent.dockerPorts || [],
            dockerVolumes: agent.dockerVolumes || [],
            dockerNetwork: agent.dockerNetwork,
            // Configuration
            autoAccept: agent.autoAccept || false,
            portRange: agent.port ? `${agent.port}-${agent.port + 10}` : undefined,
            environmentVars: agent.environment || {},
            // Task assignment
            currentTaskId: agent.currentTaskId,
            assignedTasks: agent.tasksAssigned || [],
            // Resource limits
            resourceLimits: agent.resourceLimits,
            // Metadata
            description: agent.description,
            tags: agent.tags || [],
            metadata: agent.metadata || {}
        };
        // Add optional date fields
        if (agent.lastActivity) {
            unifiedAgent.lastAccessedAt = new Date(agent.lastActivity);
        }
        // Auto-assign project if needed
        if (!unifiedAgent.projectId && unifiedAgent.worktreePath && !this.config.dryRun) {
            unifiedAgent.projectId = await this.findOrCreateProjectForAgent(unifiedAgent);
        }
        return unifiedAgent;
    }
    /**
     * Find or create project for orphaned agent
     */
    async findOrCreateProjectForAgent(agent) {
        const projects = await this.db.projects.findAll();
        const matchingProject = projects.find(p => agent.worktreePath.startsWith(p.path));
        if (matchingProject) {
            this.logger.info(`Auto-assigned agent ${agent.name} to project ${matchingProject.name}`);
            return matchingProject.id;
        }
        // Create new project
        const projectPath = path.dirname(agent.worktreePath);
        const projectName = path.basename(projectPath);
        const newProject = await this.db.projects.create({
            id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: projectName,
            path: projectPath,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            agentIds: [agent.id],
            maxAgents: 10,
            taskMasterEnabled: false,
            description: `Auto-created for agent ${agent.name}`,
            tags: [],
            metadata: {}
        });
        this.logger.info(`Created new project ${projectName} for agent ${agent.name}`);
        return newProject.id;
    }
    /**
     * Rollback the migration
     */
    async rollback() {
        this.logger.info('Rolling back migration...');
        try {
            // Restore all backups
            await this.restoreBackups();
            // Remove SQLite database
            const dbPath = this.db.getDatabasePath();
            if (await fs.pathExists(dbPath)) {
                await fs.remove(dbPath);
                this.logger.info('Removed SQLite database');
            }
            this.logger.info('Rollback completed successfully');
        }
        catch (error) {
            this.logger.error('Rollback failed:', error);
            throw error;
        }
    }
    /**
     * Verify migration integrity
     */
    async verify() {
        this.logger.info('Verifying migration integrity...');
        try {
            await this.db.initialize();
            // Check project count
            const projectsPath = path.join(this.configService.getDataDir(), 'projects', 'projects.json');
            if (await fs.pathExists(projectsPath)) {
                const jsonData = await fs.readJson(projectsPath);
                const jsonProjects = jsonData.projects || [];
                const dbProjects = await this.db.projects.findAll();
                if (jsonProjects.length !== dbProjects.length) {
                    this.logger.error(`Project count mismatch: JSON=${jsonProjects.length}, DB=${dbProjects.length}`);
                    return false;
                }
            }
            // Check agent count
            const agentsDir = path.join(this.configService.getDataDir(), 'agents');
            if (await fs.pathExists(agentsDir)) {
                const files = await fs.readdir(agentsDir);
                const jsonAgents = files.filter(f => f.endsWith('.json') && !f.endsWith('.backup'));
                const dbAgents = await this.db.agents.findAll();
                if (jsonAgents.length !== dbAgents.length) {
                    this.logger.error(`Agent count mismatch: JSON=${jsonAgents.length}, DB=${dbAgents.length}`);
                    return false;
                }
            }
            this.logger.info('Migration verification passed');
            return true;
        }
        catch (error) {
            this.logger.error('Verification failed:', error);
            return false;
        }
        finally {
            await this.db.close();
        }
    }
}
exports.JsonToSqliteMigration = JsonToSqliteMigration;
// CLI execution support
if (require.main === module) {
    const migration = new JsonToSqliteMigration();
    const command = process.argv[2];
    const options = {
        dryRun: process.argv.includes('--dry-run'),
        verbose: process.argv.includes('--verbose')
    };
    if (command === 'rollback') {
        migration.rollback()
            .then(() => {
            console.log('Rollback completed');
            process.exit(0);
        })
            .catch((error) => {
            console.error('Rollback failed:', error);
            process.exit(1);
        });
    }
    else if (command === 'verify') {
        migration.verify()
            .then((isValid) => {
            console.log(`Verification ${isValid ? 'passed' : 'failed'}`);
            process.exit(isValid ? 0 : 1);
        })
            .catch((error) => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
    }
    else {
        migration.migrate(options)
            .then((result) => {
            process.exit(result.success ? 0 : 1);
        })
            .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
    }
}
//# sourceMappingURL=JsonToSqliteMigration.js.map