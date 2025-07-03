import { Command } from 'commander';
import { JsonToSqliteMigration, Logger } from '@magents/shared';
import chalk from 'chalk';
import inquirer from 'inquirer';

const logger = new Logger('CLI:Migrate');

export function createMigrateCommand(): Command {
  const command = new Command('migrate');
  
  command
    .description('Migrate data between different storage formats')
    .option('--rollback', 'Rollback the last migration')
    .option('--force', 'Skip confirmation prompts')
    .action(async (options) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: options.rollback 
                ? 'Are you sure you want to rollback the migration? This will restore JSON files and remove the SQLite database.'
                : 'This will migrate all data from JSON files to SQLite database. Continue?',
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Migration cancelled'));
            return;
          }
        }

        const migration = new JsonToSqliteMigration();

        if (options.rollback) {
          console.log(chalk.blue('Starting rollback...'));
          await migration.rollback();
          console.log(chalk.green('✓ Rollback completed successfully'));
        } else {
          console.log(chalk.blue('Starting migration to SQLite...'));
          console.log(chalk.gray('This may take a few moments...'));
          
          await migration.migrate();
          
          console.log(chalk.green('\n✓ Migration completed successfully!'));
          console.log(chalk.gray('\nYour data has been migrated to SQLite.'));
          console.log(chalk.gray('Backup files have been created with .backup extension.'));
          console.log(chalk.gray('\nTo rollback this migration, run:'));
          console.log(chalk.cyan('  magents migrate --rollback'));
        }
      } catch (error) {
        logger.error('Migration failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('\n✗ Migration failed:'), errorMessage);
        console.error(chalk.gray('\nPlease check the logs for more details.'));
        process.exit(1);
      }
    });

  return command;
}