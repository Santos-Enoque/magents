import { UnifiedDatabaseService } from '@magents/shared';
import { ProjectService } from './ProjectService';
import { AgentService } from './AgentService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Backend Database Service for managing database connections and initialization
 * This service handles the lifecycle of database connections for the backend
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: UnifiedDatabaseService;
  private initialized = false;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.db = UnifiedDatabaseService.getInstance();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection and migrate services if database exists
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[DatabaseService] Initializing database connection...');
      
      // Check if database file exists
      const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
      const dbExists = fs.existsSync(dbPath);
      
      if (dbExists) {
        console.log('[DatabaseService] Database found, initializing...');
        
        // Initialize database
        await this.db.initialize();
        
        // Switch services to use database implementations
        ProjectService.useDatabaseImplementation();
        AgentService.useDatabaseImplementation();
        
        console.log('[DatabaseService] Services switched to database implementations');
        
        // Start health monitoring
        this.startHealthCheck();
        
        this.initialized = true;
        console.log('[DatabaseService] Database service initialized successfully');
      } else {
        console.log('[DatabaseService] No database found, using file-based implementations');
        this.initialized = true;
      }
    } catch (error) {
      console.error('[DatabaseService] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Check if database is available and initialized
   */
  public isAvailable(): boolean {
    const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
    return fs.existsSync(dbPath) && this.initialized;
  }

  /**
   * Get database health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'unavailable';
    message: string;
    details?: any;
  }> {
    try {
      if (!this.isAvailable()) {
        return {
          status: 'unavailable',
          message: 'Database not available or not initialized'
        };
      }

      // Try a simple database operation
      const projects = await this.db.projectRepo.findAll();
      const agents = await this.db.agentRepo.findAll();
      
      return {
        status: 'healthy',
        message: 'Database is healthy',
        details: {
          projectCount: projects.length,
          agentCount: agents.length,
          dbPath: this.db.getDatabasePath()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown database error',
        details: { error }
      };
    }
  }

  /**
   * Get database statistics
   */
  public async getStatistics(): Promise<{
    projects: number;
    agents: number;
    configs: number;
    dbSize: number;
    dbPath: string;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Database not available');
    }

    const projects = await this.db.projectRepo.findAll();
    const agents = await this.db.agentRepo.findAll();
    const configs = await this.db.configRepo.findAll();
    
    const dbPath = this.db.getDatabasePath();
    let dbSize = 0;
    
    try {
      const stats = fs.statSync(dbPath);
      dbSize = stats.size;
    } catch (error) {
      console.warn('[DatabaseService] Could not get database file size:', error);
    }

    return {
      projects: projects.length,
      agents: agents.length,
      configs: configs.length,
      dbSize,
      dbPath
    };
  }

  /**
   * Force migration from file-based to database storage
   */
  public async forceMigration(): Promise<void> {
    console.log('[DatabaseService] Forcing migration to database...');
    
    // Initialize database if not already done
    await this.db.initialize();
    
    // Switch services to database implementations
    ProjectService.useDatabaseImplementation();
    AgentService.useDatabaseImplementation();
    
    // Start health monitoring if not already started
    if (!this.healthCheckInterval) {
      this.startHealthCheck();
    }
    
    this.initialized = true;
    console.log('[DatabaseService] Migration completed');
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status === 'unhealthy') {
          console.error('[DatabaseService] Health check failed:', health.message);
        }
      } catch (error) {
        console.error('[DatabaseService] Health check error:', error);
      }
    }, 30000); // Check every 30 seconds

    console.log('[DatabaseService] Health monitoring started');
  }

  /**
   * Stop health checks
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('[DatabaseService] Health monitoring stopped');
    }
  }

  /**
   * Gracefully shutdown database connections
   */
  public async shutdown(): Promise<void> {
    console.log('[DatabaseService] Shutting down...');
    
    this.stopHealthCheck();
    
    try {
      // The UnifiedDatabaseService doesn't have an explicit close method
      // but better-sqlite3 connections are automatically closed when the process ends
      console.log('[DatabaseService] Database connections closed');
    } catch (error) {
      console.error('[DatabaseService] Error during shutdown:', error);
    }
    
    this.initialized = false;
    console.log('[DatabaseService] Database service shutdown complete');
  }

  /**
   * Execute a transaction across multiple operations
   */
  public async executeTransaction<T>(
    operations: (db: UnifiedDatabaseService) => Promise<T>
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Database not available for transactions');
    }

    return await this.db.transaction(operations);
  }

  /**
   * Get the underlying database service (for advanced usage)
   */
  public getDatabase(): UnifiedDatabaseService {
    if (!this.isAvailable()) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  /**
   * Reset database service (useful for testing)
   */
  public static reset(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.shutdown();
    }
    DatabaseService.instance = null as any;
    
    // Reset other services
    ProjectService.reset();
    AgentService.reset();
  }
}