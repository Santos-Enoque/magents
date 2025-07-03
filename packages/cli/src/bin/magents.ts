#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { DockerAgentManager } from '../services/DockerAgentManager';
import { ConfigManager } from '../config/ConfigManager';
import { ui } from '../ui/UIService';
import { createAutoConfigCommand } from '../commands/autoconfig';
import { createMigrateCommand } from '../commands/migrate';
import { createDatabaseCommand } from '../commands/database';

const program = new Command();
const configManager = ConfigManager.getInstance();
const config = configManager.loadConfig();

// Docker is the default and only mode for agent management
const agentManager = new DockerAgentManager();

// Helper function to parse Task Master output when --json is not supported
function parseTaskMasterOutput(taskId: string, output: string): any {
  const lines = output.split('\n').map(line => line.trim()).filter(line => line);
  
  const task: any = {
    id: taskId,
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    subtasks: []
  };

  let currentSection = '';
  let descriptionLines: string[] = [];

  for (const line of lines) {
    // Extract title from first meaningful line or task header
    if (line.includes(`Task ${taskId}:`) || line.includes(`# Task ${taskId}`)) {
      task.title = line.replace(`Task ${taskId}:`, '').replace(`# Task ${taskId}`, '').replace(/^[:#\s-]+/, '').trim();
    } else if (!task.title && line.includes(taskId) && line.includes(':')) {
      task.title = line.split(':')[1]?.trim() || '';
    }

    // Extract status
    if (line.toLowerCase().includes('status:')) {
      const statusMatch = line.match(/status:\s*(\w+)/i);
      if (statusMatch) {
        task.status = statusMatch[1].toLowerCase();
      }
    }

    // Extract priority
    if (line.toLowerCase().includes('priority:')) {
      const priorityMatch = line.match(/priority:\s*(\w+)/i);
      if (priorityMatch) {
        task.priority = priorityMatch[1].toLowerCase();
      }
    }

    // Extract dependencies
    if (line.toLowerCase().includes('dependencies:') || line.toLowerCase().includes('depends on:')) {
      const depsMatch = line.match(/(?:dependencies|depends on):\s*(.+)/i);
      if (depsMatch) {
        task.dependencies = depsMatch[1].split(/[,\s]+/).filter(dep => dep.trim());
      }
    }

    // Collect description lines
    if (line.toLowerCase().includes('description:')) {
      currentSection = 'description';
      const descMatch = line.match(/description:\s*(.+)/i);
      if (descMatch && descMatch[1].trim()) {
        descriptionLines.push(descMatch[1].trim());
      }
    } else if (currentSection === 'description' && 
               !line.toLowerCase().includes('status:') && 
               !line.toLowerCase().includes('priority:') &&
               !line.toLowerCase().includes('dependencies:') &&
               !line.startsWith('#') &&
               line.length > 0) {
      descriptionLines.push(line);
    } else if (line.toLowerCase().includes('status:') || 
               line.toLowerCase().includes('priority:') ||
               line.toLowerCase().includes('dependencies:')) {
      currentSection = '';
    }
  }

  // Use first line as title if we didn't find a specific title
  if (!task.title && lines.length > 0) {
    task.title = lines[0].replace(/^[#\s-]+/, '').replace(/^\d+[\.\s]*/, '').trim();
  }

  // Join description lines
  if (descriptionLines.length > 0) {
    task.description = descriptionLines.join(' ').trim();
  }

  // Fallback title if still empty
  if (!task.title) {
    task.title = `Task ${taskId}`;
  }

  return task;
}

// Helper function to parse Task Master list output when --json is not supported
function parseTaskListOutput(output: string): any[] {
  const lines = output.split('\n').map(line => line.trim()).filter(line => line);
  const tasks: any[] = [];
  
  for (const line of lines) {
    // Look for task patterns like "1. Task Title" or "1.2 Subtask Title"
    const taskMatch = line.match(/^(\d+(?:\.\d+)*)[.\s]+(.+?)(?:\s+\((\w+)\))?$/);
    if (taskMatch) {
      const [, id, title, status] = taskMatch;
      tasks.push({
        id,
        title: title.trim(),
        status: status ? status.toLowerCase() : 'pending',
        priority: 'medium'
      });
    }
  }
  
  return tasks;
}

// Enhanced function to set up complete Task Master environment in agent worktree
async function setupTaskMasterEnvironment(worktreePath: string, taskId?: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const { execSync } = await import('child_process');
  
  try {
    // Find the main project directory (where Task Master is configured)
    const currentDir = process.cwd();
    let projectRoot = currentDir;
    
    // Look for .taskmaster directory in current directory or parent directories
    let taskMasterDir = '';
    let searchDir = currentDir;
    
    // Search up to 5 levels for .taskmaster directory
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(searchDir, '.taskmaster');
      if (fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()) {
        taskMasterDir = testPath;
        projectRoot = searchDir;
        break;
      }
      const parentDir = path.dirname(searchDir);
      if (parentDir === searchDir) break; // Reached root
      searchDir = parentDir;
    }
    
    if (!taskMasterDir) {
      ui.warning('Task Master configuration not found in current project hierarchy');
      return;
    }
    
    // Set up .taskmaster directory in worktree
    const worktreeTaskMasterDir = path.join(worktreePath, '.taskmaster');
    
    // Create destination directory
    if (!fs.existsSync(worktreeTaskMasterDir)) {
      fs.mkdirSync(worktreeTaskMasterDir, { recursive: true });
    }
    
    ui.info('Setting up complete Task Master environment...');
    
    // 1. Copy base configuration and inherit all settings
    const filesToCopy = ['config.json'];
    for (const fileName of filesToCopy) {
      const sourcePath = path.join(taskMasterDir, fileName);
      const destPath = path.join(worktreeTaskMasterDir, fileName);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        ui.muted(`  ✓ Inherited ${fileName} with AI models and settings`);
      }
    }
    
    // 2. Copy or link essential directories
    const dirsToLink = ['docs', 'templates'];
    for (const dirName of dirsToLink) {
      const sourcePath = path.join(taskMasterDir, dirName);
      const destPath = path.join(worktreeTaskMasterDir, dirName);
      
      if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
        try {
          fs.symlinkSync(sourcePath, destPath, 'dir');
          ui.muted(`  ✓ Linked ${dirName} directory`);
        } catch (symlinkError) {
          try {
            copyDirectoryRecursive(sourcePath, destPath);
            ui.muted(`  ✓ Copied ${dirName} directory`);
          } catch (copyError) {
            ui.muted(`  ⚠ Could not link/copy ${dirName}`);
          }
        }
      }
    }
    
    // 3. Initialize Task Master in the agent worktree
    const originalCwd = process.cwd();
    process.chdir(worktreePath);
    
    try {
      // Initialize Task Master in worktree
      execSync('task-master init --quiet || true', { stdio: 'pipe' });
      ui.muted('  ✓ Initialized Task Master in agent worktree');
      
      // Check for PRD files in the main project and parse them
      const mainPRDPath = path.join(taskMasterDir, 'docs', 'prd.txt');
      const altPRDPath = path.join(projectRoot, 'prd.txt');
      const altPRDPath2 = path.join(projectRoot, 'docs', 'prd.txt');
      
      let prdPath = '';
      if (fs.existsSync(mainPRDPath)) {
        prdPath = mainPRDPath;
      } else if (fs.existsSync(altPRDPath)) {
        prdPath = altPRDPath;
      } else if (fs.existsSync(altPRDPath2)) {
        prdPath = altPRDPath2;
      }
      
      if (prdPath) {
        // Copy PRD to agent worktree docs
        const agentDocsDir = path.join(worktreeTaskMasterDir, 'docs');
        if (!fs.existsSync(agentDocsDir)) {
          fs.mkdirSync(agentDocsDir, { recursive: true });
        }
        
        const agentPRDPath = path.join(agentDocsDir, 'prd.txt');
        if (!fs.existsSync(agentPRDPath)) {
          fs.copyFileSync(prdPath, agentPRDPath);
          ui.muted('  ✓ Copied PRD to agent worktree');
        }
        
        // Parse PRD in agent context if tasks don't exist
        const agentTasksPath = path.join(worktreeTaskMasterDir, 'tasks.json');
        if (!fs.existsSync(agentTasksPath)) {
          try {
            execSync(`task-master parse-prd "${agentPRDPath}" --research --quiet || task-master parse-prd "${agentPRDPath}" --quiet || true`, { stdio: 'pipe' });
            ui.muted('  ✓ Parsed PRD and generated tasks in agent context');
          } catch (parseError) {
            ui.muted('  ⚠ Could not parse PRD automatically');
          }
        } else {
          // Copy existing tasks from main project
          const mainTasksPath = path.join(taskMasterDir, 'tasks.json');
          if (fs.existsSync(mainTasksPath)) {
            fs.copyFileSync(mainTasksPath, agentTasksPath);
            ui.muted('  ✓ Inherited existing tasks from main project');
          }
        }
      }
      
      // 4. Create task-specific environment file
      if (taskId) {
        const taskEnvFile = path.join(worktreeTaskMasterDir, 'task-environment.json');
        const taskEnv = {
          focusTaskId: taskId,
          projectRoot: projectRoot,
          agentWorktree: worktreePath,
          createdAt: new Date().toISOString(),
          inheritedSettings: true,
          autoInitialized: true
        };
        fs.writeFileSync(taskEnvFile, JSON.stringify(taskEnv, null, 2));
        ui.muted(`  ✓ Created task-specific environment for Task ${taskId}`);
      }
      
    } finally {
      process.chdir(originalCwd);
    }
    
    // Create a reference file to the original project
    const projectRefFile = path.join(worktreeTaskMasterDir, 'project-root.txt');
    fs.writeFileSync(projectRefFile, projectRoot);
    
    ui.success('Complete Task Master environment set up in agent worktree');
    
  } catch (error) {
    ui.warning(`Could not set up complete Task Master environment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to detect project type for smart branch naming
async function detectProjectType(): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  
  const currentDir = process.cwd();
  
  // Check for common project patterns
  const patterns = [
    { files: ['package.json'], keywords: ['bug', 'fix', 'hotfix'], type: 'bug' },
    { files: ['package.json'], keywords: ['task', 'todo', 'item'], type: 'task' },
    { files: ['package.json'], keywords: ['experiment', 'test', 'poc', 'prototype'], type: 'experiment' },
    { files: ['package.json'], keywords: ['feature', 'feat'], type: 'feature' },
  ];
  
  // Check git branch name patterns
  try {
    const { execSync } = await import('child_process');
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8', cwd: currentDir }).trim();
    
    if (currentBranch.startsWith('hotfix/') || currentBranch.includes('hotfix')) return 'hotfix';
    if (currentBranch.startsWith('fix/') || currentBranch.includes('fix')) return 'bug';
    if (currentBranch.startsWith('task/') || currentBranch.includes('task')) return 'task';
    if (currentBranch.startsWith('experiment/') || currentBranch.includes('experiment')) return 'experiment';
  } catch (error) {
    // Git not available or not in a repo, continue with file-based detection
  }
  
  // Check for Task Master task context
  const taskMasterContext = path.join(currentDir, '.taskmaster', 'current-task.json');
  if (fs.existsSync(taskMasterContext)) {
    try {
      const taskData = JSON.parse(fs.readFileSync(taskMasterContext, 'utf8'));
      if (taskData.id) return 'task';
    } catch (error) {
      // Invalid task context, continue
    }
  }
  
  // Check issue/bug tracking files
  const issueFiles = ['.github/ISSUE_TEMPLATE', 'BUGS.md', 'ISSUES.md', 'bug-report.md'];
  for (const file of issueFiles) {
    if (fs.existsSync(path.join(currentDir, file))) {
      return 'bug';
    }
  }
  
  // Default to feature
  return 'feature';
}

// Helper function to recursively copy directories
function copyDirectoryRecursive(source: string, destination: string): void {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectoryRecursive(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Helper function to create GitHub issue for the task
async function createGitHubIssueForTask(task: any, branchName: string, agentId: string, worktreePath?: string): Promise<string | null> {
  const { execSync } = await import('child_process');
  
  try {
    // Check if gh CLI is available
    execSync('which gh', { stdio: 'ignore' });
    
    // Check if we're in a GitHub repository
    const repoInfo = execSync('gh repo view --json nameWithOwner', { 
      encoding: 'utf8',
      cwd: worktreePath || process.cwd()
    });
    const repo = JSON.parse(repoInfo);
    
    if (!repo.nameWithOwner) {
      ui.muted('  ⚠ Not a GitHub repository, skipping issue creation');
      return null;
    }
    
    // Create structured issue title and body with cleaner format
    const issueTitle = `Task ${task.id}: ${task.title}`;
    
    // Calculate complexity if available (you can customize this logic)
    const complexity = task.subtasks ? Math.min(10, Math.ceil(task.subtasks.length * 1.5)) : 5;
    
    const issueBody = `## Task Overview
**Task ID:** ${task.id}  
**Priority:** ${(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}  
**Status:** ${(task.status || 'pending').charAt(0).toUpperCase() + (task.status || 'pending').slice(1)}  
**Complexity:** ${complexity}/10  

## Description
${task.description || task.title}

## Implementation Details
${task.details || task.title}

${task.testStrategy ? `## Test Strategy
${task.testStrategy}` : ''}

## Subtasks
${task.subtasks && task.subtasks.length > 0 
  ? task.subtasks.map((subtask: any) => {
      const deps = subtask.dependencies && subtask.dependencies.length > 0 
        ? ` (depends on ${subtask.dependencies.join(', ')})`
        : '';
      return `- [ ] **${subtask.id}:** ${subtask.title}${deps}`;
    }).join('\n\n')
  : '- [ ] Complete implementation as described'}

## Progress
${task.subtasks ? `0/${task.subtasks.length} subtasks completed (0%)` : 'Not started'}

## Development Info
**Branch:** \`${branchName}\`  
**Agent:** \`${agentId}\`  
${task.dependencies && task.dependencies.length > 0 ? `**Dependencies:** Tasks ${task.dependencies.join(', ')} must be completed first` : ''}

## Quick Commands
\`\`\`bash
# Start working on this task
magents attach ${agentId}

# Update task status
tm set-status --id=${task.id} --status=in_progress
tm update-subtask --id=${task.id} --prompt="progress notes"
tm set-status --id=${task.id} --status=done
\`\`\`

---
_Task ${task.id} • Generated by Magents_`;

    // Write issue body to temporary file to avoid shell escaping issues
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmpFile = path.join(os.tmpdir(), `magents-issue-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, issueBody);
    
    // Ensure labels exist before creating issue
    const labels = ['task-master', `${task.priority || 'medium'}-priority`];
    for (const label of labels) {
      try {
        // Check if label exists
        execSync(`gh label list --limit 1000 | grep -q "^${label}"`, { 
          stdio: 'ignore',
          cwd: worktreePath || process.cwd()
        });
      } catch {
        // Label doesn't exist, create it
        try {
          const labelColors: Record<string, string> = {
            'task-master': '0366d6',  // Blue
            'high-priority': 'd73a4a',  // Red
            'medium-priority': 'fbca04',  // Yellow
            'low-priority': '0e8a16'  // Green
          };
          const color = labelColors[label] || '0366d6';
          execSync(`gh label create "${label}" --color "${color}"`, {
            stdio: 'ignore',
            cwd: worktreePath || process.cwd()
          });
          ui.muted(`  ✓ Created label: ${label}`);
        } catch (error) {
          ui.muted(`  ⚠ Could not create label ${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    // Create the issue using file input
    const createCommand = `gh issue create --title "${issueTitle.replace(/"/g, '\\"')}" --body-file "${tmpFile}" --label "${labels.join(',')}"`;
    const issueOutput = execSync(createCommand, { 
      encoding: 'utf8',
      cwd: worktreePath || process.cwd()
    });
    
    // Clean up temp file
    fs.unlinkSync(tmpFile);
    
    // Extract issue URL from output
    const issueUrl = issueOutput.trim();
    ui.muted(`  ✓ Created GitHub issue: ${issueUrl}`);
    
    return issueUrl;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('gh not found')) {
      ui.muted('  ⚠ GitHub CLI not installed, skipping issue creation');
    } else {
      ui.muted(`  ⚠ Could not create GitHub issue: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

program
  .name('magents')
  .description('Multi-Agent Claude Code Workflow Manager')
  .version('1.0.0');

// Custom help handler to show beautiful interface
program.on('--help', () => {
  ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
  ui.divider('Instant Agent Creation Examples');
  ui.command('magents create auth-system', 'Create agent with smart defaults');
  ui.command('magents create user-dashboard --mode standard', 'Create with Task Master integration');
  ui.command('magents create fix-login-bug --mode advanced', 'Create with full setup');
  ui.command('magents create payment-flow --task 24.1', 'Create for specific task');
  ui.command('magents create api-refactor --dry-run', 'Preview what would be created');
  ui.divider('Management Examples');
  ui.command('magents ls', 'Show all active agents');
  ui.command('magents a 1', 'Connect to first agent');
  ui.command('magents attach agent-123', 'Connect to specific agent');
  ui.command('magents cleanup --remove-worktrees', 'Clean up everything');
  ui.divider();
  ui.info('For more help on a specific command, use: magents help <command>');
});

if (process.argv.length === 2) {
  ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
  ui.divider('Core Commands');
  ui.command('magents create <name>', 'Create agent with smart defaults');
  ui.command('magents create <name> --mode <simple|standard|advanced>', 'Progressive complexity modes');
  ui.command('magents create <name> --task <id>', 'Create for Task Master task');
  ui.command('magents list (ls)', 'List all agents');
  ui.command('magents attach (a) <id>', 'Attach to agent');
  ui.command('magents stop <id>', 'Stop agent');
  ui.divider('Advanced Commands');
  ui.command('magents task-create <task-id>', 'Create intelligent agent for specific task');
  ui.command('magents task-agents', 'Create agents from all pending tasks');
  ui.command('magents work-issue <id>', 'Structured development workflow (PLAN→CREATE→TEST→DEPLOY)');
  ui.command('magents sync-taskmaster <id>', 'Sync Task Master config to agent');
  ui.command('magents doctor', 'Check system requirements');
  ui.command('magents config', 'View and edit configuration');
  ui.divider();
  ui.info('Runtime: Docker containers with isolated environments');
  ui.info('Run "magents --help" for detailed examples');
}

// Create command - enhanced with instant creation
program
  .command('create')
  .description('Create new agent with smart defaults and minimal configuration')
  .argument('<name>', 'Agent name or branch name')
  .argument('[agent-id]', 'Optional agent ID (auto-generated if not provided)')
  .option('--branch <branch>', 'Specific branch name (defaults to feature/<name>)')
  .option('--task <taskId>', 'Task Master task ID to work on')
  .option('--mode <mode>', 'Creation mode: simple, standard, or advanced', 'simple')
  .option('--dry-run', 'Show what would be created without creating')
  .option('--no-auto-accept', 'Disable automatic command acceptance in Claude Code')
  .option('--interactive', 'Use interactive mode for missing parameters')
  .action(async (name: string, agentId?: string, options?: { 
    branch?: string; 
    task?: string; 
    mode?: string; 
    dryRun?: boolean; 
    autoAccept?: boolean; 
    docker?: boolean; 
    interactive?: boolean;
  }) => {
    try {
      // === INSTANT AGENT CREATION WITH SMART DEFAULTS ===
      
      // 1. Smart branch name generation
      let branchName = options?.branch;
      if (!branchName) {
        // Auto-detect project type and generate appropriate branch prefix
        const projectType = await detectProjectType();
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
        
        const branchPrefixes = {
          'feature': 'feature',
          'bug': 'fix',
          'hotfix': 'hotfix',
          'task': 'task',
          'experiment': 'experiment'
        };
        
        const prefix = branchPrefixes[projectType as keyof typeof branchPrefixes] || 'feature';
        branchName = `${prefix}/${sanitizedName}`;
      }
      
      // 2. Smart agent ID generation
      if (!agentId) {
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        agentId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${timestamp}`;
      }
      
      // 3. Progressive complexity modes
      const { modeManager } = await import('../commands/mode');
      const currentModeConfig = modeManager.getCurrentMode();
      const mode = options?.mode || currentModeConfig.mode || 'simple';
      
      // Show mode-specific help if different from current
      if (mode !== currentModeConfig.mode) {
        ui.info(`Creating agent in ${mode} mode (current default: ${currentModeConfig.mode})`);
        ui.tip(`Set ${mode} as default with: magents mode switch ${mode}`);
      }
      
      let creationConfig: any = {
        autoAccept: options?.autoAccept !== false, // Default to true for instant creation
        useDocker: true // Always use Docker
      };
      
      switch (mode) {
        case 'simple':
          // Minimal config - use all defaults
          creationConfig = {
            ...creationConfig,
            setupTaskMaster: false,
            createIssue: false,
            pushBranch: false
          };
          break;
          
        case 'standard':
          // Balanced setup with Task Master integration
          creationConfig = {
            ...creationConfig,
            setupTaskMaster: true,
            createIssue: false,
            pushBranch: true
          };
          break;
          
        case 'advanced':
          // Full setup with all features
          creationConfig = {
            ...creationConfig,
            setupTaskMaster: true,
            createIssue: true,
            pushBranch: true,
            createBriefing: true
          };
          break;
      }
      
      // 4. Task Master integration if task specified
      if (options?.task) {
        try {
          const { execSync } = await import('child_process');
          const taskOutput = execSync(`task-master show ${options.task}`, { encoding: 'utf8' });
          const task = parseTaskMasterOutput(options.task, taskOutput);
          
          if (task) {
            ui.success(`Found Task Master task: ${task.title}`);
            creationConfig.taskId = options.task;
            creationConfig.setupTaskMaster = true;
            
            // Update branch name to include task ID
            if (!options?.branch) {
              branchName = `task/${options.task}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
            }
          }
        } catch (error) {
          ui.warning(`Task ${options.task} not found, proceeding without Task Master integration`);
        }
      }
      
      // 5. Interactive mode for missing parameters
      if (options?.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'setupTaskMaster',
            message: 'Set up Task Master environment?',
            default: creationConfig.setupTaskMaster,
            when: () => mode !== 'simple'
          },
          {
            type: 'confirm',
            name: 'createIssue',
            message: 'Create GitHub issue?',
            default: creationConfig.createIssue,
            when: () => mode === 'advanced'
          },
          {
            type: 'confirm',
            name: 'pushBranch',
            message: 'Push branch to origin?',
            default: creationConfig.pushBranch,
            when: () => mode !== 'simple'
          }
        ]);
        
        creationConfig = { ...creationConfig, ...answers };
      }
      
      // 6. Show dry-run summary
      if (options?.dryRun) {
        ui.header('Dry Run - Agent Creation Preview');
        ui.keyValue('Agent Name', name);
        ui.keyValue('Agent ID', agentId);
        ui.keyValue('Branch Name', branchName);
        ui.keyValue('Mode', mode);
        ui.keyValue('Docker Enabled', creationConfig.useDocker ? 'Yes' : 'No');
        ui.keyValue('Task Master Setup', creationConfig.setupTaskMaster ? 'Yes' : 'No');
        ui.keyValue('Create GitHub Issue', creationConfig.createIssue ? 'Yes' : 'No');
        ui.keyValue('Push Branch', creationConfig.pushBranch ? 'Yes' : 'No');
        if (options?.task) {
          ui.keyValue('Task Master Task', options.task);
        }
        ui.info('Use without --dry-run to create the agent');
        return;
      }
      
      // 7. Progress indicators for long operations
      const spinner = ui.spinner('Creating agent with smart defaults...');
      spinner.start();
      
      // 8. Create the agent
      const currentPath = process.cwd();
      const projectId = path.basename(currentPath);
      const result = await agentManager.createAgent({
        branch: branchName,
        agentId,
        autoAccept: creationConfig.autoAccept,
        useDocker: creationConfig.useDocker,
        projectId
      });

      if (result.success && result.data) {
        spinner.succeed('Agent created successfully!');
        
        // 9. Post-creation setup based on mode
        if (creationConfig.setupTaskMaster) {
          const setupSpinner = ui.spinner('Setting up Task Master environment...');
          setupSpinner.start();
          try {
            await setupTaskMasterEnvironment(result.data.worktreePath, options?.task);
            setupSpinner.succeed('Task Master environment configured');
          } catch (error) {
            setupSpinner.warn('Task Master setup failed, continuing...');
          }
        }
        
        if (creationConfig.pushBranch) {
          const pushSpinner = ui.spinner('Pushing branch to origin...');
          pushSpinner.start();
          try {
            const { execSync } = await import('child_process');
            execSync(`git push -u origin ${branchName}`, { 
              cwd: result.data.worktreePath,
              stdio: 'pipe'
            });
            pushSpinner.succeed('Branch pushed to origin');
          } catch (error) {
            pushSpinner.warn('Branch push failed, continuing...');
          }
        }
        
        // 10. Display agent information
        const agent = {
          id: result.data.agentId,
          branch: result.data.branch,
          worktreePath: result.data.worktreePath,
          tmuxSession: result.data.tmuxSession,
          status: 'Active',
          createdAt: new Date(),
          useDocker: creationConfig.useDocker
        };
        
        ui.agentDetails(agent);
        
        // 11. Show quick start commands
        ui.divider('Quick Start');
        ui.command(`magents attach ${result.data.agentId}`, 'Start working on the agent');
        if (options?.task) {
          ui.command(`get_task({id: "${options.task}"})`, 'Get task details in Claude Code');
        }
        ui.command(`magents a 1`, 'Or use shorthand to attach');
        
        ui.divider('Agent Setup Complete');
        ui.success(`✅ Mode: ${mode} (Docker container)`);
        if (creationConfig.setupTaskMaster) {
          ui.success('✅ Task Master environment ready');
        }
        if (creationConfig.pushBranch) {
          ui.success('✅ Branch pushed to origin');
        }
        
      } else {
        spinner.fail(result.message);
        process.exit(1);
      }
    } catch (error) {
      ui.error(`Failed to create agent: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all active agents')
  .action(() => {
    const agents = agentManager.getActiveAgents();
    
    ui.header('Active Claude Code Agents', false);
    
    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      branch: agent.branch,
      status: agent.status,
      createdAt: new Date(agent.createdAt)
    }));
    
    ui.agentList(formattedAgents);
    
    if (agents.length > 0) {
      ui.divider();
      ui.info(`Total: ${agents.length} agent${agents.length !== 1 ? 's' : ''}`);
      ui.muted('\nTip: Use "magents a <number>" to quickly attach by position');
    }
  });

// Attach command
program
  .command('attach')
  .alias('a')
  .description('Attach to an existing agent\'s Docker container')
  .argument('<agent-id-or-number>', 'Agent ID or list position number (1, 2, etc.)')
  .option('--no-briefing', 'Skip showing task briefing before attaching')
  .action(async (agentIdOrNumber: string, options: { briefing?: boolean }) => {
    const showBriefing = options.briefing !== false;
    
    try {
      // Get all agents
      const agents = agentManager.getActiveAgents();
      
      if (agents.length === 0) {
        ui.error('No active agents found. Create an agent first with "magents create".');
        process.exit(1);
      }
      
      let agent;
      
      // Check if input is a number
      const listNumber = parseInt(agentIdOrNumber);
      if (!isNaN(listNumber) && listNumber > 0 && listNumber <= agents.length) {
        // Use list position (1-based index)
        agent = agents[listNumber - 1];
        ui.muted(`Using agent #${listNumber} from list: ${agent.id}`);
      } else {
        // Try to find by agent ID
        agent = agents.find(a => a.id === agentIdOrNumber);
      }
      
      if (!agent) {
        ui.error(`Agent '${agentIdOrNumber}' not found.`);
        ui.info(`Available agents:`);
        agents.forEach((a, index) => {
          ui.keyValue(`  ${index + 1}`, a.id);
        });
        ui.info(`\nUse either the agent ID or position number (1-${agents.length})`);
        process.exit(1);
      }

      // Check for task briefing file
      if (showBriefing) {
        const fs = await import('fs');
        const path = await import('path');
        
        const briefingFile = path.join(agent.worktreePath, 'TASK_BRIEFING.md');
        const taskContextFile = path.join(agent.worktreePath, '.taskmaster', 'current-task.json');
        
        if (fs.existsSync(taskContextFile)) {
          try {
            const taskContent = fs.readFileSync(taskContextFile, 'utf8');
            const task = JSON.parse(taskContent);
            
            ui.header(`Task Briefing for Agent ${agent.id}`);
            
            ui.box(
              `Task ID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority || 'medium'}\n\nDescription:\n${task.description || 'No description provided'}`,
              `Current Task: ${task.id}`,
              'info'
            );

            if (task.dependencies && task.dependencies.length > 0) {
              ui.keyValue('Dependencies', task.dependencies.join(', '));
            }

            if (task.subtasks && task.subtasks.length > 0) {
              ui.divider('Subtasks');
              task.subtasks.forEach((subtask: any) => {
                const statusColor = subtask.status === 'done' ? '✅' : 
                                  subtask.status === 'in_progress' ? '🔄' : '⏳';
                ui.keyValue(`${statusColor} ${subtask.id}`, `${subtask.title} (${subtask.status})`);
              });
            }

            ui.divider('Quick Commands');
            ui.command(`get_task({id: "${task.id}"})`, 'Get full task details');
            ui.command(`set_task_status({id: "${task.id}", status: "in_progress"})`, 'Mark task as started');
            ui.command(`update_subtask({id: "${task.id}", prompt: "your notes"})`, 'Log progress');
            ui.command(`set_task_status({id: "${task.id}", status: "done"})`, 'Mark task complete');
            
            ui.divider();
            ui.info(`Full briefing available at: ${briefingFile}`);
            
            // Brief pause to read the briefing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            ui.warning('Could not load task context, but agent exists');
          }
        } else if (fs.existsSync(briefingFile)) {
          ui.info(`Task briefing available at: ${briefingFile}`);
          ui.info('This agent has task context - check TASK_BRIEFING.md in the worktree');
        }
      }

      const spinner = ui.spinner(`Attaching to agent '${agent.id}'...`);
      spinner.start();
      
      const result = await agentManager.attachToAgent(agent.id);
      
      if (result.success) {
        spinner.stop();
        // The attach process will take over the terminal
      } else {
        spinner.fail(result.message);
        process.exit(1);
      }
    } catch (error) {
      ui.error(`Failed to attach: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Stop command
program
  .command('stop')
  .description('Stop an agent and optionally remove its worktree')
  .argument('<agent-id-or-number>', 'Agent ID or list position number (1, 2, etc.)')
  .option('-r, --remove-worktree', 'Remove the worktree as well')
  .action(async (agentIdOrNumber: string, options: { removeWorktree?: boolean }) => {
    // Get all agents
    const agents = agentManager.getActiveAgents();
    
    if (agents.length === 0) {
      ui.error('No active agents found.');
      process.exit(1);
    }
    
    let agent;
    let agentId: string;
    
    // Check if input is a number
    const listNumber = parseInt(agentIdOrNumber);
    if (!isNaN(listNumber) && listNumber > 0 && listNumber <= agents.length) {
      // Use list position (1-based index)
      agent = agents[listNumber - 1];
      agentId = agent.id;
      ui.muted(`Using agent #${listNumber} from list: ${agentId}`);
    } else {
      // Use as agent ID directly
      agentId = agentIdOrNumber;
      agent = agents.find(a => a.id === agentId);
    }
    
    if (!agent) {
      ui.error(`Agent '${agentIdOrNumber}' not found.`);
      ui.info(`Available agents:`);
      agents.forEach((a, index) => {
        ui.keyValue(`  ${index + 1}`, a.id);
      });
      ui.info(`\nUse either the agent ID or position number (1-${agents.length})`);
      process.exit(1);
    }
    
    let removeWorktree = options.removeWorktree || false;
    
    // Ask about worktree removal if not specified
    if (!options.removeWorktree) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'removeWorktree',
          message: 'Do you want to remove the worktree as well?',
          default: false
        }
      ]);
      removeWorktree = answer.removeWorktree;
    }
    
    const spinner = ui.spinner(`Stopping agent '${agentId}'...`);
    spinner.start();
    
    try {
      const result = await agentManager.stopAgent(agentId, removeWorktree);
      
      if (result.success) {
        spinner.succeed(result.message);
      } else {
        spinner.fail(result.message);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Stop all agents and clean up')
  .option('-r, --remove-worktrees', 'Remove all worktrees as well')
  .option('--fix-orphaned', 'Remove orphaned agents from the list')
  .action(async (options: { removeWorktrees?: boolean; fixOrphaned?: boolean }) => {
    const agents = agentManager.getActiveAgents();
    
    if (options.fixOrphaned) {
      ui.header('Fixing Orphaned Agents');
      const orphaned: string[] = [];
      
      // Check each agent to see if its worktree still exists
      for (const agent of agents) {
        if (!fs.existsSync(agent.worktreePath)) {
          orphaned.push(agent.id);
          ui.warning(`Found orphaned agent: ${agent.id} (worktree missing)`);
        }
      }
      
      if (orphaned.length > 0) {
        const confirmFix = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Remove ${orphaned.length} orphaned agent(s) from the list?`,
            default: true
          }
        ]);
        
        if (confirmFix.proceed) {
          for (const agentId of orphaned) {
            await agentManager.stopAgent(agentId, false);
            ui.success(`Removed orphaned agent: ${agentId}`);
          }
        }
      } else {
        ui.success('No orphaned agents found');
      }
      return;
    }
    
    if (agents.length === 0) {
      ui.warning('No active agents to cleanup');
      return;
    }
    
    ui.warning(`This will stop ${agents.length} active agent${agents.length !== 1 ? 's' : ''}:`);
    agents.forEach(agent => {
      ui.keyValue(`  ${agent.id}`, agent.branch);
    });
    ui.divider();
    
    const confirmCleanup = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue with cleanup?',
        default: false
      }
    ]);
    
    if (!confirmCleanup.proceed) {
      ui.info('Cleanup cancelled');
      return;
    }
    
    let removeWorktrees = options.removeWorktrees || false;
    
    if (!options.removeWorktrees) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'removeWorktrees',
          message: 'Remove all worktrees as well?',
          default: false
        }
      ]);
      removeWorktrees = answer.removeWorktrees;
    }
    
    const spinner = ui.spinner('Cleaning up all agents...');
    spinner.start();
    
    try {
      const result = await agentManager.cleanupAllAgents(removeWorktrees);
      
      if (result.success) {
        spinner.succeed(result.message);
      } else {
        spinner.warn(result.message);
      }
    } catch (error) {
      spinner.fail(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize configuration')
  .action(() => {
    const spinner = ui.spinner('Initializing magents configuration...');
    spinner.start();
    
    try {
      configManager.initializeConfig();
      spinner.succeed('Configuration initialized successfully!');
      
      const configPath = configManager.getConfigPath();
      
      ui.box(
        `Configuration file: ${configPath}\nAgents directory: ${configManager.getAgentsDir()}`,
        'Configuration Details',
        'success'
      );
      
      ui.divider('Quick Start');
      ui.command('magents create feature/my-feature', 'Create a new agent');
      ui.command('magents list', 'List all agents');
      ui.command('magents attach <agent-id>', 'Attach to an agent');
    } catch (error) {
      spinner.fail(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Mode management command
program
  .command('mode')
  .description('Manage complexity modes (simple, standard, advanced)')
  .argument('[action]', 'Action: switch, show, recommend')
  .argument('[mode]', 'Target mode: simple, standard, advanced')
  .option('--no-preserve', 'Do not preserve data when switching modes')
  .option('--dry-run', 'Preview mode switch without making changes')
  .action(async (action?: string, mode?: string, options?: { preserve?: boolean; dryRun?: boolean }) => {
    const { modeManager } = await import('../commands/mode');
    
    switch (action) {
      case 'switch':
        if (!mode || !['simple', 'standard', 'advanced'].includes(mode)) {
          ui.error('Please specify a valid mode: simple, standard, or advanced');
          process.exit(1);
        }
        await modeManager.switchMode(mode as 'simple' | 'standard' | 'advanced', options?.preserve !== false, options?.dryRun);
        break;
        
      case 'show':
        const currentMode = modeManager.getCurrentMode();
        ui.header(`Current Mode: ${currentMode.mode}`);
        ui.keyValue('Help Level', currentMode.helpLevel);
        ui.divider('Enabled Features');
        Object.entries(currentMode.features).forEach(([feature, enabled]) => {
          const featureName = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          ui.keyValue(featureName, enabled ? '✓ Enabled' : '✗ Disabled');
        });
        break;
        
      case 'recommend':
        const recommended = modeManager.getModeRecommendation();
        ui.info(`Based on your environment, we recommend: ${recommended} mode`);
        ui.tip(`Switch with: magents mode switch ${recommended}`);
        break;
        
      case 'help':
        modeManager.showModeHelp(mode);
        break;
        
      default:
        // Show current mode and help
        const current = modeManager.getCurrentMode();
        ui.info(`Current mode: ${current.mode}`);
        modeManager.showModeHelp();
        ui.divider('Available Commands');
        ui.command('magents mode show', 'Show current mode and features');
        ui.command('magents mode switch <mode>', 'Switch to a different mode');
        ui.command('magents mode recommend', 'Get mode recommendation');
        ui.command('magents mode help [mode]', 'Show help for a specific mode');
        break;
    }
  });

// Assign command - automatic task generation and assignment
program
  .command('assign')
  .description('Automatically analyze project and assign tasks to agents')
  .option('-p, --project-path <path>', 'Project path to analyze (default: current directory)')
  .option('-a, --analyze', 'Show detailed project analysis')
  .option('--auto-create', 'Automatically create agents for high-priority tasks')
  .option('--agent <agentId>', 'Assign all tasks to specific agent')
  .option('--max-tasks <number>', 'Maximum number of tasks to generate', parseInt)
  .option('--category <category>', 'Filter tasks by category (testing, infrastructure, optimization, code-quality)')
  .option('--priority <priority>', 'Filter tasks by priority (high, medium, low)')
  .option('--mode <mode>', 'Complexity mode for task generation (simple, standard, advanced)', 'standard')
  .option('--dry-run', 'Preview tasks without creating them')
  .action(async (options) => {
    const { assignCommand } = await import('../commands/assign');
    await assignCommand.execute(options);
  });

// Task Master integration - create from specific task
program
  .command('task-create')
  .description('Create agent for a specific Task Master task')
  .argument('<task-id>', 'Task ID to create agent for (e.g., 1, 1.2, 2.1)')
  .argument('[agent-id]', 'Optional custom agent ID (default: task-{taskId}-agent)')
  .option('-p, --prefix <prefix>', 'Branch prefix for task branches', 'task')
  .option('-n, --dry-run', 'Show what would be created without creating')
  .option('--create-issue', 'Create GitHub issue for the task')
  .option('--no-auto-setup', 'Skip automatic Task Master setup and PRD parsing')
  .action(async (taskId: string, customAgentId: string | undefined, options: { prefix?: string; dryRun?: boolean; createIssue?: boolean; autoSetup?: boolean }) => {
    const { execSync } = await import('child_process');
    const prefix = options.prefix || 'task';
    
    try {
      // Check if task-master is available
      execSync('which task-master', { stdio: 'ignore' });
    } catch (error) {
      ui.error('Task Master not found. Install with: npm install -g task-master-ai');
      process.exit(1);
    }

    try {
      // Get specific task from Task Master
      let task;
      try {
        // Try with --json flag first (newer versions)
        const taskJson = execSync(`task-master show ${taskId} --json`, { encoding: 'utf8' });
        task = JSON.parse(taskJson);
      } catch (jsonError) {
        // Fallback to regular output and parse manually
        const taskOutput = execSync(`task-master show ${taskId}`, { encoding: 'utf8' });
        task = parseTaskMasterOutput(taskId, taskOutput);
      }
      
      if (!task || !task.id) {
        ui.error(`Task ${taskId} not found. Run "task-master list" to see available tasks.`);
        process.exit(1);
      }

      ui.header('Task-Specific Agent Creation');
      
      // Show task details
      ui.box(
        `Task ID: ${task.id}\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}\nPriority: ${task.priority || 'medium'}`,
        `Task ${task.id} Details`,
        'info'
      );

      // Generate branch and agent names
      const branchName = `${prefix}/${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      const agentId = customAgentId || `task-${task.id}-agent`;

      ui.keyValue('Branch Name', branchName);
      ui.keyValue('Agent ID', agentId);

      if (options.dryRun) {
        ui.info('Dry run complete. Use without --dry-run to create the agent.');
        return;
      }

      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Create agent for Task ${task.id}?`,
          default: true
        }
      ]);

      if (!confirm.proceed) {
        ui.info('Agent creation cancelled.');
        return;
      }

      const spinner = ui.spinner(`Creating agent for Task ${task.id}: ${task.title}`);
      spinner.start();

      try {
        const currentPath = process.cwd();
        const projectId = path.basename(currentPath);
        const result = await agentManager.createAgent({
          branch: branchName,
          agentId,
          autoAccept: true,
          projectId
        });

        if (result.success && result.data) {
          spinner.succeed(`Agent ${agentId} created successfully!`);
          
          // Create task context files in the worktree
          const fs = await import('fs');
          const path = await import('path');
          const worktreePath = result.data.worktreePath;
          
          // Set up complete Task Master environment with inherited settings
          if (options.autoSetup !== false) {
            await setupTaskMasterEnvironment(worktreePath, task.id);
          }
          
          // Create .taskmaster directory in worktree (may already exist from setup)
          const taskContextDir = path.join(worktreePath, '.taskmaster');
          if (!fs.existsSync(taskContextDir)) {
            fs.mkdirSync(taskContextDir, { recursive: true });
          }

          // Create task context file with enhanced information
          const enhancedTask = {
            ...task,
            agentId,
            branchName,
            worktreePath,
            createdAt: new Date().toISOString(),
            autoSetupEnabled: options.autoSetup !== false,
            issueCreationEnabled: options.createIssue || false
          };
          
          const taskContextFile = path.join(taskContextDir, 'current-task.json');
          fs.writeFileSync(taskContextFile, JSON.stringify(enhancedTask, null, 2));

          // Create GitHub issue if requested
          let issueUrl = null;
          if (options.createIssue) {
            ui.info('Creating GitHub issue for task...');
            issueUrl = await createGitHubIssueForTask(task, branchName, agentId, worktreePath);
          }

          // Push branch to origin
          try {
            const { execSync } = await import('child_process');
            ui.info('Pushing branch to origin...');
            
            // First, set upstream and push
            execSync(`git push -u origin ${branchName}`, { 
              cwd: worktreePath,
              stdio: 'pipe'
            });
            
            ui.muted(`  ✓ Branch pushed to origin/${branchName}`);
          } catch (error) {
            ui.muted(`  ⚠ Could not push branch to origin: ${error instanceof Error ? error.message : String(error)}`);
          }

          // Create comprehensive task briefing file for Claude
          const briefingContent = `# Task Briefing for Agent ${agentId}

## Current Task: ${task.id} - ${task.title}

### Description
${task.description || 'No description provided'}

### Status
- Current Status: ${task.status}
- Priority: ${task.priority || 'medium'}
- Created: ${new Date().toLocaleString()}
- Auto-Setup: ${options.autoSetup !== false ? 'Enabled' : 'Disabled'}
${issueUrl ? `- GitHub Issue: ${issueUrl}` : ''}

### Implementation Notes
${task.details || 'No additional details provided'}

### Test Strategy
${task.testStrategy || 'No test strategy defined'}

### Dependencies
${task.dependencies && task.dependencies.length > 0 
  ? task.dependencies.map((dep: string) => `- Task ${dep}`).join('\n')
  : 'No dependencies'}

### Subtasks
${task.subtasks && task.subtasks.length > 0
  ? task.subtasks.map((subtask: any) => `- ${subtask.id}: ${subtask.title} (${subtask.status})`).join('\n')
  : 'No subtasks defined'}

### Environment Setup
This agent has been configured with:
- ✅ Complete Task Master environment inherited from main project
- ✅ AI models and configuration copied automatically
- ✅ PRD parsed and tasks generated in agent context
- ✅ Project-specific context and dependencies
${issueUrl ? '- ✅ GitHub issue created for tracking progress' : ''}

### Getting Started
1. Review the task details above
2. Check dependencies: \`tm show ${task.id}\` or \`get_task({id: "${task.id}"})\`
3. View all tasks: \`tm list\` or \`get_tasks()\`
4. Mark as started: \`tm set-status --id=${task.id} --status=in_progress\`
5. Log progress: \`tm update-subtask --id=${task.id} --prompt="implementation notes"\`
6. Mark complete: \`tm set-status --id=${task.id} --status=done\`

### Task Master Commands Available
**CLI Commands:**
- \`tm list\` - List all tasks
- \`tm show ${task.id}\` - Get this task details
- \`tm next\` - Get next available task  
- \`tm set-status --id=${task.id} --status=in_progress\` - Mark as started
- \`tm update-subtask --id=${task.id} --prompt="notes"\` - Log progress
- \`tm set-status --id=${task.id} --status=done\` - Mark as complete

**MCP Commands (in Claude Code):**
- \`get_task({id: "${task.id}"})\` - Get this task details
- \`get_tasks()\` - List all tasks
- \`next_task()\` - Get next available task
- \`set_task_status({id: "${task.id}", status: "in_progress"})\` - Mark as started
- \`update_subtask({id: "${task.id}", prompt: "notes"})\` - Log progress
- \`set_task_status({id: "${task.id}", status: "done"})\` - Mark as complete

### Project Context
- **Project Root:** ${process.cwd()}
- **Branch:** ${branchName}
- **Agent ID:** ${agentId}
- **Worktree:** ${worktreePath}
- **Task Focus:** ${task.id}
${issueUrl ? `- **GitHub Issue:** ${issueUrl}` : ''}

### Development Workflow
1. Understand the requirements from the task description
2. Check any dependencies are completed
3. Plan the implementation approach
4. Mark task as in-progress when you start coding
5. Log key implementation decisions and progress
6. Test your implementation thoroughly
7. Mark task as done when complete
${issueUrl ? '8. Update the GitHub issue with completion status' : ''}

---
*This agent was automatically configured with Task Master environment and project context.*
`;

          const briefingFile = path.join(worktreePath, 'TASK_BRIEFING.md');
          fs.writeFileSync(briefingFile, briefingContent);

          // Also create in .claude directory for auto-loading
          const claudeDir = path.join(worktreePath, '.claude');
          if (fs.existsSync(claudeDir)) {
            const claudeBriefingFile = path.join(claudeDir, 'task-context.md');
            fs.writeFileSync(claudeBriefingFile, briefingContent);
          }

          ui.success('Task context files created in worktree');

          const agent = {
            id: result.data.agentId,
            branch: result.data.branch,
            worktreePath: result.data.worktreePath,
            tmuxSession: result.data.tmuxSession,
            status: 'Active',
            createdAt: new Date()
          };
          
          ui.agentDetails(agent);
          
          ui.divider('Next Steps');
          ui.command(`magents attach ${agentId}`, 'Attach to agent and start working on the task');
          
          ui.divider('Agent Setup Summary');
          ui.success(`✅ Complete Task Master environment configured`);
          ui.success(`✅ AI models and settings inherited from base project`);
          ui.success(`✅ PRD automatically parsed in agent context`);
          ui.success(`✅ Task-specific briefing created`);
          if (issueUrl) {
            ui.success(`✅ GitHub issue created: ${issueUrl}`);
          }
          
          ui.info(`Task briefing: ${briefingFile}`);
          ui.info(`Agent has full Task Master access for Task ${task.id}`);

        } else {
          spinner.fail(`Failed to create agent: ${result.message}`);
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Error creating agent: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Command failed')) {
        ui.error(`Task ${taskId} not found or Task Master error. Check that the task exists with "task-master list"`);
      } else {
        ui.error(`Failed to get task information: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    }
  });

// Task Master integration command
program
  .command('task-agents')
  .description('Create agents for Task Master tasks')
  .option('-p, --prefix <prefix>', 'Branch prefix for task branches', 'task')
  .option('-n, --dry-run', 'Show what would be created without creating')
  .action(async (options: { prefix?: string; dryRun?: boolean }) => {
    const { execSync } = await import('child_process');
    const prefix = options.prefix || 'task';
    
    try {
      // Check if task-master is available
      execSync('which task-master', { stdio: 'ignore' });
    } catch (error) {
      ui.error('Task Master not found. Install with: npm install -g task-master-ai');
      process.exit(1);
    }

    try {
      // Get task list from Task Master
      let tasks;
      try {
        // Try with --json flag first (newer versions)
        const tasksJson = execSync('task-master list --json', { encoding: 'utf8' });
        tasks = JSON.parse(tasksJson);
      } catch (jsonError) {
        // Fallback to regular list output
        const listOutput = execSync('task-master list', { encoding: 'utf8' });
        tasks = parseTaskListOutput(listOutput);
      }
      
      if (!tasks || tasks.length === 0) {
        ui.warning('No tasks found. Run "task-master init" and "task-master parse-prd" first.');
        return;
      }

      // Filter for main tasks (not subtasks) that are pending
      const mainTasks = tasks.filter((task: any) => 
        !task.id.includes('.') && 
        task.status === 'pending' && 
        task.title
      );

      if (mainTasks.length === 0) {
        ui.warning('No pending main tasks found to create agents for.');
        return;
      }

      ui.header('Task Master Integration');
      ui.info(`Found ${mainTasks.length} main tasks to create agents for:`);
      
      const agentPlans = mainTasks.map((task: any) => {
        const branchName = `${prefix}/${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        const agentId = `task-${task.id}-agent`;
        return { task, branchName, agentId };
      });

      // Show what will be created
      agentPlans.forEach(({ task, branchName, agentId }: any) => {
        ui.keyValue(`Task ${task.id}`, `${task.title} → ${branchName} (${agentId})`);
      });

      if (options.dryRun) {
        ui.info('Dry run complete. Use without --dry-run to create agents.');
        return;
      }

      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Create ${agentPlans.length} agents for these tasks?`,
          default: true
        }
      ]);

      if (!confirm.proceed) {
        ui.info('Agent creation cancelled.');
        return;
      }

      // Create agents for each task
      for (const { task, branchName, agentId } of agentPlans) {
        const spinner = ui.spinner(`Creating agent for Task ${task.id}: ${task.title}`);
        spinner.start();

        try {
          const currentPath = process.cwd();
          const projectId = path.basename(currentPath);
          const result = await agentManager.createAgent({
            branch: branchName,
            agentId,
            autoAccept: true,
            projectId
          });

          if (result.success && result.data) {
            // Set up complete Task Master environment for each agent
            await setupTaskMasterEnvironment(result.data.worktreePath, task.id);
            spinner.succeed(`Agent ${agentId} created for Task ${task.id} with full TM environment`);
          } else {
            spinner.fail(`Failed to create agent for Task ${task.id}: ${result.message}`);
          }
        } catch (error) {
          spinner.fail(`Error creating agent for Task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      ui.divider('Next Steps');
      ui.info('To start working on tasks:');
      agentPlans.forEach(({ agentId, task }: any) => {
        ui.command(`magents attach ${agentId}`, `Work on Task ${task.id}: ${task.title}`);
      });

    } catch (error) {
      ui.error(`Failed to integrate with Task Master: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Work on GitHub issue with structured workflow
program
  .command('work-issue')
  .description('Start structured development workflow for a GitHub issue or Task Master task')
  .argument('<issue-or-task-id>', 'GitHub issue number or Task Master task ID')
  .option('--agent <agent-id>', 'Specific agent to use (auto-detects if not provided)')
  .option('--skip-plan', 'Skip planning phase and go directly to implementation')
  .option('--plan-only', 'Only run the planning phase')
  .action(async (issueOrTaskId: string, options: { agent?: string; skipPlan?: boolean; planOnly?: boolean }) => {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      ui.header('Structured Development Workflow');
      
      // Determine if this is a GitHub issue or Task Master task
      const isGitHubIssue = /^\d+$/.test(issueOrTaskId);
      let taskId = '';
      let issueNumber = '';
      
      if (isGitHubIssue) {
        issueNumber = issueOrTaskId;
        ui.info(`Working on GitHub Issue #${issueNumber}`);
      } else {
        taskId = issueOrTaskId;
        ui.info(`Working on Task Master Task ${taskId}`);
      }
      
      // Find appropriate agent
      let agentId = options.agent;
      if (!agentId) {
        const agents = agentManager.getActiveAgents();
        
        if (taskId) {
          // Look for agent with this task ID
          const taskAgent = agents.find(a => a.id.includes(`task-${taskId}`));
          if (taskAgent) {
            agentId = taskAgent.id;
            ui.success(`Found dedicated agent: ${agentId}`);
          }
        }
        
        if (!agentId && agents.length === 1) {
          agentId = agents[0].id;
          ui.info(`Using available agent: ${agentId}`);
        } else if (!agentId && agents.length > 1) {
          ui.warning('Multiple agents available. Please specify --agent <agent-id>');
          ui.info('Available agents:');
          agents.forEach(agent => ui.keyValue(agent.id, agent.branch));
          process.exit(1);
        } else if (!agentId) {
          ui.error('No active agents found. Create an agent first:');
          if (taskId) {
            ui.command(`magents task-create ${taskId}`, 'Create agent for this task');
          } else {
            ui.command('magents create feature/issue-' + issueNumber, 'Create agent for this issue');
          }
          process.exit(1);
        }
      }
      
      const agent = agentManager.getActiveAgents().find(a => a.id === agentId);
      if (!agent) {
        ui.error(`Agent '${agentId}' not found`);
        process.exit(1);
      }
      
      // ========== PLAN PHASE ==========
      if (!options.skipPlan) {
        ui.divider('PLAN PHASE');
        
        let issueDetails = '';
        let issueTitle = '';
        
        if (isGitHubIssue) {
          try {
            ui.info('Fetching GitHub issue details...');
            const issueJson = execSync(`gh issue view ${issueNumber} --json title,body,labels,assignees`, { encoding: 'utf8' });
            const issue = JSON.parse(issueJson);
            issueTitle = issue.title;
            issueDetails = issue.body;
            ui.success(`Retrieved issue: ${issueTitle}`);
          } catch (error) {
            ui.error(`Failed to fetch GitHub issue #${issueNumber}`);
            process.exit(1);
          }
        } else {
          try {
            ui.info('Fetching Task Master task details...');
            const taskOutput = execSync(`task-master show ${taskId}`, { encoding: 'utf8', cwd: agent.worktreePath });
            issueDetails = taskOutput;
            issueTitle = `Task ${taskId}`;
            ui.success(`Retrieved task details for ${taskId}`);
          } catch (error) {
            ui.error(`Failed to fetch Task Master task ${taskId}`);
            process.exit(1);
          }
        }
        
        // Search for relevant context
        ui.info('Searching for relevant context...');
        
        const scratchpadDir = path.join(agent.worktreePath, 'scratchpad');
        let scratchpadFiles: string[] = [];
        if (fs.existsSync(scratchpadDir)) {
          scratchpadFiles = fs.readdirSync(scratchpadDir).filter(f => f.endsWith('.md'));
          ui.muted(`  Found ${scratchpadFiles.length} scratchpad files`);
        }
        
        // Search for related PRs
        let relatedPRs: string[] = [];
        try {
          const prSearch = execSync(`gh pr list --state all --limit 10 --json title,number,url`, { encoding: 'utf8' });
          const prs = JSON.parse(prSearch);
          relatedPRs = prs.map((pr: any) => `#${pr.number}: ${pr.title} (${pr.url})`);
          ui.muted(`  Found ${relatedPRs.length} recent PRs for context`);
        } catch (error) {
          ui.muted('  No PR history available');
        }
        
        // Create planning scratchpad
        const planFileName = isGitHubIssue 
          ? `scratchpad-issue-${issueNumber}-${issueTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`
          : `scratchpad-task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
        
        const planFilePath = path.join(agent.worktreePath, planFileName);
        
        const planContent = `# Implementation Plan: ${issueTitle}

${isGitHubIssue ? `**GitHub Issue:** #${issueNumber}` : `**Task Master Task:** ${taskId}`}
**Agent:** ${agentId}
**Created:** ${new Date().toLocaleString()}

## Issue/Task Details

${issueDetails}

## Research Findings

### Related Scratchpads
${scratchpadFiles.length > 0 
  ? scratchpadFiles.map(f => `- ${f}`).join('\\n')
  : '- No previous scratchpads found'}

### Related PRs
${relatedPRs.length > 0 
  ? relatedPRs.slice(0, 5).map(pr => `- ${pr}`).join('\\n')
  : '- No recent PRs found'}

### Codebase Analysis
*TODO: Search codebase for relevant files and patterns*

## Implementation Breakdown

### Phase 1: Research & Setup
- [ ] Analyze requirements in detail
- [ ] Identify affected files and components
- [ ] Review existing patterns and conventions
- [ ] Set up development environment

### Phase 2: Core Implementation
- [ ] Task 1: [Specific implementation step]
- [ ] Task 2: [Specific implementation step]
- [ ] Task 3: [Specific implementation step]

### Phase 3: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing
- [ ] Playwright e2e tests (if applicable)

### Phase 4: Documentation & Review
- [ ] Update documentation
- [ ] Code review
- [ ] Address feedback
- [ ] Final testing

## Commit Strategy

Each subtask will result in a focused commit with:
- Clear commit message describing the change
- Task Master progress update
- Incremental, testable functionality

## Testing Strategy

- **Unit Tests:** [Describe unit testing approach]
- **Integration Tests:** [Describe integration testing approach]  
- **E2E Tests:** [Playwright scenarios if needed]
- **Manual Testing:** [Key scenarios to verify manually]

## Implementation Notes

*Document key decisions, challenges, and solutions as development progresses*

## Task Master Updates

- Start: \`tm set-status --id=${taskId || 'N/A'} --status=in_progress\`
- Progress: \`tm update-subtask --id=${taskId || 'N/A'} --prompt="[progress notes]"\`
- Complete: \`tm set-status --id=${taskId || 'N/A'} --status=done\`

---
*Planning document created by Magents work-issue workflow*
`;
        
        fs.writeFileSync(planFilePath, planContent);
        ui.success(`Created planning document: ${planFileName}`);
        
        if (options.planOnly) {
          ui.info('Planning phase complete. Edit the plan file and run without --plan-only to continue.');
          ui.command(`magents attach ${agentId}`, 'Attach to agent to edit plan');
          return;
        }
      }
      
      // ========== CREATE PHASE ==========
      ui.divider('CREATE PHASE');
      ui.info('Ready to start implementation phase');
      ui.command(`magents attach ${agentId}`, 'Attach to agent to begin implementation');
      
      ui.box(
        `Implementation Guidelines:
        
1. Follow your planning document
2. Make small, focused commits after each step
3. Update Task Master progress regularly:
   ${taskId ? `tm update-subtask --id=${taskId} --prompt="[your progress]"` : 'Document progress in issue comments'}
4. Test incrementally as you build
5. Follow the established coding patterns

Next Steps:
- Attach to the agent
- Review the planning document  
- Start implementing step by step
- Use 'magents work-issue ${issueOrTaskId} --skip-plan' to continue workflow`,
        'Implementation Ready',
        'success'
      );
      
    } catch (error) {
      ui.error(`Failed to start work-issue workflow: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Sync Task Master config to existing agent
program
  .command('sync-taskmaster')
  .description('Sync Task Master configuration to an existing agent')
  .argument('<agent-id>', 'Agent ID to sync Task Master config to')
  .action(async (agentId: string) => {
    try {
      // Get agent info
      const agents = agentManager.getActiveAgents();
      const agent = agents.find(a => a.id === agentId);
      
      if (!agent) {
        ui.error(`Agent '${agentId}' not found. Run "magents list" to see active agents.`);
        process.exit(1);
      }

      const spinner = ui.spinner(`Syncing Task Master configuration to ${agentId}...`);
      spinner.start();

      try {
        await setupTaskMasterEnvironment(agent.worktreePath);
        spinner.succeed('Complete Task Master environment synced successfully');
        
        ui.success(`✅ Task Master environment set up in ${agentId}`);
        ui.success(`✅ AI models and settings inherited`);
        ui.success(`✅ PRD parsed and available`);
        ui.command(`magents attach ${agentId}`, 'Attach to test Task Master commands');
        
      } catch (error) {
        spinner.fail(`Failed to sync configuration: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      
    } catch (error) {
      ui.error(`Failed to sync Task Master config: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Troubleshooting command
program
  .command('doctor')
  .description('Check system requirements and troubleshoot issues')
  .action(async () => {
    const { execSync } = await import('child_process');
    
    ui.header('Magents System Check');
    
    // Load config first
    const currentConfig = configManager.loadConfig();
    
    // Check Task Master installation
    try {
      execSync('which task-master', { stdio: 'ignore' });
      const version = execSync('task-master --version 2>/dev/null || echo "unknown"', { encoding: 'utf8' }).trim();
      ui.success(`Task Master AI: Installed (${version})`);
      
      // Test JSON support
      try {
        execSync('task-master list --json 2>/dev/null', { stdio: 'ignore' });
        ui.success('JSON support: Available (newer version)');
      } catch {
        ui.warning('JSON support: Not available (older version - text parsing will be used)');
      }
      
    } catch {
      ui.error('Task Master AI: Not installed');
      ui.info('Install with: npm install -g task-master-ai');
    }
    
    // Check Git
    try {
      execSync('git --version', { stdio: 'ignore' });
      ui.success('Git: Installed');
    } catch {
      ui.error('Git: Not installed');
    }
    
    
    // Check Claude Code
    try {
      execSync('which claude', { stdio: 'ignore' });
      ui.success('Claude Code: Installed');
    } catch {
      ui.warning('Claude Code: Not found in PATH');
    }
    
    // Check Docker
    try {
      execSync('docker --version', { stdio: 'ignore' });
      ui.success('Docker: Installed');
      
      // Check if Docker daemon is running
      try {
        execSync('docker ps', { stdio: 'ignore' });
        ui.success('Docker daemon: Running');
      } catch {
        ui.warning('Docker daemon: Not running (start with: docker desktop or systemctl start docker)');
      }
      
      // Check if our Docker image exists
      if (currentConfig.DOCKER_ENABLED) {
        try {
          execSync(`docker image inspect ${currentConfig.DOCKER_IMAGE}`, { stdio: 'ignore' });
          ui.success(`Docker image: ${currentConfig.DOCKER_IMAGE} exists`);
        } catch {
          ui.warning(`Docker image: ${currentConfig.DOCKER_IMAGE} not found (build with: cd packages/cli/docker && ./build.sh)`);
        }
      }
    } catch {
      ui.warning('Docker: Not installed (required for Docker mode)');
    }
    
    ui.divider('Configuration');
    ui.keyValue('Config file', configManager.getConfigPath());
    ui.keyValue('Agents directory', configManager.getAgentsDir());
    ui.keyValue('Max agents', currentConfig.MAX_AGENTS.toString());
    ui.keyValue('Docker mode', currentConfig.DOCKER_ENABLED ? 'Enabled' : 'Disabled');
    if (currentConfig.DOCKER_ENABLED) {
      ui.keyValue('Docker image', currentConfig.DOCKER_IMAGE);
    }
    
    // Check for Task Master configuration in current project
    const fs = require('fs');
    const path = require('path');
    const currentDir = process.cwd();
    const taskMasterDir = path.join(currentDir, '.taskmaster');
    
    if (fs.existsSync(taskMasterDir)) {
      ui.success('Task Master project: Initialized in current directory');
      const tasksFile = path.join(taskMasterDir, 'tasks.json');
      const configFile = path.join(taskMasterDir, 'config.json');
      
      if (fs.existsSync(tasksFile)) {
        ui.success('Tasks file: Found');
      } else {
        ui.warning('Tasks file: Not found - run "task-master parse-prd"');
      }
      
      if (fs.existsSync(configFile)) {
        ui.success('Task Master config: Found');
      } else {
        ui.warning('Task Master config: Not found - run "task-master models --setup"');
      }
    } else {
      ui.warning('Task Master project: Not initialized in current directory');
      ui.info('Run "task-master init" to set up Task Master in this project');
    }
    
    ui.divider('Common Issues');
    ui.info('If "task-create" fails with "unknown option --json":');
    ui.command('npm update -g task-master-ai', 'Update to latest version');
    ui.info('Or use text parsing mode (automatic fallback)');
    
    ui.info('If tasks not found:');
    ui.command('task-master list', 'Check available tasks');
    ui.command('task-master init && task-master parse-prd', 'Initialize if needed');
  });

// Dashboard command - web interface
program
  .command('dashboard')
  .alias('dash')
  .description('Open web dashboard to monitor all agents')
  .option('-p, --port <port>', 'Port for web dashboard', '3000')
  .action(async (options: { port?: string }) => {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const agents = agentManager.getActiveAgents();
    
    if (agents.length === 0) {
      ui.warning('No agents found. Create some agents first!');
      return;
    }
    
    ui.header('Magents Web Dashboard');
    ui.info(`Starting web dashboard on port ${options.port || '3000'}...\n`);
    
    try {
      // Start the backend server
      ui.info('Starting backend server...');
      const backendProcess = spawn('npm', ['run', 'backend:dev'], {
        cwd: path.join(__dirname, '../../..'),
        detached: false,
        stdio: 'pipe'
      });
      
      // Start the web UI
      ui.info('Starting web interface...');
      const webProcess = spawn('npm', ['run', 'web:dev'], {
        cwd: path.join(__dirname, '../../..'),
        detached: false,
        stdio: 'pipe'
      });
      
      // Wait a moment for servers to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      ui.success('Dashboard started successfully!');
      ui.divider('Access Information');
      ui.keyValue('Web Interface', `http://localhost:${options.port || '4000'}`);
      ui.keyValue('API Endpoint', 'http://localhost:3001/api');
      ui.divider('Active Agents');
      agents.forEach((agent, index) => {
        ui.keyValue(`${index + 1}. ${agent.id}`, `${agent.status} - ${agent.branch}`);
      });
      ui.divider('Controls');
      ui.info('Press Ctrl+C to stop the dashboard\n');
      
      // Open browser
      const { execSync } = await import('child_process');
      const platform = process.platform;
      const openCmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
      try {
        execSync(`${openCmd} http://localhost:${options.port || '4000'}`);
      } catch {
        // Browser opening failed, that's okay
      }
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        ui.info('\nShutting down dashboard...');
        backendProcess.kill();
        webProcess.kill();
        process.exit(0);
      });
      
      // Keep the process running
      await new Promise(() => {});
      
    } catch (error) {
      ui.error(`Failed to start dashboard: ${error instanceof Error ? error.message : String(error)}`);
      ui.info('\nTip: Make sure you have run "npm install" in the project root.');
    }
  });
// Monitor command - preview Docker container logs
program
  .command('monitor')
  .alias('preview')
  .description('Show live preview of all agent container logs')
  .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '2')
  .option('-l, --lines <number>', 'Number of lines to show per session', '10')
  .action(async (options: { refresh?: string; lines?: string }) => {
    const { execSync } = await import('child_process');
    const refreshInterval = parseInt(options.refresh || '2') * 1000;
    const linesToShow = parseInt(options.lines || '10');
    
    ui.header('Claude Agent Monitor', true);
    ui.info('Press Ctrl+C to exit monitor mode\n');
    
    // Function to get Docker container logs
    const getContainerLogs = (containerName: string): string[] => {
      try {
        // Get the last N lines of container logs
        const output = execSync(
          `docker logs --tail ${linesToShow} ${containerName}`, 
          { encoding: 'utf8', stdio: 'pipe' }
        );
        return output.split('\n').filter(line => line.trim());
      } catch {
        return ['[Container not accessible]'];
      }
    };
    
    // Function to display all agents
    const displayAgents = () => {
      // Clear screen
      console.clear();
      ui.header('Claude Agent Monitor - Live Preview', true);
      ui.muted(`Refreshing every ${options.refresh}s • Showing last ${linesToShow} lines • Press Ctrl+C to exit\n`);
      
      const agents = agentManager.getActiveAgents();
      
      if (agents.length === 0) {
        ui.warning('No active agents found');
        return;
      }
      
      agents.forEach(agent => {
        const containerName = `magents-${agent.id}`;
        const isRunning = agent.status === 'RUNNING';
        
        ui.divider(`Agent: ${agent.id} (${agent.status})`);
        ui.keyValue('Branch', agent.branch);
        ui.keyValue('Container', containerName);
        
        if (isRunning) {
          // Get container logs
          const containerLogs = getContainerLogs(containerName);
          
          ui.muted('\nContainer Output:');
          ui.box(
            containerLogs.join('\n') || '[No output yet]',
            undefined,
            containerLogs.some(line => line.includes('error') || line.includes('Error')) ? 'error' : 'info'
          );
          
          // Check container health
          try {
            const healthStatus = execSync(
              `docker inspect ${containerName} --format='{{.State.Health.Status}}'`,
              { encoding: 'utf8', stdio: 'pipe' }
            ).trim();
            if (healthStatus && healthStatus !== 'none') {
              ui.keyValue('Health', healthStatus);
            }
          } catch {
            // Container might not have health check
          }
        } else {
          ui.warning('Container not running or not accessible');
        }
        
        console.log(''); // Add spacing between agents
      });
      
      ui.divider();
      ui.muted(`Last updated: ${new Date().toLocaleTimeString()}`);
    };
    
    // Initial display
    displayAgents();
    
    // Set up refresh interval
    const interval = setInterval(displayAgents, refreshInterval);
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.clear();
      ui.success('\nMonitor stopped');
      process.exit(0);
    });
  });

// Config command
program
  .command('config')
  .description('View or edit configuration')
  .option('-e, --edit', 'Edit configuration interactively')
  .option('--docker-image <image>', 'Set default Docker image for agents')
  .action(async (options: { edit?: boolean; dockerImage?: string }) => {
    const config = configManager.loadConfig();
    
    // Handle docker image update
    if (options.dockerImage) {
      configManager.updateConfig({ DOCKER_IMAGE: options.dockerImage });
      ui.success(`Default Docker image set to: ${options.dockerImage}`);
      return;
    }
    
    if (options.edit) {
      ui.header('Edit Configuration');
      
      ui.divider('Current Configuration');
      Object.entries(config).forEach(([key, value]) => {
        ui.keyValue(key, String(value));
      });
      ui.divider();
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'DEFAULT_BASE_BRANCH',
          message: 'Default base branch:',
          default: config.DEFAULT_BASE_BRANCH
        },
        {
          type: 'input',
          name: 'CLAUDE_CODE_PATH',
          message: 'Claude Code command:',
          default: config.CLAUDE_CODE_PATH
        },
        {
          type: 'confirm',
          name: 'CLAUDE_AUTO_ACCEPT',
          message: 'Auto-accept Claude Code commands:',
          default: config.CLAUDE_AUTO_ACCEPT
        },
        {
          type: 'number',
          name: 'MAX_AGENTS',
          message: 'Maximum number of agents:',
          default: config.MAX_AGENTS
        },
        {
          type: 'confirm',
          name: 'DOCKER_ENABLED',
          message: 'Use Docker for agents:',
          default: config.DOCKER_ENABLED
        },
        {
          type: 'input',
          name: 'DOCKER_IMAGE',
          message: 'Docker image for agents:',
          default: config.DOCKER_IMAGE,
          when: (answers) => answers.DOCKER_ENABLED
        }
      ]);
      
      configManager.updateConfig(answers);
      ui.success('Configuration updated successfully!');
    } else {
      ui.header('Current Configuration');
      
      const configDetails = Object.entries(config)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      ui.box(
        configDetails + `\n\nConfig file: ${configManager.getConfigPath()}`,
        'Configuration',
        'info'
      );
    }
  });

// Start command - launch agents in Docker containers
program
  .command('start')
  .description('Start agents in Docker containers with orchestration')
  .argument('[agent-id]', 'Specific agent to start')
  .option('-a, --all', 'Start all stopped agents')
  .option('-d, --docker', 'Force Docker mode even if not configured')
  .option('--cpu <limit>', 'CPU limit (e.g., "1.5", "2")')
  .option('--memory <limit>', 'Memory limit (e.g., "2g", "512m")')
  .option('--network <name>', 'Docker network to use')
  .option('--volume <mapping>', 'Additional volume mappings', (value, previous: string[] = []) => previous.concat(value), [])
  .option('--env <var>', 'Environment variables', (value, previous: string[] = []) => previous.concat(value), [])
  .option('--health-check', 'Enable health monitoring')
  .option('--restart <policy>', 'Restart policy (no, on-failure, unless-stopped, always)')
  .option('--detach', 'Run in detached mode')
  .option('--logs', 'Show container logs after starting')
  .option('--shell', 'Open shell in container after starting')
  .option('--dry-run', 'Preview what would be started without actually starting')
  .action(async (agentId: string | undefined, options: any) => {
    const { startCommand } = await import('../commands/start');
    await startCommand.execute(agentId, {
      agent: agentId,
      all: options.all,
      docker: options.docker,
      resources: {
        cpu: options.cpu,
        memory: options.memory
      },
      network: options.network,
      volumes: options.volume,
      env: options.env,
      healthCheck: options.healthCheck,
      restart: options.restart,
      detach: options.detach,
      logs: options.logs,
      shell: options.shell,
      dryRun: options.dryRun
    });
  });

// Add auto-configuration command
program.addCommand(createAutoConfigCommand());

// Add migrate command
program.addCommand(createMigrateCommand());

// Add database command
program.addCommand(createDatabaseCommand());

// Override help to show our custom styling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
}

program.parse();