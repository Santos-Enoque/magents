/**
 * Atomic Operations Service
 *
 * This service provides advanced atomic operations for the unified data model,
 * including batch operations, rollback capabilities, and data consistency guarantees.
 */
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData, EntityId } from '../types/unified';
import { UnifiedDatabaseService } from '../database';
export interface AtomicOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    entityType: 'agent' | 'project' | 'task' | 'config' | 'event';
    entityId: EntityId;
    data?: any;
    previousData?: any;
    timestamp: Date;
}
export interface BatchOperationResult {
    success: boolean;
    operationsApplied: number;
    operationsFailed: number;
    errors: string[];
    rollbackPerformed: boolean;
    operationResults: {
        operationId: string;
        success: boolean;
        error?: string;
    }[];
}
export interface BackupMetadata {
    id: string;
    timestamp: Date;
    filePath: string;
    size: number;
    checksum?: string;
    description?: string;
    autoCreated: boolean;
    dataVersion: number;
}
export interface RestoreOptions {
    validateBeforeRestore?: boolean;
    createBackupBeforeRestore?: boolean;
    skipVersionCheck?: boolean;
    dryRun?: boolean;
}
export declare class AtomicOperationsService {
    private db;
    private agentRepo;
    private projectRepo;
    private taskRepo;
    private configRepo;
    private eventRepo;
    constructor(db: UnifiedDatabaseService);
    /**
     * Execute multiple operations atomically
     */
    executeBatch(operations: AtomicOperation[]): Promise<BatchOperationResult>;
    /**
     * Create a comprehensive backup with metadata
     */
    createBackup(description?: string): Promise<BackupMetadata>;
    /**
     * Restore from backup with comprehensive validation
     */
    restoreFromBackup(backupPath: string, options?: RestoreOptions): Promise<void>;
    /**
     * Create savepoint for rollback capability
     */
    createSavepoint(name: string): void;
    /**
     * Rollback to savepoint
     */
    rollbackToSavepoint(name: string): void;
    /**
     * Release savepoint
     */
    releaseSavepoint(name: string): void;
    /**
     * Bulk agent operations
     */
    bulkAgentOperations(operations: {
        create?: UnifiedAgentData[];
        update?: {
            id: EntityId;
            data: Partial<UnifiedAgentData>;
        }[];
        delete?: EntityId[];
    }): Promise<BatchOperationResult>;
    /**
     * Bulk project operations
     */
    bulkProjectOperations(operations: {
        create?: UnifiedProjectData[];
        update?: {
            id: EntityId;
            data: Partial<UnifiedProjectData>;
        }[];
        delete?: EntityId[];
    }): Promise<BatchOperationResult>;
    /**
     * Bulk task operations
     */
    bulkTaskOperations(operations: {
        create?: UnifiedTaskData[];
        update?: {
            id: EntityId;
            data: Partial<UnifiedTaskData>;
        }[];
        delete?: EntityId[];
    }): Promise<BatchOperationResult>;
    /**
     * Get all backup metadata
     */
    getBackupHistory(): BackupMetadata[];
    /**
     * Clean up old backups
     */
    cleanupOldBackups(retentionDays?: number, maxBackups?: number): Promise<void>;
    private executeOperation;
    private executeAgentOperation;
    private executeProjectOperation;
    private executeTaskOperation;
    private executeConfigOperation;
    private executeEventOperation;
    private validateBackupFile;
    private validateRestoredData;
    private getDatabaseVersion;
    private getBackupPath;
    private storeBackupMetadata;
    private storeBackupHistory;
}
export declare const createAtomicOperationsService: (db: UnifiedDatabaseService) => AtomicOperationsService;
export default AtomicOperationsService;
//# sourceMappingURL=AtomicOperations.d.ts.map