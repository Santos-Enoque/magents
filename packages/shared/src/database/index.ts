/**
 * Unified Database Service for Magents
 * 
 * This module provides SQLite database functionality with migration support,
 * connection management, and proper cleanup for the unified data model.
 */

import * as path from 'path';
import * as fs from 'fs';

// Type declaration for better-sqlite3 to handle optional dependency
interface Database {
  prepare(query: string): any;
  exec(query: string): any;
  close(): any;
  backup(target: Database): any;
  pragma(query: string, options?: any): any;
  transaction<T>(fn: () => T): () => T;
}
import {
  TABLE_SCHEMAS,
  INDEXES,
  MIGRATIONS,
  DATABASE_VERSION,
  MigrationDefinition,
  UnifiedAgentData,
  UnifiedProjectData,
  UnifiedTaskData,
  UnifiedConfigData,
  UnifiedEventData,
} from '../types/unified';

export interface DatabaseConfig {
  dbPath?: string;
  inMemory?: boolean;
  readOnly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export interface DatabaseConnection {
  db: Database;
  version: number;
  path: string;
  isReadOnly: boolean;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  migrationsApplied: string[];
  errors: string[];
}

export class UnifiedDatabaseService {
  private connection: DatabaseConnection | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
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
  async initialize(): Promise<DatabaseConnection> {
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
      const dbPath = this.config.inMemory ? ':memory:' : this.config.dbPath!;
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

      return this.connection;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current database connection
   */
  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    const conn = this.getConnection();
    const currentVersion = conn.version;
    const targetVersion = DATABASE_VERSION;
    
    const result: MigrationResult = {
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
      const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);

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
          } catch (error) {
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

    } catch (error) {
      result.success = false;
      console.error('Migration failed:', error);
    }

    return result;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      try {
        this.connection.db.close();
        this.connection = null;
      } catch (error) {
        console.error('Error closing database:', error);
        throw error;
      }
    }
  }

  /**
   * Create a backup of the database
   */
  async backup(backupPath: string): Promise<void> {
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
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error(`Database backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<void> {
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
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Database restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a raw SQL query
   */
  execute(query: string, params: any[] = []): any {
    const conn = this.getConnection();
    
    if (conn.isReadOnly && this.isWriteQuery(query)) {
      throw new Error('Write operations not allowed on read-only database');
    }

    try {
      const stmt = conn.db.prepare(query);
      return stmt.all(params);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a prepared statement
   */
  prepare(query: string) {
    const conn = this.getConnection();
    return conn.db.prepare(query);
  }

  /**
   * Start a transaction
   */
  transaction<T>(fn: () => T): T {
    const conn = this.getConnection();
    const transaction = conn.db.transaction(fn);
    return transaction();
  }

  /**
   * Get database statistics
   */
  getStats(): any {
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
  private getTables(): string[] {
    const conn = this.getConnection();
    const result = conn.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];
    
    return result.map(row => row.name);
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(db: Database): Promise<number> {
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
      `).get() as { version: number } | undefined;

      return result?.version || 0;
    } catch (error) {
      console.warn('Could not determine database version:', error);
      return 0;
    }
  }

  /**
   * Ensure migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
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
  private getDefaultDbPath(): string {
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
  getDatabasePath(): string {
    if (this.connection) {
      return this.connection.path;
    }
    return this.config.dbPath || this.getDefaultDbPath();
  }

  /**
   * Check if query is a write operation
   */
  private isWriteQuery(query: string): boolean {
    const writePatterns = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\s/i;
    return writePatterns.test(query.trim());
  }

  /**
   * Dynamic import of better-sqlite3 to handle optional dependency
   */
  private async importDatabase(): Promise<any> {
    try {
      // Use eval to avoid TypeScript compilation errors when better-sqlite3 is not installed
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const { default: Database } = await dynamicImport('better-sqlite3');
      return Database;
    } catch (error) {
      throw new Error(
        'better-sqlite3 is required but not installed. ' +
        'Install it with: npm install better-sqlite3'
      );
    }
  }
}

// ============================================================================
// Repository Classes for Data Access
// ============================================================================

export class BaseRepository<T> {
  protected db: UnifiedDatabaseService;
  protected tableName: string;

  constructor(db: UnifiedDatabaseService, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Find record by ID
   */
  findById(id: string): T | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    const row = stmt.get(id);
    return row ? this.deserialize(row) : null;
  }

