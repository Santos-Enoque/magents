import { Command } from 'commander';
import { UnifiedDatabaseService, Logger } from '@magents/shared';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const logger = new Logger('CLI:Database');

export function createDatabaseCommand(): Command {
  const command = new Command('database');
  
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
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Database already exists at ${dbPath}. Continue anyway?`,
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Database initialization cancelled'));
            return;
          }
        }

        console.log(chalk.blue('Initializing database...'));
        console.log(chalk.gray(`Database path: ${dbPath}`));

        // Initialize database service
        const db = new UnifiedDatabaseService();
        await db.initialize();

        console.log(chalk.green('✓ Database initialized successfully!'));
        console.log(chalk.gray('\nDatabase is ready for use.'));
        console.log(chalk.gray('Backend services will automatically use the database when available.'));
      } catch (error) {
        logger.error('Database initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗ Database initialization failed:'), errorMessage);
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
          console.log(chalk.yellow('📊 Database Status'));
          console.log(chalk.gray('Database not initialized'));
          console.log(chalk.gray('Run "magents database init" to initialize the database'));
          return;
        }

        console.log(chalk.blue('📊 Database Status'));
        
        const db = new UnifiedDatabaseService();
        await db.initialize();

        // Get statistics
        const projects = await db.projects.findAll();
        const agents = await db.agents.findAll();
        const configs = await db.configRepo.findAll();

        // Get file size
        const stats = fs.statSync(dbPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(chalk.green('✓ Database is available'));
        console.log(chalk.gray(`📁 Path: ${dbPath}`));
        console.log(chalk.gray(`💾 Size: ${sizeInMB} MB`));
        console.log(chalk.gray(`📅 Created: ${stats.birthtime.toLocaleString()}`));
        console.log(chalk.gray(`📅 Modified: ${stats.mtime.toLocaleString()}`));
        console.log('');
        console.log(chalk.blue('📈 Statistics:'));
        console.log(chalk.gray(`🗂  Projects: ${projects.length}`));
        console.log(chalk.gray(`🤖 Agents: ${agents.length}`));
        console.log(chalk.gray(`⚙️  Configs: ${configs.length}`));

        // Show recent activity
        const recentProjects = projects
          .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 3);

        if (recentProjects.length > 0) {
          console.log('');
          console.log(chalk.blue('🕒 Recent Activity:'));
          for (const project of recentProjects) {
            const timeAgo = new Date().getTime() - project.updatedAt.getTime();
            const daysAgo = Math.floor(timeAgo / (1000 * 60 * 60 * 24));
            const hoursAgo = Math.floor(timeAgo / (1000 * 60 * 60));
            const timeStr = daysAgo > 0 ? `${daysAgo}d ago` : `${hoursAgo}h ago`;
            console.log(chalk.gray(`   • ${project.name} (${timeStr})`));
          }
        }
      } catch (error) {
        logger.error('Database status check failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗ Database status check failed:'), errorMessage);
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
          console.log(chalk.yellow('No database found to backup'));
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(os.homedir(), '.magents', 'backups');
        const backupPath = options.output || path.join(backupDir, `magents-backup-${timestamp}.db`);

        // Ensure backup directory exists
        if (!fs.existsSync(path.dirname(backupPath))) {
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        }

        console.log(chalk.blue('Creating database backup...'));
        console.log(chalk.gray(`Source: ${dbPath}`));
        console.log(chalk.gray(`Destination: ${backupPath}`));

        fs.copyFileSync(dbPath, backupPath);

        const stats = fs.statSync(backupPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(chalk.green('✓ Backup created successfully!'));
        console.log(chalk.gray(`💾 Size: ${sizeInMB} MB`));
        console.log(chalk.gray(`📁 Location: ${backupPath}`));
      } catch (error) {
        logger.error('Database backup failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗ Database backup failed:'), errorMessage);
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
          console.log(chalk.yellow('No database found to reset'));
          return;
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: chalk.red('This will permanently delete all database data. Are you sure?'),
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Database reset cancelled'));
            return;
          }
        }

        console.log(chalk.blue('Resetting database...'));
        
        // Delete the database file
        fs.unlinkSync(dbPath);
        
        // Reinitialize empty database
        const db = new UnifiedDatabaseService();
        await db.initialize();

        console.log(chalk.green('✓ Database reset successfully!'));
        console.log(chalk.gray('A fresh database has been created.'));
      } catch (error) {
        logger.error('Database reset failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗ Database reset failed:'), errorMessage);
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
        const { ConfigManager } = await import('../config/ConfigManager');
        const configManager = ConfigManager.getInstance();
        const config = configManager.loadConfig();

        if (options.show) {
          console.log(chalk.blue('📝 Database Configuration'));
          console.log('');
          
          const dbConfig = config.DATABASE_CONFIG;
          if (!dbConfig) {
            console.log(chalk.yellow('No database configuration found'));
            return;
          }

          console.log(chalk.gray(`Enabled: ${dbConfig.enabled ? '✓' : '✗'}`));
          console.log(chalk.gray(`Path: ${dbConfig.path || 'default (~/.magents/magents.db)'}`));
          console.log(chalk.gray(`Auto Migrate: ${dbConfig.autoMigrate ? '✓' : '✗'}`));
          console.log(chalk.gray(`Backup on Migration: ${dbConfig.backupOnMigration ? '✓' : '✗'}`));
          console.log(chalk.gray(`Health Check Interval: ${dbConfig.healthCheckInterval}s`));
          console.log(chalk.gray(`Connection Timeout: ${dbConfig.connectionTimeout}ms`));
          console.log(chalk.gray(`Retry Attempts: ${dbConfig.retryAttempts}`));
          console.log(chalk.gray(`Retry Delay: ${dbConfig.retryDelay}ms`));
          return;
        }

        if (options.set) {
          const [key, value] = options.set.split('=');
          if (!key || value === undefined) {
            console.error(chalk.red('Invalid format. Use: --set key=value'));
            process.exit(1);
          }

          const dbConfig = { ...config.DATABASE_CONFIG } as any;
          
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
              console.error(chalk.red(`Unknown configuration key: ${key}`));
              console.log(chalk.gray('Valid keys: enabled, path, automigrate, backuponmigration, healthcheckinterval, connectiontimeout, retryattempts, retrydelay'));
              process.exit(1);
          }

          const updatedConfig = { ...config, DATABASE_CONFIG: dbConfig };
          configManager.updateConfig(updatedConfig);
          
          console.log(chalk.green(`✓ Database configuration updated: ${key} = ${value}`));
          return;
        }

        if (options.reset) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Reset database configuration to defaults?',
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Reset cancelled'));
            return;
          }

          const { DEFAULT_DATABASE_CONFIG } = await import('@magents/shared');
          const updatedConfig = { ...config, DATABASE_CONFIG: DEFAULT_DATABASE_CONFIG };
          configManager.updateConfig(updatedConfig);
          
          console.log(chalk.green('✓ Database configuration reset to defaults'));
          return;
        }

        // Default: show help
        console.log(chalk.blue('Database Configuration Commands:'));
        console.log(chalk.gray('  --show                    Show current configuration'));
        console.log(chalk.gray('  --set key=value          Set configuration option'));
        console.log(chalk.gray('  --reset                  Reset to defaults'));
        console.log('');
        console.log(chalk.blue('Configuration Keys:'));
        console.log(chalk.gray('  enabled                  Enable/disable database (true/false)'));
        console.log(chalk.gray('  path                     Database file path'));
        console.log(chalk.gray('  automigrate              Auto-run migrations (true/false)'));
        console.log(chalk.gray('  backuponmigration        Backup before migration (true/false)'));
        console.log(chalk.gray('  healthcheckinterval      Health check interval in seconds'));
        console.log(chalk.gray('  connectiontimeout        Connection timeout in milliseconds'));
        console.log(chalk.gray('  retryattempts            Number of retry attempts'));
        console.log(chalk.gray('  retrydelay               Delay between retries in milliseconds'));
      } catch (error) {
        logger.error('Database config command failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗ Database config command failed:'), errorMessage);
        process.exit(1);
      }
    });

  return command;
}