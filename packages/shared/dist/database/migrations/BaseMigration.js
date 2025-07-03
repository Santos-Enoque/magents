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
exports.BaseMigration = void 0;
const logger_1 = require("../../utils/logger");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Base class for all migrations with common functionality
 */
class BaseMigration {
    constructor(name, config = {}) {
        this.errors = [];
        this.backups = [];
        this.startTime = 0;
        this.logger = new logger_1.Logger(`Migration:${name}`);
        this.config = {
            dryRun: false,
            verbose: false,
            backupDir: path.join(process.env.HOME || '', '.magents', 'backups'),
            batchSize: 100,
            ...config
        };
    }
    /**
     * Set progress callback for real-time updates
     */
    onProgress(callback) {
        this.progressCallback = callback;
    }
    /**
     * Create backup of a file
     */
    async createBackup(filePath) {
        if (this.config.dryRun) {
            this.logger.info(`[DRY RUN] Would backup: ${filePath}`);
            return {
                originalPath: filePath,
                backupPath: '',
                timestamp: new Date().toISOString()
            };
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(filePath);
        const backupFileName = `${fileName}.${timestamp}.backup`;
        const backupPath = path.join(this.config.backupDir, backupFileName);
        await fs.ensureDir(this.config.backupDir);
        await fs.copy(filePath, backupPath);
        const backupInfo = {
            originalPath: filePath,
            backupPath,
            timestamp
        };
        this.backups.push(backupInfo);
        this.logger.info(`Created backup: ${backupPath}`);
        return backupInfo;
    }
    /**
     * Restore from backups
     */
    async restoreBackups() {
        for (const backup of this.backups) {
            if (await fs.pathExists(backup.backupPath)) {
                await fs.copy(backup.backupPath, backup.originalPath, { overwrite: true });
                await fs.remove(backup.backupPath);
                this.logger.info(`Restored: ${backup.originalPath}`);
            }
        }
    }
    /**
     * Add error to collection
     */
    addError(item, error) {
        const errorObj = {
            item,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        };
        this.errors.push(errorObj);
        this.logger.error(`Error migrating ${item}: ${errorObj.error}`);
    }
    /**
     * Update progress
     */
    updateProgress(phase, current, total) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        if (this.progressCallback) {
            this.progressCallback({
                phase: phase,
                current,
                total,
                percentage
            });
        }
        if (this.config.verbose) {
            this.logger.info(`${phase}: ${current}/${total} (${percentage}%)`);
        }
    }
    /**
     * Start timing
     */
    startTiming() {
        this.startTime = Date.now();
    }
    /**
     * Get elapsed time in seconds
     */
    getElapsedTime() {
        return (Date.now() - this.startTime) / 1000;
    }
    /**
     * Build migration result
     */
    buildResult(itemsMigrated) {
        return {
            success: this.errors.length === 0,
            itemsMigrated,
            errors: this.errors,
            backupPaths: this.backups.map(b => b.backupPath),
            duration: this.getElapsedTime()
        };
    }
    /**
     * Log summary of migration
     */
    logSummary(result) {
        this.logger.info('='.repeat(50));
        this.logger.info('Migration Summary:');
        this.logger.info(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        this.logger.info(`Items migrated: ${result.itemsMigrated}`);
        this.logger.info(`Errors: ${result.errors.length}`);
        this.logger.info(`Duration: ${result.duration.toFixed(2)}s`);
        this.logger.info(`Backups created: ${result.backupPaths.length}`);
        if (result.errors.length > 0) {
            this.logger.error('Errors encountered:');
            result.errors.forEach(err => {
                this.logger.error(`  - ${err.item}: ${err.error}`);
            });
        }
        this.logger.info('='.repeat(50));
    }
}
exports.BaseMigration = BaseMigration;
//# sourceMappingURL=BaseMigration.js.map