  /**
   * Find all records
   */
  findAll(): T[] {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`);
    const rows = stmt.all();
    return rows.map((row: any) => this.deserialize(row));
  }

  /**
   * Find records by criteria
   */
  findBy(criteria: Partial<T>): T[] {
    const keys = Object.keys(criteria);
    const values = Object.values(criteria);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${whereClause}`);
    const rows = stmt.all(values);
    return rows.map((row: any) => this.deserialize(row));
  }

  /**
   * Create new record
   */
  create(data: T): T {
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
  update(id: string, data: Partial<T>): T | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...data } as T;
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
  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count records
   */
  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Serialize data for database storage
   */
  protected serialize(data: T): any {
    const result: any = { ...data };
    
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
  protected deserialize(row: any): T {
    const result: any = { ...row };
    
    // Parse JSON fields back to objects
    const jsonFields = this.getJsonFields();
    for (const field of jsonFields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (error) {
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
    
    return result as T;
  }

  /**
   * Get list of fields that should be stored as JSON
   */
  protected getJsonFields(): string[] {
    return [];
  }

  /**
   * Get list of fields that should be converted to Date objects
   */
  protected getDateFields(): string[] {
    return ['created_at', 'updated_at', 'last_accessed_at', 'assigned_at', 'started_at', 'completed_at'];
  }
}

// ============================================================================
// Specific Repository Implementations
// ============================================================================

export class AgentRepository extends BaseRepository<UnifiedAgentData> {
  constructor(db: UnifiedDatabaseService) {
    super(db, 'agents');
  }

  protected getJsonFields(): string[] {
    return ['docker_ports', 'docker_volumes', 'environment_vars', 'assigned_tasks', 'resource_limits', 'tags', 'metadata'];
  }

  findByProject(projectId: string): UnifiedAgentData[] {
    return this.findBy({ projectId } as any);
  }

  findByStatus(status: string): UnifiedAgentData[] {
    return this.findBy({ status } as any);
  }
}

export class ProjectRepository extends BaseRepository<UnifiedProjectData> {
  constructor(db: UnifiedDatabaseService) {
    super(db, 'projects');
  }

  protected getJsonFields(): string[] {
    return ['git_repository', 'agent_ids', 'port_range', 'task_master_config', 'project_type', 'tags', 'metadata'];
  }

  protected deserialize(row: any): UnifiedProjectData {
    const result = super.deserialize(row) as any;
    
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
    
    return result as UnifiedProjectData;
  }

  findByStatus(status: string): UnifiedProjectData[] {
    return this.findBy({ status } as any);
  }

  findByPath(path: string): UnifiedProjectData | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
    const row = stmt.get(path);
    return row ? this.deserialize(row) : null;
  }
}

export class TaskRepository extends BaseRepository<UnifiedTaskData> {
  constructor(db: UnifiedDatabaseService) {
    super(db, 'tasks');
  }

  protected getJsonFields(): string[] {
    return ['subtask_ids', 'dependencies', 'test_results', 'tags', 'metadata'];
  }

  findByProject(projectId: string): UnifiedTaskData[] {
    return this.findBy({ projectId } as any);
  }

  findByAgent(agentId: string): UnifiedTaskData[] {
    return this.findBy({ assignedToAgentId: agentId } as any);
  }

  findByStatus(status: string): UnifiedTaskData[] {
    return this.findBy({ status } as any);
  }

  findSubtasks(parentTaskId: string): UnifiedTaskData[] {
    return this.findBy({ parentTaskId } as any);
  }
}

export class ConfigRepository extends BaseRepository<UnifiedConfigData> {
  constructor(db: UnifiedDatabaseService) {
    super(db, 'config');
  }

  protected getJsonFields(): string[] {
    return ['docker_config', 'ports_config', 'task_master_config', 'paths_config'];
  }

  getGlobalConfig(): UnifiedConfigData | null {
    return this.findById('global');
  }

  updateGlobalConfig(config: Partial<UnifiedConfigData>): UnifiedConfigData | null {
    return this.update('global', config);
  }
}

export class EventRepository extends BaseRepository<UnifiedEventData> {
  constructor(db: UnifiedDatabaseService) {
    super(db, 'events');
  }

  protected getJsonFields(): string[] {
    return ['data', 'previous_data', 'metadata'];
  }

  findByEntity(entityId: string): UnifiedEventData[] {
    return this.findBy({ entityId } as any);
  }

  findByType(type: string): UnifiedEventData[] {
    return this.findBy({ type } as any);
  }

  findRecent(limit: number = 100): UnifiedEventData[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows.map((row: any) => this.deserialize(row));
  }
}

// ============================================================================
// Database Factory and Utilities
// ============================================================================

export class DatabaseFactory {
  private static instances = new Map<string, UnifiedDatabaseService>();

  static async create(config: DatabaseConfig = {}): Promise<UnifiedDatabaseService> {
    const key = config.dbPath || 'default';
    
    if (!this.instances.has(key)) {
      const db = new UnifiedDatabaseService(config);
      await db.initialize();
      this.instances.set(key, db);
    }
    
    return this.instances.get(key)!;
  }

  static async createInMemory(): Promise<UnifiedDatabaseService> {
    const db = new UnifiedDatabaseService({ inMemory: true });
    await db.initialize();
    return db;
  }

  static async closeAll(): Promise<void> {
    for (const [key, db] of this.instances) {
      await db.close();
      this.instances.delete(key);
    }
  }
}

// Export default database instance
export const createDatabase = DatabaseFactory.create;
export const createInMemoryDatabase = DatabaseFactory.createInMemory;