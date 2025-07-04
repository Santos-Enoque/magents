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
exports.DatabaseService = void 0;
const shared_1 = require("@magents/shared");
const ProjectService_1 = require("./ProjectService");
const AgentService_1 = require("./AgentService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Backend Database Service for managing database connections and initialization
 * This service handles the lifecycle of database connections for the backend
 */
class DatabaseService {
    constructor() {
        this.initialized = false;
        this.db = new shared_1.UnifiedDatabaseService();
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * Initialize database connection and migrate services if database exists
     */
    async initialize() {
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
                ProjectService_1.ProjectService.useDatabaseImplementation();
                AgentService_1.AgentService.useDatabaseImplementation();
                console.log('[DatabaseService] Services switched to database implementations');
                // Start health monitoring
                this.startHealthCheck();
                this.initialized = true;
                console.log('[DatabaseService] Database service initialized successfully');
            }
            else {
                console.log('[DatabaseService] No database found, using file-based implementations');
                this.initialized = true;
            }
        }
        catch (error) {
            console.error('[DatabaseService] Failed to initialize database:', error);
            throw error;
        }
    }
    /**
     * Check if database is available and initialized
     */
    isAvailable() {
        const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
        return fs.existsSync(dbPath) && this.initialized;
    }
    /**
     * Get database health status
     */
    async getHealthStatus() {
        try {
            if (!this.isAvailable()) {
                return {
                    status: 'unavailable',
                    message: 'Database not available or not initialized'
                };
            }
            // Try a simple database operation
            const projects = await this.db.projects.findAll();
            const agents = await this.db.agents.findAll();
            return {
                status: 'healthy',
                message: 'Database is healthy',
                details: {
                    projectCount: projects.length,
                    agentCount: agents.length,
                    dbPath: this.db.getDatabasePath()
                }
            };
        }
        catch (error) {
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
    async getStatistics() {
        if (!this.isAvailable()) {
            throw new Error('Database not available');
        }
        const projects = await this.db.projects.findAll();
        const agents = await this.db.agents.findAll();
        const configs = await this.db.configRepo.findAll();
        const dbPath = this.db.getDatabasePath();
        let dbSize = 0;
        try {
            const stats = fs.statSync(dbPath);
            dbSize = stats.size;
        }
        catch (error) {
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
    async forceMigration() {
        console.log('[DatabaseService] Forcing migration to database...');
        // Initialize database if not already done
        await this.db.initialize();
        // Switch services to database implementations
        ProjectService_1.ProjectService.useDatabaseImplementation();
        AgentService_1.AgentService.useDatabaseImplementation();
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
    startHealthCheck() {
        if (this.healthCheckInterval) {
            return;
        }
        this.healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.getHealthStatus();
                if (health.status === 'unhealthy') {
                    console.error('[DatabaseService] Health check failed:', health.message);
                }
            }
            catch (error) {
                console.error('[DatabaseService] Health check error:', error);
            }
        }, 30000); // Check every 30 seconds
        console.log('[DatabaseService] Health monitoring started');
    }
    /**
     * Stop health checks
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
            console.log('[DatabaseService] Health monitoring stopped');
        }
    }
    /**
     * Gracefully shutdown database connections
     */
    async shutdown() {
        console.log('[DatabaseService] Shutting down...');
        this.stopHealthCheck();
        try {
            // The UnifiedDatabaseService doesn't have an explicit close method
            // but better-sqlite3 connections are automatically closed when the process ends
            console.log('[DatabaseService] Database connections closed');
        }
        catch (error) {
            console.error('[DatabaseService] Error during shutdown:', error);
        }
        this.initialized = false;
        console.log('[DatabaseService] Database service shutdown complete');
    }
    /**
     * Execute a transaction across multiple operations
     */
    async executeTransaction(operations) {
        if (!this.isAvailable()) {
            throw new Error('Database not available for transactions');
        }
        return await this.db.transaction(operations);
    }
    /**
     * Get the underlying database service (for advanced usage)
     */
    getDatabase() {
        if (!this.isAvailable()) {
            throw new Error('Database not available');
        }
        return this.db;
    }
    /**
     * Reset database service (useful for testing)
     */
    static reset() {
        if (DatabaseService.instance) {
            DatabaseService.instance.shutdown();
        }
        DatabaseService.instance = null;
        // Reset other services
        ProjectService_1.ProjectService.reset();
        AgentService_1.AgentService.reset();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map