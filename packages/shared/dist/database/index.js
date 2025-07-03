"use strict";
/**
 * Unified Database Service for Magents
 *
 * This module provides SQLite database functionality with migration support,
 * connection management, and proper cleanup for the unified data model.
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
exports.createInMemoryDatabase = exports.createDatabase = exports.DatabaseFactory = exports.EventRepository = exports.ConfigRepository = exports.TaskRepository = exports.ProjectRepository = exports.AgentRepository = exports.BaseRepository = exports.UnifiedDatabaseService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const unified_1 = require("../types/unified");
class UnifiedDatabaseService {
    constructor(config = {}) {
        this.connection = null;
        this.config = {
            dbPath: config.dbPath || this.getDefaultDbPath(),
            inMemory: config.inMemory || false,
            readOnly: config.readOnly || false,
            timeout: config.timeout || 5000,
            verbose: config.verbose || false,
            ...config,
        };
    }
    /**
     * Initialize the database connection and run migrations
     */
    async initialize() {
        if (this.connection) {
            return this.connection;
        }
        try {
            // Create database directory if needed
            if (!this.config.inMemory && this.config.dbPath) {
                const dbDir = path.dirname(this.config.dbPath);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }
            }
            // Import better-sqlite3 dynamically to handle environments where it might not be available
            const Database = await this.importDatabase();
            // Create database connection
            const dbPath = this.config.inMemory ? ':memory:' : this.config.dbPath;
            const db = new Database(dbPath, {
                readonly: this.config.readOnly,
                timeout: this.config.timeout,
                verbose: this.config.verbose ? console.log : undefined,
            });
            // Enable foreign keys and optimize settings
            db.pragma('foreign_keys = ON');
            db.pragma('journal_mode = WAL');
            db.pragma('synchronous = NORMAL');
            db.pragma('temp_store = MEMORY');
            db.pragma('mmap_size = 268435456'); // 256MB
            this.connection = {
                db,
                version: await this.getCurrentVersion(db),
                path: dbPath,
                isReadOnly: this.config.readOnly || false,
            };
            // Run migrations if not read-only
            if (!this.config.readOnly) {
                await this.runMigrations();
            }
            // Initialize repositories
            this.projects = new ProjectRepository(this);
            this.agents = new AgentRepository(this);
            this.tasks = new TaskRepository(this);
            this.configRepo = new ConfigRepository(this);
            this.events = new EventRepository(this);
            return this.connection;
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get the current database connection
     */
    getConnection() {
        if (!this.connection) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.connection;
    }
    /**
     * Run pending migrations
     */
    async runMigrations() {
        const conn = this.getConnection();
        const currentVersion = conn.version;
        const targetVersion = unified_1.DATABASE_VERSION;
        const result = {
            success: true,
            fromVersion: currentVersion,
            toVersion: targetVersion,
            migrationsApplied: [],
            errors: [],
        };
        if (currentVersion >= targetVersion) {
            return result; // No migrations needed
        }
        try {
            // Ensure migrations table exists
            await this.ensureMigrationsTable();
            // Get pending migrations
            const pendingMigrations = unified_1.MIGRATIONS.filter(m => m.version > currentVersion);
            // Run migrations in transaction
            const transaction = conn.db.transaction(() => {
                for (const migration of pendingMigrations) {
                    try {
                        console.log(`Running migration ${migration.version}: ${migration.name}`);
                        // Execute migration queries
                        for (const query of migration.up) {
                            conn.db.exec(query);
                        }
                        // Record migration
                        const stmt = conn.db.prepare(`
              INSERT INTO migrations (version, name, executed_at)
              VALUES (?, ?, ?)
            `);
                        stmt.run(migration.version, migration.name, new Date().toISOString());
                        result.migrationsApplied.push(`${migration.version}: ${migration.name}`);
                    }
                    catch (error) {
                        const errorMsg = `Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                        console.error(errorMsg);
                        result.errors.push(errorMsg);
                        throw error;
                    }
                }
            });
            transaction();
            // Update connection version
            conn.version = targetVersion;
            result.toVersion = targetVersion;
        }
        catch (error) {
            result.success = false;
            console.error('Migration failed:', error);
        }
        return result;
    }
    /**
     * Close the database connection
     */
    async close() {
        if (this.connection) {
            try {
                this.connection.db.close();
                this.connection = null;
            }
            catch (error) {
                console.error('Error closing database:', error);
                throw error;
            }
        }
    }
    /**
     * Create a backup of the database
     */
    async backup(backupPath) {
        const conn = this.getConnection();
        if (conn.path === ':memory:') {
            throw new Error('Cannot backup in-memory database');
        }
        try {
            // Create backup directory if needed
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            // Use better-sqlite3's backup method
            const Database = await this.importDatabase();
            const backupDb = new Database(backupPath);
            await conn.db.backup(backupDb);
            backupDb.close();
            console.log(`Database backed up to: ${backupPath}`);
        }
        catch (error) {
            console.error('Backup failed:', error);
            throw new Error(`Database backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Restore database from backup
     */
    async restore(backupPath) {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        try {
            // Close current connection
            await this.close();
            // Copy backup to current database path
            if (this.config.dbPath && !this.config.inMemory) {
                fs.copyFileSync(backupPath, this.config.dbPath);
            }
            // Reinitialize
            await this.initialize();
            console.log(`Database restored from: ${backupPath}`);
        }
        catch (error) {
            console.error('Restore failed:', error);
            throw new Error(`Database restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Execute a raw SQL query
     */
    execute(query, params = []) {
        const conn = this.getConnection();
        if (conn.isReadOnly && this.isWriteQuery(query)) {
            throw new Error('Write operations not allowed on read-only database');
        }
        try {
            const stmt = conn.db.prepare(query);
            return stmt.all(params);
        }
        catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }
    /**
     * Execute a prepared statement
     */
    prepare(query) {
        const conn = this.getConnection();
        return conn.db.prepare(query);
    }
    /**
     * Get database statistics
     */
    getStats() {
        const conn = this.getConnection();
        return {
            version: conn.version,
            path: conn.path,
            isReadOnly: conn.isReadOnly,
            pageCount: conn.db.pragma('page_count', { simple: true }),
            pageSize: conn.db.pragma('page_size', { simple: true }),
            freelistCount: conn.db.pragma('freelist_count', { simple: true }),
            walMode: conn.db.pragma('journal_mode', { simple: true }),
            foreignKeys: conn.db.pragma('foreign_keys', { simple: true }),
            tables: this.getTables(),
        };
    }
    /**
     * Get list of tables
     */
    getTables() {
        const conn = this.getConnection();
        const result = conn.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
        return result.map(row => row.name);
    }
    /**
     * Get current database version
     */
    async getCurrentVersion(db) {
        try {
            // Check if migrations table exists
            const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name = 'migrations'
      `).get();
            if (!tableExists) {
                return 0;
            }
            // Get latest migration version
            const result = db.prepare(`
        SELECT MAX(version) as version FROM migrations
      `).get();
            return result?.version || 0;
        }
        catch (error) {
            console.warn('Could not determine database version:', error);
            return 0;
        }
    }
    /**
     * Ensure migrations table exists
     */
    async ensureMigrationsTable() {
        const conn = this.getConnection();
        conn.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME NOT NULL
      )
    `);
    }
    /**
     * Get default database path
     */
    getDefaultDbPath() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        const magentsDir = path.join(homeDir, '.magents');
        if (!fs.existsSync(magentsDir)) {
            fs.mkdirSync(magentsDir, { recursive: true });
        }
        return path.join(magentsDir, 'magents.db');
    }
    /**
     * Get the database path (public method for migration tools)
     */
    getDatabasePath() {
        if (this.connection) {
            return this.connection.path;
        }
        return this.config.dbPath || this.getDefaultDbPath();
    }
    /**
     * Check if query is a write operation
     */
    isWriteQuery(query) {
        const writePatterns = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\s/i;
        return writePatterns.test(query.trim());
    }
    /**
     * Execute multiple operations in a transaction
     * Automatically rolls back if any operation fails
     *
     * Note: Since better-sqlite3 doesn't support async in transactions,
     * this method converts async operations to sync within the transaction
     */
    async transaction(operations) {
        if (!this.connection) {
            throw new Error('Database not initialized');
        }
        // For async operations, we'll execute them immediately but wrap the whole thing
        // in a try-catch to handle rollback manually if needed
        let result;
        this.connection.db.exec('BEGIN IMMEDIATE');
        try {
            result = await operations(this);
            this.connection.db.exec('COMMIT');
            return result;
        }
        catch (error) {
            this.connection.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Execute multiple operations in a synchronous transaction
     * Use this for operations that don't need async/await
     * This is more efficient as it uses better-sqlite3's native transaction support
     */
    syncTransaction(operations) {
        if (!this.connection) {
            throw new Error('Database not initialized');
        }
        const sqliteTransaction = this.connection.db.transaction(() => {
            return operations(this);
        });
        return sqliteTransaction();
    }
    /**
     * Dynamic import of better-sqlite3 to handle optional dependency
     */
    async importDatabase() {
        try {
            // Use eval to avoid TypeScript compilation errors when better-sqlite3 is not installed
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const { default: Database } = await dynamicImport('better-sqlite3');
            return Database;
        }
        catch (error) {
            throw new Error('better-sqlite3 is required but not installed. ' +
                'Install it with: npm install better-sqlite3');
        }
    }
}
exports.UnifiedDatabaseService = UnifiedDatabaseService;
// ============================================================================
// Repository Classes for Data Access
// ============================================================================
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    /**
     * Find record by ID
     */
    findById(id) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        const row = stmt.get(id);
        return row ? this.deserialize(row) : null;
    }
    /**
     * Find all records
     */
    findAll() {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`);
        const rows = stmt.all();
        return rows.map((row) => this.deserialize(row));
    }
    /**
     * Find records by criteria
     */
    findBy(criteria) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${whereClause}`);
        const rows = stmt.all(values);
        return rows.map((row) => this.deserialize(row));
    }
    /**
     * Create new record
     */
    create(data) {
        const serialized = this.serialize(data);
        const keys = Object.keys(serialized);
        const values = Object.values(serialized);
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
    `);
        stmt.run(values);
        return data;
    }
    /**
     * Update existing record
     */
    update(id, data) {
        const existing = this.findById(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...data };
        const serialized = this.serialize(updated);
        const keys = Object.keys(serialized);
        const values = Object.values(serialized);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const stmt = this.db.prepare(`
      UPDATE ${this.tableName} 
      SET ${setClause} 
      WHERE id = ?
    `);
        stmt.run([...values, id]);
        return updated;
    }
    /**
     * Delete record by ID
     */
    delete(id) {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Count records
     */
    count() {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
        const result = stmt.get();
        return result.count;
    }
    /**
     * Serialize data for database storage
     */
    serialize(data) {
        const result = { ...data };
        // Convert objects and arrays to JSON strings
        for (const [key, value] of Object.entries(result)) {
            if (value && typeof value === 'object' && !(value instanceof Date)) {
                result[key] = JSON.stringify(value);
            }
        }
        return result;
    }
    /**
     * Deserialize data from database
     */
    deserialize(row) {
        const result = { ...row };
        // Parse JSON fields back to objects
        const jsonFields = this.getJsonFields();
        for (const field of jsonFields) {
            if (result[field] && typeof result[field] === 'string') {
                try {
                    result[field] = JSON.parse(result[field]);
                }
                catch (error) {
                    console.warn(`Failed to parse JSON field ${field}:`, error);
                }
            }
        }
        // Convert date strings back to Date objects
        const dateFields = this.getDateFields();
        for (const field of dateFields) {
            if (result[field] && typeof result[field] === 'string') {
                result[field] = new Date(result[field]);
            }
        }
        return result;
    }
    /**
     * Get list of fields that should be stored as JSON
     */
    getJsonFields() {
        return [];
    }
    /**
     * Get list of fields that should be converted to Date objects
     */
    getDateFields() {
        return ['created_at', 'updated_at', 'last_accessed_at', 'assigned_at', 'started_at', 'completed_at'];
    }
}
exports.BaseRepository = BaseRepository;
// ============================================================================
// Specific Repository Implementations
// ============================================================================
class AgentRepository extends BaseRepository {
    constructor(db) {
        super(db, 'agents');
    }
    getJsonFields() {
        return ['docker_ports', 'docker_volumes', 'environment_vars', 'assigned_tasks', 'resource_limits', 'tags', 'metadata'];
    }
    serialize(data) {
        const result = super.serialize(data);
        // Convert camelCase to snake_case for database storage
        result.project_id = result.projectId;
        delete result.projectId;
        result.tmux_session = result.tmuxSession;
        delete result.tmuxSession;
        result.docker_container = result.dockerContainer;
        delete result.dockerContainer;
        result.docker_image = result.dockerImage;
        delete result.dockerImage;
        result.docker_ports = result.dockerPorts;
        delete result.dockerPorts;
        result.docker_volumes = result.dockerVolumes;
        delete result.dockerVolumes;
        result.docker_network = result.dockerNetwork;
        delete result.dockerNetwork;
        result.auto_accept = result.autoAccept;
        delete result.autoAccept;
        result.port_range = result.portRange;
        delete result.portRange;
        result.environment_vars = result.environmentVars;
        delete result.environmentVars;
        result.current_task_id = result.currentTaskId;
        delete result.currentTaskId;
        result.assigned_tasks = result.assignedTasks;
        delete result.assignedTasks;
        result.resource_limits = result.resourceLimits;
        delete result.resourceLimits;
        result.worktree_path = result.worktreePath;
        delete result.worktreePath;
        result.last_accessed_at = result.lastAccessedAt;
        delete result.lastAccessedAt;
        return result;
    }
    deserialize(row) {
        const result = super.deserialize(row);
        // Convert snake_case to camelCase after base class has parsed JSON
        result.projectId = result.project_id;
        delete result.project_id;
        result.tmuxSession = result.tmux_session;
        delete result.tmux_session;
        result.dockerContainer = result.docker_container;
        delete result.docker_container;
        result.dockerImage = result.docker_image;
        delete result.docker_image;
        result.dockerPorts = result.docker_ports || [];
        delete result.docker_ports;
        result.dockerVolumes = result.docker_volumes || [];
        delete result.docker_volumes;
        result.dockerNetwork = result.docker_network;
        delete result.docker_network;
        result.autoAccept = result.auto_accept || false;
        delete result.auto_accept;
        result.portRange = result.port_range;
        delete result.port_range;
        result.environmentVars = result.environment_vars || {};
        delete result.environment_vars;
        result.currentTaskId = result.current_task_id;
        delete result.current_task_id;
        result.assignedTasks = result.assigned_tasks || [];
        delete result.assigned_tasks;
        result.resourceLimits = result.resource_limits;
        delete result.resource_limits;
        result.worktreePath = result.worktree_path;
        delete result.worktree_path;
        result.lastAccessedAt = result.last_accessed_at;
        delete result.last_accessed_at;
        return result;
    }
    findByProject(projectId) {
        return this.findBy({ projectId });
    }
    findByStatus(status) {
        return this.findBy({ status });
    }
}
exports.AgentRepository = AgentRepository;
class ProjectRepository extends BaseRepository {
    constructor(db) {
        super(db, 'projects');
    }
    getJsonFields() {
        return ['git_repository', 'agent_ids', 'port_range', 'task_master_config', 'project_type', 'tags', 'metadata'];
    }
    serialize(data) {
        const result = super.serialize(data);
        // Convert camelCase to snake_case for database storage
        result.agent_ids = result.agentIds;
        delete result.agentIds;
        result.git_repository = result.gitRepository;
        delete result.gitRepository;
        result.port_range = result.portRange;
        delete result.portRange;
        result.task_master_config = result.taskMasterConfig;
        delete result.taskMasterConfig;
        result.project_type = result.projectType;
        delete result.projectType;
        result.task_master_enabled = result.taskMasterEnabled;
        delete result.taskMasterEnabled;
        result.max_agents = result.maxAgents;
        delete result.maxAgents;
        result.docker_network = result.dockerNetwork;
        delete result.dockerNetwork;
        result.last_accessed_at = result.lastAccessedAt;
        delete result.lastAccessedAt;
        return result;
    }
    deserialize(row) {
        const result = super.deserialize(row);
        // Convert snake_case fields to camelCase (after base class has parsed JSON)
        if (result.agent_ids !== undefined) {
            result.agentIds = result.agent_ids || [];
            delete result.agent_ids;
        }
        if (result.git_repository !== undefined) {
            result.gitRepository = result.git_repository || {};
            delete result.git_repository;
        }
        if (result.port_range !== undefined) {
            result.portRange = result.port_range || {};
            delete result.port_range;
        }
        if (result.task_master_config !== undefined) {
            result.taskMasterConfig = result.task_master_config || {};
            delete result.task_master_config;
        }
        if (result.project_type !== undefined) {
            result.projectType = result.project_type || {};
            delete result.project_type;
        }
        if (result.task_master_enabled !== undefined) {
            result.taskMasterEnabled = result.task_master_enabled || false;
            delete result.task_master_enabled;
        }
        if (result.max_agents !== undefined) {
            result.maxAgents = result.max_agents || 0;
            delete result.max_agents;
        }
        if (result.docker_network !== undefined) {
            result.dockerNetwork = result.docker_network;
            delete result.docker_network;
        }
        if (result.last_accessed_at !== undefined) {
            result.lastAccessedAt = result.last_accessed_at;
            delete result.last_accessed_at;
        }
        return result;
    }
    findByStatus(status) {
        return this.findBy({ status });
    }
    findByPath(path) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
        const row = stmt.get(path);
        return row ? this.deserialize(row) : null;
    }
}
exports.ProjectRepository = ProjectRepository;
class TaskRepository extends BaseRepository {
    constructor(db) {
        super(db, 'tasks');
    }
    getJsonFields() {
        return ['subtask_ids', 'dependencies', 'test_results', 'tags', 'metadata'];
    }
    findByProject(projectId) {
        return this.findBy({ projectId });
    }
    findByAgent(agentId) {
        return this.findBy({ assignedToAgentId: agentId });
    }
    findByStatus(status) {
        return this.findBy({ status });
    }
    findSubtasks(parentTaskId) {
        return this.findBy({ parentTaskId });
    }
}
exports.TaskRepository = TaskRepository;
class ConfigRepository extends BaseRepository {
    constructor(db) {
        super(db, 'config');
    }
    getJsonFields() {
        return ['docker_config', 'ports_config', 'task_master_config', 'paths_config'];
    }
    getGlobalConfig() {
        return this.findById('global');
    }
    updateGlobalConfig(config) {
        return this.update('global', config);
    }
}
exports.ConfigRepository = ConfigRepository;
class EventRepository extends BaseRepository {
    constructor(db) {
        super(db, 'events');
    }
    getJsonFields() {
        return ['data', 'previous_data', 'metadata'];
    }
    findByEntity(entityId) {
        return this.findBy({ entityId });
    }
    findByType(type) {
        return this.findBy({ type });
    }
    findRecent(limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
        const rows = stmt.all(limit);
        return rows.map((row) => this.deserialize(row));
    }
}
exports.EventRepository = EventRepository;
// ============================================================================
// Database Factory and Utilities
// ============================================================================
class DatabaseFactory {
    static async create(config = {}) {
        const key = config.dbPath || 'default';
        if (!this.instances.has(key)) {
            const db = new UnifiedDatabaseService(config);
            await db.initialize();
            this.instances.set(key, db);
        }
        return this.instances.get(key);
    }
    static async createInMemory() {
        const db = new UnifiedDatabaseService({ inMemory: true });
        await db.initialize();
        return db;
    }
    static async closeAll() {
        for (const [key, db] of this.instances) {
            await db.close();
            this.instances.delete(key);
        }
    }
}
exports.DatabaseFactory = DatabaseFactory;
DatabaseFactory.instances = new Map();
// Export default database instance
exports.createDatabase = DatabaseFactory.create;
exports.createInMemoryDatabase = DatabaseFactory.createInMemory;
//# sourceMappingURL=index.js.map