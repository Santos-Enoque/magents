#!/usr/bin/env ts-node
/**
 * Manual Test Script for Unified Data Model
 *
 * This script demonstrates and tests all the key functionality of the unified data model:
 * - Database operations (CRUD)
 * - Data synchronization
 * - Atomic operations
 * - Backup/restore
 * - Configuration migration
 *
 * Run with: npx ts-node src/manual-test.ts
 */
declare class ManualTester {
    private db;
    private testDir;
    private syncManager;
    private atomicOps;
    constructor();
    runAllTests(): Promise<void>;
    testDatabaseOperations(): Promise<void>;
    testRepositoryOperations(): Promise<void>;
    testAtomicOperations(): Promise<void>;
    testBackupRestore(): Promise<void>;
    testDataSync(): Promise<void>;
    testConfigMigration(): Promise<void>;
    cleanup(): Promise<void>;
}
export default ManualTester;
//# sourceMappingURL=manual-test.d.ts.map