"use strict";
/**
 * Auto-Configuration CLI Command
 *
 * Provides intelligent project detection and automatic configuration
 * for different development environments and project types.
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
exports.createAutoConfigCommand = createAutoConfigCommand;
const commander_1 = require("commander");
const UIService_1 = require("../ui/UIService");
const shared_1 = require("@magents/shared");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function createAutoConfigCommand() {
    const command = new commander_1.Command('autoconfig');
    command
        .description('Automatically detect and configure project settings')
        .option('-p, --path <path>', 'Project path to analyze', process.cwd())
        .option('-d, --dry', 'Show what would be configured without applying changes')
        .option('-v, --verbose', 'Show detailed analysis information')
        .option('-f, --force', 'Override existing configuration')
        .option('-m, --mode <mode>', 'Force specific complexity mode (simple|standard|advanced)')
        .option('--ports <range>', 'Port range for allocation (e.g., 3000-3999)')
        .option('-i, --interactive', 'Interactive configuration mode')
        .action(async (options) => {
        await executeAutoConfig(options);
    });
    // Subcommands
    command
        .command('detect')
        .description('Detect project type and characteristics')
        .option('-p, --path <path>', 'Project path to analyze', process.cwd())
        .option('-v, --verbose', 'Show detailed detection information')
        .action(async (options) => {
        await executeProjectDetection(options);
    });
    command
        .command('ports')
        .description('Find and allocate available ports')
        .option('-c, --count <number>', 'Number of ports to allocate', '3')
        .option('-r, --range <range>', 'Port range (e.g., 3000-3999)')
        .option('-e, --exclude <ports>', 'Ports to exclude (comma-separated)')
        .action(async (options) => {
        await executePortAllocation(options);
    });
    command
        .command('mcp')
        .description('Discover MCP servers')
        .option('-p, --path <path>', 'Project path to search', process.cwd())
        .option('-g, --global', 'Include global MCP servers')
        .action(async (options) => {
        await executeMCPDiscovery(options);
    });
    command
        .command('encrypt')
        .description('Encrypt sensitive configuration values')
        .argument('<value>', 'Value to encrypt')
        .option('-p, --password <password>', 'Encryption password (will prompt if not provided)')
        .action(async (value, options) => {
        await executeEncryption(value, options);
    });
    return command;
}
async function executeAutoConfig(options) {
    const projectPath = path.resolve(options.path || process.cwd());
    UIService_1.ui.header('🤖 Auto-Configuration Analysis', false);
    UIService_1.ui.info(`Analyzing project: ${projectPath}`);
    try {
        // Detect project type
        UIService_1.ui.info('🔍 Detecting project type...');
        const spinner = UIService_1.ui.spinner('Analyzing project structure and dependencies');
        spinner.start();
        const detection = await shared_1.autoConfig.detectProjectType(projectPath);
        spinner.succeed(`Detected: ${detection.primaryType} (${Math.round(detection.confidence * 100)}% confidence)`);
        if (options.verbose) {
            UIService_1.ui.divider('Detection Details');
            UIService_1.ui.info(`Primary Type: ${detection.primaryType}`);
            UIService_1.ui.info(`Confidence: ${Math.round(detection.confidence * 100)}%`);
            if (detection.allMatches.length > 1) {
                UIService_1.ui.info('Alternative matches:');
                detection.allMatches.slice(1).forEach((match) => {
                    UIService_1.ui.muted(`  • ${match.type} (${Math.round(match.confidence * 100)}%)`);
                    match.evidence.forEach((evidence) => {
                        UIService_1.ui.muted(`    - ${evidence}`);
                    });
                });
            }
        }
        // Discover MCP servers
        UIService_1.ui.info('🔌 Discovering MCP servers...');
        const mcpServers = await shared_1.autoConfig.discoverMCPServers(projectPath);
        if (mcpServers.length > 0) {
            UIService_1.ui.success(`Found ${mcpServers.length} MCP server(s)`);
            if (options.verbose) {
                mcpServers.forEach((server) => {
                    UIService_1.ui.muted(`  • ${server.name}: ${server.command}`);
                });
            }
        }
        else {
            UIService_1.ui.muted('No MCP servers found');
        }
        // Allocate ports
        UIService_1.ui.info('🌐 Allocating available ports...');
        const portRange = parsePortRange(options.ports);
        const context = {
            projectPath,
            constraints: portRange ? { portRange } : undefined
        };
        const allocatedPorts = await shared_1.autoConfig.allocateAvailablePorts(3, context);
        UIService_1.ui.success(`Allocated ports: ${allocatedPorts.join(', ')}`);
        // Build configuration
        UIService_1.ui.info('⚙️  Building configuration...');
        const finalConfig = await shared_1.autoConfig.buildConfigWithInheritance(context);
        // Override mode if specified
        if (options.mode) {
            finalConfig.MODE = options.mode;
        }
        // Display configuration preview
        UIService_1.ui.divider('Configuration Preview');
        displayConfigurationSummary(finalConfig, detection, mcpServers, allocatedPorts);
        if (options.dry) {
            UIService_1.ui.box('This is a dry run. No changes were made.', 'Dry Run', 'info');
            return;
        }
        // Interactive confirmation
        if (options.interactive && !options.force) {
            const shouldProceed = await promptConfirmation('Apply this configuration?');
            if (!shouldProceed) {
                UIService_1.ui.info('Configuration cancelled.');
                return;
            }
        }
        // Apply configuration
        UIService_1.ui.info('💾 Applying configuration...');
        await applyConfiguration(projectPath, finalConfig, options.force);
        UIService_1.ui.success('✅ Auto-configuration completed successfully!');
        // Show next steps
        UIService_1.ui.divider('Next Steps');
        UIService_1.ui.info('You can now:');
        UIService_1.ui.command('magents create', 'Create a new agent with auto-detected settings');
        UIService_1.ui.command('magents list', 'View current agent configuration');
        UIService_1.ui.command('magents autoconfig detect', 'Re-run project detection');
    }
    catch (error) {
        UIService_1.ui.error(`Auto-configuration failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
async function executeProjectDetection(options) {
    const projectPath = path.resolve(options.path);
    UIService_1.ui.header('🔍 Project Type Detection', false);
    try {
        const detection = await shared_1.autoConfig.detectProjectType(projectPath);
        UIService_1.ui.info(`Project Path: ${projectPath}`);
        UIService_1.ui.success(`Primary Type: ${detection.primaryType}`);
        UIService_1.ui.info(`Confidence: ${Math.round(detection.confidence * 100)}%`);
        if (detection.allMatches.length > 0) {
            UIService_1.ui.divider('All Matches');
            const headers = ['Type', 'Confidence', 'Evidence'];
            const rows = detection.allMatches.map((match) => [
                match.type,
                `${Math.round(match.confidence * 100)}%`,
                match.evidence.join(', ')
            ]);
            UIService_1.ui.table(headers, rows);
        }
        if (detection.suggestions) {
            UIService_1.ui.divider('Suggestions');
            if (detection.suggestions.ports.length > 0) {
                UIService_1.ui.keyValue('Recommended Ports', detection.suggestions.ports.join(', '));
            }
            if (detection.suggestions.commands.length > 0) {
                UIService_1.ui.info('Suggested Commands:');
                detection.suggestions.commands.forEach((cmd) => {
                    UIService_1.ui.command(cmd);
                });
            }
            if (Object.keys(detection.suggestions.environment).length > 0) {
                UIService_1.ui.info('Environment Variables:');
                Object.entries(detection.suggestions.environment).forEach(([key, value]) => {
                    UIService_1.ui.keyValue(key, String(value));
                });
            }
        }
    }
    catch (error) {
        UIService_1.ui.error(`Detection failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
async function executePortAllocation(options) {
    UIService_1.ui.header('🌐 Port Allocation', false);
    try {
        const count = parseInt(options.count, 10);
        const portRange = parsePortRange(options.range);
        const excludePorts = options.exclude ?
            options.exclude.split(',').map(p => parseInt(p.trim(), 10)) : [];
        const context = {
            projectPath: process.cwd(),
            constraints: {
                portRange,
                excludePorts
            }
        };
        const allocatedPorts = await shared_1.autoConfig.allocateAvailablePorts(count, context);
        if (allocatedPorts.length === 0) {
            UIService_1.ui.warning('No available ports found in the specified range');
            return;
        }
        UIService_1.ui.success(`Allocated ${allocatedPorts.length} port(s):`);
        allocatedPorts.forEach((port, index) => {
            UIService_1.ui.keyValue(`Port ${index + 1}`, port.toString());
        });
        if (allocatedPorts.length < count) {
            UIService_1.ui.warning(`Only found ${allocatedPorts.length} of ${count} requested ports`);
        }
    }
    catch (error) {
        UIService_1.ui.error(`Port allocation failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
async function executeMCPDiscovery(options) {
    UIService_1.ui.header('🔌 MCP Server Discovery', false);
    try {
        const mcpServers = await shared_1.autoConfig.discoverMCPServers(options.path);
        if (mcpServers.length === 0) {
            UIService_1.ui.info('No MCP servers found');
            UIService_1.ui.tip('Create a .mcp.json file to configure MCP servers for this project');
            return;
        }
        UIService_1.ui.success(`Found ${mcpServers.length} MCP server(s):`);
        const headers = ['Name', 'Command', 'Args', 'Config Path'];
        const rows = mcpServers.map((server) => [
            server.name,
            server.command,
            server.args.join(' '),
            path.relative(options.path, server.configPath) || server.configPath
        ]);
        UIService_1.ui.table(headers, rows);
    }
    catch (error) {
        UIService_1.ui.error(`MCP discovery failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
async function executeEncryption(value, options) {
    UIService_1.ui.header('🔐 Value Encryption', false);
    try {
        let password = options.password;
        if (!password) {
            // In a real implementation, this would use a secure prompt
            UIService_1.ui.info('Password-based encryption requires manual password entry');
            UIService_1.ui.muted('Using auto-generated key for this demo');
        }
        const encrypted = shared_1.autoConfig.encryptValue(value, password);
        UIService_1.ui.success('Value encrypted successfully');
        UIService_1.ui.keyValue('Algorithm', encrypted.algorithm);
        UIService_1.ui.keyValue('Salt', encrypted.salt);
        UIService_1.ui.muted('Encrypted value:');
        UIService_1.ui.info(encrypted.encrypted);
        UIService_1.ui.divider();
        UIService_1.ui.tip('Store the encrypted value and salt securely. You\'ll need both to decrypt.');
    }
    catch (error) {
        UIService_1.ui.error(`Encryption failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}
// Helper functions
function parsePortRange(rangeStr) {
    if (!rangeStr)
        return undefined;
    const match = rangeStr.match(/^(\d+)-(\d+)$/);
    if (!match) {
        throw new Error('Invalid port range format. Use: start-end (e.g., 3000-3999)');
    }
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (start >= end || start < 1 || end > 65535) {
        throw new Error('Invalid port range values');
    }
    return { start, end };
}
function displayConfigurationSummary(config, detection, mcpServers, ports) {
    UIService_1.ui.keyValue('Mode', config.MODE || 'standard');
    UIService_1.ui.keyValue('Project Type', detection.primaryType);
    UIService_1.ui.keyValue('Docker Enabled', config.DOCKER_ENABLED ? 'Yes' : 'No');
    UIService_1.ui.keyValue('Task Master', config.TASK_MASTER_ENABLED ? 'Enabled' : 'Disabled');
    UIService_1.ui.keyValue('MCP Enabled', config.MCP_ENABLED ? 'Yes' : 'No');
    UIService_1.ui.keyValue('Allocated Ports', ports.join(', '));
    UIService_1.ui.keyValue('MCP Servers', mcpServers.length.toString());
    UIService_1.ui.keyValue('Auto Accept', config.CLAUDE_AUTO_ACCEPT ? 'Yes' : 'No');
}
async function promptConfirmation(message) {
    // In a real implementation, this would use a proper prompt library
    UIService_1.ui.info(`${message} (This demo assumes 'yes')`);
    return true;
}
async function applyConfiguration(projectPath, config, force = false) {
    const configDir = path.join(projectPath, '.magents');
    const configFile = path.join(configDir, 'config.json');
    // Create config directory if it doesn't exist
    if (!await directoryExists(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
    }
    // Check if config file exists
    if (!force && await fileExists(configFile)) {
        UIService_1.ui.warning('Configuration file already exists. Use --force to overwrite.');
        return;
    }
    // Write configuration
    await fs.promises.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
    UIService_1.ui.success(`Configuration saved to ${path.relative(projectPath, configFile)}`);
}
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function directoryExists(dirPath) {
    try {
        const stat = await fs.promises.stat(dirPath);
        return stat.isDirectory();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=autoconfig.js.map