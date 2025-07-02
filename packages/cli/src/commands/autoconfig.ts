/**
 * Auto-Configuration CLI Command
 * 
 * Provides intelligent project detection and automatic configuration
 * for different development environments and project types.
 */

import { Command } from 'commander';
import { ui } from '../ui/UIService';
import { autoConfig, ProjectDetectionResult, MCPServerInfo, AutoConfigContext } from '@magents/shared';
import { MagentsConfig } from '@magents/shared';
import * as path from 'path';
import * as fs from 'fs';

interface AutoConfigOptions {
  path?: string;
  dry?: boolean;
  verbose?: boolean;
  force?: boolean;
  mode?: 'simple' | 'standard' | 'advanced';
  ports?: string;
  interactive?: boolean;
}

export function createAutoConfigCommand(): Command {
  const command = new Command('autoconfig');
  
  command
    .description('Automatically detect and configure project settings')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-d, --dry', 'Show what would be configured without applying changes')
    .option('-v, --verbose', 'Show detailed analysis information')
    .option('-f, --force', 'Override existing configuration')
    .option('-m, --mode <mode>', 'Force specific complexity mode (simple|standard|advanced)')
    .option('--ports <range>', 'Port range for allocation (e.g., 3000-3999)')
    .option('-i, --interactive', 'Interactive configuration mode')
    .action(async (options: AutoConfigOptions) => {
      await executeAutoConfig(options);
    });

  // Subcommands
  command
    .command('detect')
    .description('Detect project type and characteristics')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-v, --verbose', 'Show detailed detection information')
    .action(async (options: { path: string; verbose?: boolean }) => {
      await executeProjectDetection(options);
    });

  command
    .command('ports')
    .description('Find and allocate available ports')
    .option('-c, --count <number>', 'Number of ports to allocate', '3')
    .option('-r, --range <range>', 'Port range (e.g., 3000-3999)')
    .option('-e, --exclude <ports>', 'Ports to exclude (comma-separated)')
    .action(async (options: { count: string; range?: string; exclude?: string }) => {
      await executePortAllocation(options);
    });

  command
    .command('mcp')
    .description('Discover MCP servers')
    .option('-p, --path <path>', 'Project path to search', process.cwd())
    .option('-g, --global', 'Include global MCP servers')
    .action(async (options: { path: string; global?: boolean }) => {
      await executeMCPDiscovery(options);
    });

  command
    .command('encrypt')
    .description('Encrypt sensitive configuration values')
    .argument('<value>', 'Value to encrypt')
    .option('-p, --password <password>', 'Encryption password (will prompt if not provided)')
    .action(async (value: string, options: { password?: string }) => {
      await executeEncryption(value, options);
    });

  return command;
}

