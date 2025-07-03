"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMigrateCommand = createMigrateCommand;
const commander_1 = require("commander");
const shared_1 = require("@magents/shared");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const logger = new shared_1.Logger('CLI:Migrate');
function createMigrateCommand() {
    const command = new commander_1.Command('migrate');
    command
        .description('Migrate data between different storage formats')
        .option('--rollback', 'Rollback the last migration')
        .option('--force', 'Skip confirmation prompts')
        .action(async (options) => {
        try {
            if (!options.force) {
                const { confirm } = await inquirer_1.default.prompt([
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
                    console.log(chalk_1.default.yellow('Migration cancelled'));
                    return;
                }
            }
            const migration = new shared_1.JsonToSqliteMigration();
            if (options.rollback) {
                console.log(chalk_1.default.blue('Starting rollback...'));
                await migration.rollback();
                console.log(chalk_1.default.green('✓ Rollback completed successfully'));
            }
            else {
                console.log(chalk_1.default.blue('Starting migration to SQLite...'));
                console.log(chalk_1.default.gray('This may take a few moments...'));
                await migration.migrate();
                console.log(chalk_1.default.green('\n✓ Migration completed successfully!'));
                console.log(chalk_1.default.gray('\nYour data has been migrated to SQLite.'));
                console.log(chalk_1.default.gray('Backup files have been created with .backup extension.'));
                console.log(chalk_1.default.gray('\nTo rollback this migration, run:'));
                console.log(chalk_1.default.cyan('  magents migrate --rollback'));
            }
        }
        catch (error) {
            logger.error('Migration failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red('\n✗ Migration failed:'), errorMessage);
            console.error(chalk_1.default.gray('\nPlease check the logs for more details.'));
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=migrate.js.map