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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseCommand = createDatabaseCommand;
const commander_1 = require("commander");
const shared_1 = require("@magents/shared");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger = new shared_1.Logger('CLI:Database');
function createDatabaseCommand() {
    const command = new commander_1.Command('database');
    command
        .description('Database management commands')
        .alias('db');
    // Initialize database
    command
        .command('init')
        .description('Initialize the SQLite database')
        .option('--force', 'Overwrite existing database')
        .option('--path <path>', 'Custom database path')
        .action(async (options) => {
        try {
            const dbPath = options.path || path.join(os.homedir(), '.magents', 'magents.db');
            const dbExists = fs.existsSync(dbPath);
            if (dbExists && !options.force) {
                const { confirm } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Database already exists at ${dbPath}. Continue anyway?`,
                        default: false
                    }
                ]);
                if (!confirm) {
                    console.log(chalk_1.default.yellow('Database initialization cancelled'));
                    return;
                }
            }
            console.log(chalk_1.default.blue('Initializing database...'));
            console.log(chalk_1.default.gray(`Database path: ${dbPath}`));
            // Initialize database service
            const db = new shared_1.UnifiedDatabaseService();
            await db.initialize();
            console.log(chalk_1.default.green('✓ Database initialized successfully!'));
            console.log(chalk_1.default.gray('\nDatabase is ready for use.'));
            console.log(chalk_1.default.gray('Backend services will automatically use the database when available.'));
        }
        catch (error) {
            logger.error('Database initialization failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('✗ Database initialization failed:'), errorMessage);
            process.exit(1);
        }
    });
    // Database status
    command
        .command('status')
        .description('Show database status and statistics')
        .action(async () => {
        try {
            const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
            const dbExists = fs.existsSync(dbPath);
            if (!dbExists) {
                console.log(chalk_1.default.yellow('📊 Database Status'));
                console.log(chalk_1.default.gray('Database not initialized'));
                console.log(chalk_1.default.gray('Run "magents database init" to initialize the database'));
                return;
            }
            console.log(chalk_1.default.blue('📊 Database Status'));
            const db = new shared_1.UnifiedDatabaseService();
            await db.initialize();
            // Get statistics
            const projects = await db.projects.findAll();
            const agents = await db.agents.findAll();
            const configs = await db.configRepo.findAll();
            // Get file size
            const stats = fs.statSync(dbPath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(chalk_1.default.green('✓ Database is available'));
            console.log(chalk_1.default.gray(`📁 Path: ${dbPath}`));
            console.log(chalk_1.default.gray(`💾 Size: ${sizeInMB} MB`));
            console.log(chalk_1.default.gray(`📅 Created: ${stats.birthtime.toLocaleString()}`));
            console.log(chalk_1.default.gray(`📅 Modified: ${stats.mtime.toLocaleString()}`));
            console.log('');
            console.log(chalk_1.default.blue('📈 Statistics:'));
            console.log(chalk_1.default.gray(`🗂  Projects: ${projects.length}`));
            console.log(chalk_1.default.gray(`🤖 Agents: ${agents.length}`));
            console.log(chalk_1.default.gray(`⚙️  Configs: ${configs.length}`));
            // Show recent activity
            const recentProjects = projects
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                .slice(0, 3);
            if (recentProjects.length > 0) {
                console.log('');
                console.log(chalk_1.default.blue('🕒 Recent Activity:'));
                for (const project of recentProjects) {
                    const timeAgo = new Date().getTime() - project.updatedAt.getTime();
                    const daysAgo = Math.floor(timeAgo / (1000 * 60 * 60 * 24));
                    const hoursAgo = Math.floor(timeAgo / (1000 * 60 * 60));
                    const timeStr = daysAgo > 0 ? `${daysAgo}d ago` : `${hoursAgo}h ago`;
                    console.log(chalk_1.default.gray(`   • ${project.name} (${timeStr})`));
                }
            }
        }
        catch (error) {
            logger.error('Database status check failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('✗ Database status check failed:'), errorMessage);
            process.exit(1);
        }
    });
    // Database backup
    command
        .command('backup')
        .description('Create a backup of the database')
        .option('--output <path>', 'Output path for backup')
        .action(async (options) => {
        try {
            const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
            if (!fs.existsSync(dbPath)) {
                console.log(chalk_1.default.yellow('No database found to backup'));
                return;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(os.homedir(), '.magents', 'backups');
            const backupPath = options.output || path.join(backupDir, `magents-backup-${timestamp}.db`);
            // Ensure backup directory exists
            if (!fs.existsSync(path.dirname(backupPath))) {
                fs.mkdirSync(path.dirname(backupPath), { recursive: true });
            }
            console.log(chalk_1.default.blue('Creating database backup...'));
            console.log(chalk_1.default.gray(`Source: ${dbPath}`));
            console.log(chalk_1.default.gray(`Destination: ${backupPath}`));
            fs.copyFileSync(dbPath, backupPath);
            const stats = fs.statSync(backupPath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(chalk_1.default.green('✓ Backup created successfully!'));
            console.log(chalk_1.default.gray(`💾 Size: ${sizeInMB} MB`));
            console.log(chalk_1.default.gray(`📁 Location: ${backupPath}`));
        }
        catch (error) {
            logger.error('Database backup failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('✗ Database backup failed:'), errorMessage);
            process.exit(1);
        }
    });
    // Database reset
    command
        .command('reset')
        .description('Reset the database (delete all data)')
        .option('--force', 'Skip confirmation prompt')
        .action(async (options) => {
        try {
            const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
            if (!fs.existsSync(dbPath)) {
                console.log(chalk_1.default.yellow('No database found to reset'));
                return;
            }
            if (!options.force) {
                const { confirm } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: chalk_1.default.red('This will permanently delete all database data. Are you sure?'),
                        default: false
                    }
                ]);
                if (!confirm) {
                    console.log(chalk_1.default.yellow('Database reset cancelled'));
                    return;
                }
            }
            console.log(chalk_1.default.blue('Resetting database...'));
            // Delete the database file
            fs.unlinkSync(dbPath);
            // Reinitialize empty database
            const db = new shared_1.UnifiedDatabaseService();
            await db.initialize();
            console.log(chalk_1.default.green('✓ Database reset successfully!'));
            console.log(chalk_1.default.gray('A fresh database has been created.'));
        }
        catch (error) {
            logger.error('Database reset failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('✗ Database reset failed:'), errorMessage);
            process.exit(1);
        }
    });
    // Database configuration
    command
        .command('config')
        .description('Manage database configuration')
        .option('--show', 'Show current database configuration')
        .option('--set <key=value>', 'Set database configuration option')
        .option('--reset', 'Reset to default configuration')
        .action(async (options) => {
        try {
            const { ConfigManager } = await Promise.resolve().then(() => __importStar(require('../config/ConfigManager')));
            const configManager = ConfigManager.getInstance();
            const config = configManager.loadConfig();
            if (options.show) {
                console.log(chalk_1.default.blue('📝 Database Configuration'));
                console.log('');
                const dbConfig = config.DATABASE_CONFIG;
                if (!dbConfig) {
                    console.log(chalk_1.default.yellow('No database configuration found'));
                    return;
                }
                console.log(chalk_1.default.gray(`Enabled: ${dbConfig.enabled ? '✓' : '✗'}`));
                console.log(chalk_1.default.gray(`Path: ${dbConfig.path || 'default (~/.magents/magents.db)'}`));
                console.log(chalk_1.default.gray(`Auto Migrate: ${dbConfig.autoMigrate ? '✓' : '✗'}`));
                console.log(chalk_1.default.gray(`Backup on Migration: ${dbConfig.backupOnMigration ? '✓' : '✗'}`));
                console.log(chalk_1.default.gray(`Health Check Interval: ${dbConfig.healthCheckInterval}s`));
                console.log(chalk_1.default.gray(`Connection Timeout: ${dbConfig.connectionTimeout}ms`));
                console.log(chalk_1.default.gray(`Retry Attempts: ${dbConfig.retryAttempts}`));
                console.log(chalk_1.default.gray(`Retry Delay: ${dbConfig.retryDelay}ms`));
                return;
            }
            if (options.set) {
                const [key, value] = options.set.split('=');
                if (!key || value === undefined) {
                    console.error(chalk_1.default.red('Invalid format. Use: --set key=value'));
                    process.exit(1);
                }
                const dbConfig = { ...config.DATABASE_CONFIG };
                switch (key.toLowerCase()) {
                    case 'enabled':
                        dbConfig.enabled = value.toLowerCase() === 'true';
                        break;
                    case 'path':
                        dbConfig.path = value;
                        break;
                    case 'automigrate':
                        dbConfig.autoMigrate = value.toLowerCase() === 'true';
                        break;
                    case 'backuponmigration':
                        dbConfig.backupOnMigration = value.toLowerCase() === 'true';
                        break;
                    case 'healthcheckinterval':
                        dbConfig.healthCheckInterval = parseInt(value);
                        break;
                    case 'connectiontimeout':
                        dbConfig.connectionTimeout = parseInt(value);
                        break;
                    case 'retryattempts':
                        dbConfig.retryAttempts = parseInt(value);
                        break;
                    case 'retrydelay':
                        dbConfig.retryDelay = parseInt(value);
                        break;
                    default:
                        console.error(chalk_1.default.red(`Unknown configuration key: ${key}`));
                        console.log(chalk_1.default.gray('Valid keys: enabled, path, automigrate, backuponmigration, healthcheckinterval, connectiontimeout, retryattempts, retrydelay'));
                        process.exit(1);
                }
                const updatedConfig = { ...config, DATABASE_CONFIG: dbConfig };
                configManager.updateConfig(updatedConfig);
                console.log(chalk_1.default.green(`✓ Database configuration updated: ${key} = ${value}`));
                return;
            }
            if (options.reset) {
                const { confirm } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Reset database configuration to defaults?',
                        default: false
                    }
                ]);
                if (!confirm) {
                    console.log(chalk_1.default.yellow('Reset cancelled'));
                    return;
                }
                const { DEFAULT_DATABASE_CONFIG } = await Promise.resolve().then(() => __importStar(require('@magents/shared')));
                const updatedConfig = { ...config, DATABASE_CONFIG: DEFAULT_DATABASE_CONFIG };
                configManager.updateConfig(updatedConfig);
                console.log(chalk_1.default.green('✓ Database configuration reset to defaults'));
                return;
            }
            // Default: show help
            console.log(chalk_1.default.blue('Database Configuration Commands:'));
            console.log(chalk_1.default.gray('  --show                    Show current configuration'));
            console.log(chalk_1.default.gray('  --set key=value          Set configuration option'));
            console.log(chalk_1.default.gray('  --reset                  Reset to defaults'));
            console.log('');
            console.log(chalk_1.default.blue('Configuration Keys:'));
            console.log(chalk_1.default.gray('  enabled                  Enable/disable database (true/false)'));
            console.log(chalk_1.default.gray('  path                     Database file path'));
            console.log(chalk_1.default.gray('  automigrate              Auto-run migrations (true/false)'));
            console.log(chalk_1.default.gray('  backuponmigration        Backup before migration (true/false)'));
            console.log(chalk_1.default.gray('  healthcheckinterval      Health check interval in seconds'));
            console.log(chalk_1.default.gray('  connectiontimeout        Connection timeout in milliseconds'));
            console.log(chalk_1.default.gray('  retryattempts            Number of retry attempts'));
            console.log(chalk_1.default.gray('  retrydelay               Delay between retries in milliseconds'));
        }
        catch (error) {
            logger.error('Database config command failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('✗ Database config command failed:'), errorMessage);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=database.js.map