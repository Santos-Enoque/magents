"use strict";
/**
 * Atomic Operations Service
 *
 * This service provides advanced atomic operations for the unified data model,
 * including batch operations, rollback capabilities, and data consistency guarantees.
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
exports.createAtomicOperationsService = exports.AtomicOperationsService = void 0;
const database_1 = require("../database");
const utils_1 = require("../utils");
class AtomicOperationsService {
    constructor(db) {
        this.db = db;
        this.agentRepo = new database_1.AgentRepository(db);
        this.projectRepo = new database_1.ProjectRepository(db);
        this.taskRepo = new database_1.TaskRepository(db);
        this.configRepo = new database_1.ConfigRepository(db);
        this.eventRepo = new database_1.EventRepository(db);
    }
    /**
     * Execute multiple operations atomically
     */
    async executeBatch(operations) {
        const result = {
            success: true,
            operationsApplied: 0,
            operationsFailed: 0,
            errors: [],
            rollbackPerformed: false,
            operationResults: [],
        };
        if (operations.length === 0) {
            return result;
        }
        try {
            // Execute all operations in a single transaction
            this.db.syncTransaction(() => {
                for (const operation of operations) {
                    try {
                        this.executeOperation(operation);
                        result.operationsApplied++;
                        result.operationResults.push({
                            operationId: operation.id,
                            success: true,
                        });
                    }
                    catch (error) {
                        const errorMsg = `Operation ${operation.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                        result.errors.push(errorMsg);
                        result.operationsFailed++;
                        result.operationResults.push({
                            operationId: operation.id,
                            success: false,
                            error: errorMsg,
                        });
                        throw error; // This will cause the transaction to rollback
                    }
                }
            });
        }
        catch (error) {
            result.success = false;
            result.rollbackPerformed = true;
            console.error('Batch operation failed, transaction rolled back:', error);
        }
        return result;
    }
    /**
     * Create a comprehensive backup with metadata
     */
    async createBackup(description) {
        const timestamp = new Date();
        const backupId = (0, utils_1.generateId)();
        const fileName = `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}-${backupId}.db`;
        const backupPath = this.getBackupPath(fileName);
        try {
            // Create the backup
            await this.db.backup(backupPath);
            // Get file stats
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const stats = fs.statSync(backupPath);
            // Create backup metadata
            const metadata = {
                id: backupId,
                timestamp,
                filePath: backupPath,
                size: stats.size,
                description: description || `Automatic backup created at ${timestamp.toISOString()}`,
                autoCreated: !description,
                dataVersion: await this.getDatabaseVersion(),
            };
            // Store backup metadata in database
            this.storeBackupMetadata(metadata);
            console.log(`Backup created: ${backupPath} (${stats.size} bytes)`);
            return metadata;
        }
        catch (error) {
            throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Restore from backup with comprehensive validation
     */
    async restoreFromBackup(backupPath, options = {}) {
        const { validateBeforeRestore = true, createBackupBeforeRestore = true, skipVersionCheck = false, dryRun = false, } = options;
        try {
            // Validate backup file exists and is readable
            if (validateBeforeRestore) {
                await this.validateBackupFile(backupPath);
            }
            // Create backup of current state before restore
            if (createBackupBeforeRestore && !dryRun) {
                await this.createBackup('Pre-restore backup');
            }
            // Dry run validation
            if (dryRun) {
                console.log('[DRY RUN] Restore validation passed');
                return;
            }
            // Perform the restore
            await this.db.restore(backupPath);
            // Validate restored data
            if (validateBeforeRestore) {
                await this.validateRestoredData();
            }
            console.log(`Database successfully restored from: ${backupPath}`);
        }
        catch (error) {
            throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create savepoint for rollback capability
     */
    createSavepoint(name) {
        this.db.execute(`SAVEPOINT ${name}`);
    }
    /**
     * Rollback to savepoint
     */
    rollbackToSavepoint(name) {
        this.db.execute(`ROLLBACK TO SAVEPOINT ${name}`);
    }
    /**
     * Release savepoint
     */
    releaseSavepoint(name) {
        this.db.execute(`RELEASE SAVEPOINT ${name}`);
    }
    /**
     * Bulk agent operations
     */
    async bulkAgentOperations(operations) {
        const atomicOps = [];
        // Convert to atomic operations
        operations.create?.forEach(agent => {
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'create',
                entityType: 'agent',
                entityId: agent.id,
                data: agent,
                timestamp: new Date(),
            });
        });
        operations.update?.forEach(update => {
            const previousData = this.agentRepo.findById(update.id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'update',
                entityType: 'agent',
                entityId: update.id,
                data: update.data,
                previousData,
                timestamp: new Date(),
            });
        });
        operations.delete?.forEach(id => {
            const previousData = this.agentRepo.findById(id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'delete',
                entityType: 'agent',
                entityId: id,
                previousData,
                timestamp: new Date(),
            });
        });
        return this.executeBatch(atomicOps);
    }
    /**
     * Bulk project operations
     */
    async bulkProjectOperations(operations) {
        const atomicOps = [];
        operations.create?.forEach(project => {
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'create',
                entityType: 'project',
                entityId: project.id,
                data: project,
                timestamp: new Date(),
            });
        });
        operations.update?.forEach(update => {
            const previousData = this.projectRepo.findById(update.id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'update',
                entityType: 'project',
                entityId: update.id,
                data: update.data,
                previousData,
                timestamp: new Date(),
            });
        });
        operations.delete?.forEach(id => {
            const previousData = this.projectRepo.findById(id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'delete',
                entityType: 'project',
                entityId: id,
                previousData,
                timestamp: new Date(),
            });
        });
        return this.executeBatch(atomicOps);
    }
    /**
     * Bulk task operations
     */
    async bulkTaskOperations(operations) {
        const atomicOps = [];
        operations.create?.forEach(task => {
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'create',
                entityType: 'task',
                entityId: task.id,
                data: task,
                timestamp: new Date(),
            });
        });
        operations.update?.forEach(update => {
            const previousData = this.taskRepo.findById(update.id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'update',
                entityType: 'task',
                entityId: update.id,
                data: update.data,
                previousData,
                timestamp: new Date(),
            });
        });
        operations.delete?.forEach(id => {
            const previousData = this.taskRepo.findById(id);
            atomicOps.push({
                id: (0, utils_1.generateId)(),
                type: 'delete',
                entityType: 'task',
                entityId: id,
                previousData,
                timestamp: new Date(),
            });
        });
        return this.executeBatch(atomicOps);
    }
    /**
     * Get all backup metadata
     */
    getBackupHistory() {
        try {
            const stmt = this.db.prepare(`
        SELECT backup_metadata FROM config WHERE id = 'global'
      `);
            const result = stmt.get();
            if (result?.backup_metadata) {
                return JSON.parse(result.backup_metadata);
            }
            return [];
        }
        catch (error) {
            console.warn('Failed to retrieve backup history:', error);
            return [];
        }
    }
    /**
     * Clean up old backups
     */
    async cleanupOldBackups(retentionDays = 30, maxBackups = 10) {
        const history = this.getBackupHistory();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        // Filter backups to keep
        const toKeep = history
            .filter(backup => new Date(backup.timestamp) > cutoffDate || !backup.autoCreated)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxBackups);
        // Find backups to remove
        const toRemove = history.filter(backup => !toKeep.includes(backup));
        // Remove old backup files
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        for (const backup of toRemove) {
            try {
                if (fs.existsSync(backup.filePath)) {
                    fs.unlinkSync(backup.filePath);
                }
            }
            catch (error) {
                console.warn(`Failed to remove backup file ${backup.filePath}:`, error);
            }
        }
        // Update metadata
        this.storeBackupHistory(toKeep);
        console.log(`Cleaned up ${toRemove.length} old backups, kept ${toKeep.length}`);
    }
    executeOperation(operation) {
        switch (operation.entityType) {
            case 'agent':
                this.executeAgentOperation(operation);
                break;
            case 'project':
                this.executeProjectOperation(operation);
                break;
            case 'task':
                this.executeTaskOperation(operation);
                break;
            case 'config':
                this.executeConfigOperation(operation);
                break;
            case 'event':
                this.executeEventOperation(operation);
                break;
            default:
                throw new Error(`Unknown entity type: ${operation.entityType}`);
        }
    }
    executeAgentOperation(operation) {
        switch (operation.type) {
            case 'create':
                this.agentRepo.create(operation.data);
                break;
            case 'update':
                this.agentRepo.update(operation.entityId, operation.data);
                break;
            case 'delete':
                this.agentRepo.delete(operation.entityId);
                break;
        }
    }
    executeProjectOperation(operation) {
        switch (operation.type) {
            case 'create':
                this.projectRepo.create(operation.data);
                break;
            case 'update':
                this.projectRepo.update(operation.entityId, operation.data);
                break;
            case 'delete':
                this.projectRepo.delete(operation.entityId);
                break;
        }
    }
    executeTaskOperation(operation) {
        switch (operation.type) {
            case 'create':
                this.taskRepo.create(operation.data);
                break;
            case 'update':
                this.taskRepo.update(operation.entityId, operation.data);
                break;
            case 'delete':
                this.taskRepo.delete(operation.entityId);
                break;
        }
    }
    executeConfigOperation(operation) {
        switch (operation.type) {
            case 'create':
            case 'update':
                this.configRepo.updateGlobalConfig(operation.data);
                break;
        }
    }
    executeEventOperation(operation) {
        switch (operation.type) {
            case 'create':
                this.eventRepo.create(operation.data);
                break;
            case 'update':
                this.eventRepo.update(operation.entityId, operation.data);
                break;
            case 'delete':
                this.eventRepo.delete(operation.entityId);
                break;
        }
    }
    async validateBackupFile(backupPath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        const stats = fs.statSync(backupPath);
        if (stats.size === 0) {
            throw new Error(`Backup file is empty: ${backupPath}`);
        }
        // TODO: Add SQLite header validation
        console.log(`Backup validation passed: ${backupPath} (${stats.size} bytes)`);
    }
    async validateRestoredData() {
        try {
            // Basic validation - check that key tables exist and have data
            const agents = this.agentRepo.findAll();
            const projects = this.projectRepo.findAll();
            console.log(`Restored data validation: ${agents.length} agents, ${projects.length} projects`);
        }
        catch (error) {
            throw new Error(`Data validation failed after restore: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getDatabaseVersion() {
        try {
            const stmt = this.db.prepare('SELECT version FROM migrations ORDER BY version DESC LIMIT 1');
            const result = stmt.get();
            return result?.version || 0;
        }
        catch (error) {
            return 0;
        }
    }
    getBackupPath(fileName) {
        const path = require('path');
        const os = require('os');
        const homeDir = process.env.HOME || process.env.USERPROFILE || os.tmpdir();
        const backupDir = path.join(homeDir, '.magents', 'backups');
        // Ensure backup directory exists
        const fs = require('fs');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        return path.join(backupDir, fileName);
    }
    storeBackupMetadata(metadata) {
        const history = this.getBackupHistory();
        history.push(metadata);
        this.storeBackupHistory(history);
    }
    storeBackupHistory(history) {
        try {
            // Store in global config
            const stmt = this.db.prepare(`
        UPDATE config 
        SET backup_metadata = ?
        WHERE id = 'global'
      `);
            stmt.run(JSON.stringify(history));
        }
        catch (error) {
            console.warn('Failed to store backup metadata:', error);
        }
    }
}
exports.AtomicOperationsService = AtomicOperationsService;
// Factory functions
const createAtomicOperationsService = (db) => {
    return new AtomicOperationsService(db);
};
exports.createAtomicOperationsService = createAtomicOperationsService;
exports.default = AtomicOperationsService;
//# sourceMappingURL=AtomicOperations.js.map