async function executeAutoConfig(options: AutoConfigOptions): Promise<void> {
  const projectPath = path.resolve(options.path || process.cwd());
  
  ui.header('🤖 Auto-Configuration Analysis', false);
  ui.info(`Analyzing project: ${projectPath}`);
  
  try {
    // Detect project type
    ui.info('🔍 Detecting project type...');
    const spinner = ui.spinner('Analyzing project structure and dependencies');
    spinner.start();
    
    const detection = await autoConfig.detectProjectType(projectPath);
    
    spinner.succeed(`Detected: ${detection.primaryType} (${Math.round(detection.confidence * 100)}% confidence)`);
    
    if (options.verbose) {
      ui.divider('Detection Details');
      ui.info(`Primary Type: ${detection.primaryType}`);
      ui.info(`Confidence: ${Math.round(detection.confidence * 100)}%`);
      
      if (detection.allMatches.length > 1) {
        ui.info('Alternative matches:');
        detection.allMatches.slice(1).forEach((match: any) => {
          ui.muted(`  • ${match.type} (${Math.round(match.confidence * 100)}%)`);
          match.evidence.forEach((evidence: string) => {
            ui.muted(`    - ${evidence}`);
          });
        });
      }
    }
    
    // Discover MCP servers
    ui.info('🔌 Discovering MCP servers...');
    const mcpServers = await autoConfig.discoverMCPServers(projectPath);
    
    if (mcpServers.length > 0) {
      ui.success(`Found ${mcpServers.length} MCP server(s)`);
      if (options.verbose) {
        mcpServers.forEach((server: MCPServerInfo) => {
          ui.muted(`  • ${server.name}: ${server.command}`);
        });
      }
    } else {
      ui.muted('No MCP servers found');
    }
    
    // Allocate ports
    ui.info('🌐 Allocating available ports...');
    const portRange = parsePortRange(options.ports);
    const context: AutoConfigContext = {
      projectPath,
      constraints: portRange ? { portRange } : undefined
    };
    
    const allocatedPorts = await autoConfig.allocateAvailablePorts(3, context);
    ui.success(`Allocated ports: ${allocatedPorts.join(', ')}`);
    
    // Build configuration
    ui.info('⚙️  Building configuration...');
    const finalConfig = await autoConfig.buildConfigWithInheritance(context);
    
    // Override mode if specified
    if (options.mode) {
      finalConfig.MODE = options.mode;
    }
    
    // Display configuration preview
    ui.divider('Configuration Preview');
    displayConfigurationSummary(finalConfig, detection, mcpServers, allocatedPorts);
    
    if (options.dry) {
      ui.box('This is a dry run. No changes were made.', 'Dry Run', 'info');
      return;
    }
    
    // Interactive confirmation
    if (options.interactive && !options.force) {
      const shouldProceed = await promptConfirmation('Apply this configuration?');
      if (!shouldProceed) {
        ui.info('Configuration cancelled.');
        return;
      }
    }
    
    // Apply configuration
    ui.info('💾 Applying configuration...');
    await applyConfiguration(projectPath, finalConfig, options.force);
    
    ui.success('✅ Auto-configuration completed successfully!');
    
    // Show next steps
    ui.divider('Next Steps');
    ui.info('You can now:');
    ui.command('magents create', 'Create a new agent with auto-detected settings');
    ui.command('magents list', 'View current agent configuration');
    ui.command('magents autoconfig detect', 'Re-run project detection');
    
  } catch (error) {
    ui.error(`Auto-configuration failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function executeProjectDetection(options: { path: string; verbose?: boolean }): Promise<void> {
  const projectPath = path.resolve(options.path);
  
  ui.header('🔍 Project Type Detection', false);
  
  try {
    const detection = await autoConfig.detectProjectType(projectPath);
    
    ui.info(`Project Path: ${projectPath}`);
    ui.success(`Primary Type: ${detection.primaryType}`);
    ui.info(`Confidence: ${Math.round(detection.confidence * 100)}%`);
    
    if (detection.allMatches.length > 0) {
      ui.divider('All Matches');
      const headers = ['Type', 'Confidence', 'Evidence'];
      const rows = detection.allMatches.map((match: any) => [
        match.type,
        `${Math.round(match.confidence * 100)}%`,
        match.evidence.join(', ')
      ]);
      ui.table(headers, rows);
    }
    
    if (detection.suggestions) {
      ui.divider('Suggestions');
      
      if (detection.suggestions.ports.length > 0) {
        ui.keyValue('Recommended Ports', detection.suggestions.ports.join(', '));
      }
      
      if (detection.suggestions.commands.length > 0) {
        ui.info('Suggested Commands:');
        detection.suggestions.commands.forEach((cmd: string) => {
          ui.command(cmd);
        });
      }
      
      if (Object.keys(detection.suggestions.environment).length > 0) {
        ui.info('Environment Variables:');
        Object.entries(detection.suggestions.environment).forEach(([key, value]: [string, any]) => {
          ui.keyValue(key, String(value));
        });
      }
    }
    
  } catch (error) {
    ui.error(`Detection failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function executePortAllocation(options: { count: string; range?: string; exclude?: string }): Promise<void> {
  ui.header('🌐 Port Allocation', false);
  
  try {
    const count = parseInt(options.count, 10);
    const portRange = parsePortRange(options.range);
    const excludePorts = options.exclude ? 
      options.exclude.split(',').map(p => parseInt(p.trim(), 10)) : [];
    
    const context: AutoConfigContext = {
      projectPath: process.cwd(),
      constraints: {
        portRange,
        excludePorts
      }
    };
    
    const allocatedPorts = await autoConfig.allocateAvailablePorts(count, context);
    
    if (allocatedPorts.length === 0) {
      ui.warning('No available ports found in the specified range');
      return;
    }
    
    ui.success(`Allocated ${allocatedPorts.length} port(s):`);
    allocatedPorts.forEach((port: number, index: number) => {
      ui.keyValue(`Port ${index + 1}`, port.toString());
    });
    
    if (allocatedPorts.length < count) {
      ui.warning(`Only found ${allocatedPorts.length} of ${count} requested ports`);
    }
    
  } catch (error) {
    ui.error(`Port allocation failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function executeMCPDiscovery(options: { path: string; global?: boolean }): Promise<void> {
  ui.header('🔌 MCP Server Discovery', false);
  
  try {
    const mcpServers = await autoConfig.discoverMCPServers(options.path);
    
    if (mcpServers.length === 0) {
      ui.info('No MCP servers found');
      ui.tip('Create a .mcp.json file to configure MCP servers for this project');
      return;
    }
    
    ui.success(`Found ${mcpServers.length} MCP server(s):`);
    
    const headers = ['Name', 'Command', 'Args', 'Config Path'];
    const rows = mcpServers.map((server: MCPServerInfo) => [
      server.name,
      server.command,
      server.args.join(' '),
      path.relative(options.path, server.configPath) || server.configPath
    ]);
    
    ui.table(headers, rows);
    
  } catch (error) {
    ui.error(`MCP discovery failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function executeEncryption(value: string, options: { password?: string }): Promise<void> {
  ui.header('🔐 Value Encryption', false);
  
  try {
    let password = options.password;
    
    if (!password) {
      // In a real implementation, this would use a secure prompt
      ui.info('Password-based encryption requires manual password entry');
      ui.muted('Using auto-generated key for this demo');
    }
    
    const encrypted = autoConfig.encryptValue(value, password);
    
    ui.success('Value encrypted successfully');
    ui.keyValue('Algorithm', encrypted.algorithm);
    ui.keyValue('Salt', encrypted.salt);
    ui.muted('Encrypted value:');
    ui.info(encrypted.encrypted);
    
    ui.divider();
    ui.tip('Store the encrypted value and salt securely. You\'ll need both to decrypt.');
    
  } catch (error) {
    ui.error(`Encryption failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Helper functions
function parsePortRange(rangeStr?: string): { start: number; end: number } | undefined {
  if (!rangeStr) return undefined;
  
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

function displayConfigurationSummary(
  config: MagentsConfig,
  detection: ProjectDetectionResult,
  mcpServers: MCPServerInfo[],
  ports: number[]
): void {
  ui.keyValue('Mode', config.MODE || 'standard');
  ui.keyValue('Project Type', detection.primaryType);
  ui.keyValue('Docker Enabled', config.DOCKER_ENABLED ? 'Yes' : 'No');
  ui.keyValue('Task Master', config.TASK_MASTER_ENABLED ? 'Enabled' : 'Disabled');
  ui.keyValue('MCP Enabled', config.MCP_ENABLED ? 'Yes' : 'No');
  ui.keyValue('Allocated Ports', ports.join(', '));
  ui.keyValue('MCP Servers', mcpServers.length.toString());
  ui.keyValue('Auto Accept', config.CLAUDE_AUTO_ACCEPT ? 'Yes' : 'No');
}

async function promptConfirmation(message: string): Promise<boolean> {
  // In a real implementation, this would use a proper prompt library
  ui.info(`${message} (This demo assumes 'yes')`);
  return true;
}

async function applyConfiguration(
  projectPath: string,
  config: MagentsConfig,
  force: boolean = false
): Promise<void> {
  const configDir = path.join(projectPath, '.magents');
  const configFile = path.join(configDir, 'config.json');
  
  // Create config directory if it doesn't exist
  if (!await directoryExists(configDir)) {
    await fs.promises.mkdir(configDir, { recursive: true });
  }
  
  // Check if config file exists
  if (!force && await fileExists(configFile)) {
    ui.warning('Configuration file already exists. Use --force to overwrite.');
    return;
  }
  
  // Write configuration
  await fs.promises.writeFile(
    configFile,
    JSON.stringify(config, null, 2),
    'utf8'
  );
  
  ui.success(`Configuration saved to ${path.relative(projectPath, configFile)}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}