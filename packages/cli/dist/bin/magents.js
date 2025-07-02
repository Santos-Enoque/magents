#!/usr/bin/env node
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
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const AgentManager_1 = require("../services/AgentManager");
const DockerAgentManager_1 = require("../services/DockerAgentManager");
const ConfigManager_1 = require("../config/ConfigManager");
const UIService_1 = require("../ui/UIService");
const program = new commander_1.Command();
const configManager = ConfigManager_1.ConfigManager.getInstance();
const config = configManager.loadConfig();
// Use DockerAgentManager if Docker mode is enabled
const agentManager = config.DOCKER_ENABLED
    ? new DockerAgentManager_1.DockerAgentManager()
    : new AgentManager_1.AgentManager();
// Helper function to parse Task Master output when --json is not supported
function parseTaskMasterOutput(taskId, output) {
    const lines = output.split('\n').map(line => line.trim()).filter(line => line);
    const task = {
        id: taskId,
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        subtasks: []
    };
    let currentSection = '';
    let descriptionLines = [];
    for (const line of lines) {
        // Extract title from first meaningful line or task header
        if (line.includes(`Task ${taskId}:`) || line.includes(`# Task ${taskId}`)) {
            task.title = line.replace(`Task ${taskId}:`, '').replace(`# Task ${taskId}`, '').replace(/^[:#\s-]+/, '').trim();
        }
        else if (!task.title && line.includes(taskId) && line.includes(':')) {
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
        }
        else if (currentSection === 'description' &&
            !line.toLowerCase().includes('status:') &&
            !line.toLowerCase().includes('priority:') &&
            !line.toLowerCase().includes('dependencies:') &&
            !line.startsWith('#') &&
            line.length > 0) {
            descriptionLines.push(line);
        }
        else if (line.toLowerCase().includes('status:') ||
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
function parseTaskListOutput(output) {
    const lines = output.split('\n').map(line => line.trim()).filter(line => line);
    const tasks = [];
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
async function setupTaskMasterEnvironment(worktreePath, taskId) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
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
            if (parentDir === searchDir)
                break; // Reached root
            searchDir = parentDir;
        }
        if (!taskMasterDir) {
            UIService_1.ui.warning('Task Master configuration not found in current project hierarchy');
            return;
        }
        // Set up .taskmaster directory in worktree
        const worktreeTaskMasterDir = path.join(worktreePath, '.taskmaster');
        // Create destination directory
        if (!fs.existsSync(worktreeTaskMasterDir)) {
            fs.mkdirSync(worktreeTaskMasterDir, { recursive: true });
        }
        UIService_1.ui.info('Setting up complete Task Master environment...');
        // 1. Copy base configuration and inherit all settings
        const filesToCopy = ['config.json'];
        for (const fileName of filesToCopy) {
            const sourcePath = path.join(taskMasterDir, fileName);
            const destPath = path.join(worktreeTaskMasterDir, fileName);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                UIService_1.ui.muted(`  ✓ Inherited ${fileName} with AI models and settings`);
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
                    UIService_1.ui.muted(`  ✓ Linked ${dirName} directory`);
                }
                catch (symlinkError) {
                    try {
                        copyDirectoryRecursive(sourcePath, destPath);
                        UIService_1.ui.muted(`  ✓ Copied ${dirName} directory`);
                    }
                    catch (copyError) {
                        UIService_1.ui.muted(`  ⚠ Could not link/copy ${dirName}`);
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
            UIService_1.ui.muted('  ✓ Initialized Task Master in agent worktree');
            // Check for PRD files in the main project and parse them
            const mainPRDPath = path.join(taskMasterDir, 'docs', 'prd.txt');
            const altPRDPath = path.join(projectRoot, 'prd.txt');
            const altPRDPath2 = path.join(projectRoot, 'docs', 'prd.txt');
            let prdPath = '';
            if (fs.existsSync(mainPRDPath)) {
                prdPath = mainPRDPath;
            }
            else if (fs.existsSync(altPRDPath)) {
                prdPath = altPRDPath;
            }
            else if (fs.existsSync(altPRDPath2)) {
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
                    UIService_1.ui.muted('  ✓ Copied PRD to agent worktree');
                }
                // Parse PRD in agent context if tasks don't exist
                const agentTasksPath = path.join(worktreeTaskMasterDir, 'tasks.json');
                if (!fs.existsSync(agentTasksPath)) {
                    try {
                        execSync(`task-master parse-prd "${agentPRDPath}" --research --quiet || task-master parse-prd "${agentPRDPath}" --quiet || true`, { stdio: 'pipe' });
                        UIService_1.ui.muted('  ✓ Parsed PRD and generated tasks in agent context');
                    }
                    catch (parseError) {
                        UIService_1.ui.muted('  ⚠ Could not parse PRD automatically');
                    }
                }
                else {
                    // Copy existing tasks from main project
                    const mainTasksPath = path.join(taskMasterDir, 'tasks.json');
                    if (fs.existsSync(mainTasksPath)) {
                        fs.copyFileSync(mainTasksPath, agentTasksPath);
                        UIService_1.ui.muted('  ✓ Inherited existing tasks from main project');
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
                UIService_1.ui.muted(`  ✓ Created task-specific environment for Task ${taskId}`);
            }
        }
        finally {
            process.chdir(originalCwd);
        }
        // Create a reference file to the original project
        const projectRefFile = path.join(worktreeTaskMasterDir, 'project-root.txt');
        fs.writeFileSync(projectRefFile, projectRoot);
        UIService_1.ui.success('Complete Task Master environment set up in agent worktree');
    }
    catch (error) {
        UIService_1.ui.warning(`Could not set up complete Task Master environment: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Helper function to detect project type for smart branch naming
async function detectProjectType() {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
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
        const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8', cwd: currentDir }).trim();
        if (currentBranch.startsWith('hotfix/') || currentBranch.includes('hotfix'))
            return 'hotfix';
        if (currentBranch.startsWith('fix/') || currentBranch.includes('fix'))
            return 'bug';
        if (currentBranch.startsWith('task/') || currentBranch.includes('task'))
            return 'task';
        if (currentBranch.startsWith('experiment/') || currentBranch.includes('experiment'))
            return 'experiment';
    }
    catch (error) {
        // Git not available or not in a repo, continue with file-based detection
    }
    // Check for Task Master task context
    const taskMasterContext = path.join(currentDir, '.taskmaster', 'current-task.json');
    if (fs.existsSync(taskMasterContext)) {
        try {
            const taskData = JSON.parse(fs.readFileSync(taskMasterContext, 'utf8'));
            if (taskData.id)
                return 'task';
        }
        catch (error) {
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
function copyDirectoryRecursive(source, destination) {
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
        }
        else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}
// Helper function to create GitHub issue for the task
async function createGitHubIssueForTask(task, branchName, agentId, worktreePath) {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
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
            UIService_1.ui.muted('  ⚠ Not a GitHub repository, skipping issue creation');
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
            ? task.subtasks.map((subtask) => {
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
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const os = await Promise.resolve().then(() => __importStar(require('os')));
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
            }
            catch {
                // Label doesn't exist, create it
                try {
                    const labelColors = {
                        'task-master': '0366d6', // Blue
                        'high-priority': 'd73a4a', // Red
                        'medium-priority': 'fbca04', // Yellow
                        'low-priority': '0e8a16' // Green
                    };
                    const color = labelColors[label] || '0366d6';
                    execSync(`gh label create "${label}" --color "${color}"`, {
                        stdio: 'ignore',
                        cwd: worktreePath || process.cwd()
                    });
                    UIService_1.ui.muted(`  ✓ Created label: ${label}`);
                }
                catch (error) {
                    UIService_1.ui.muted(`  ⚠ Could not create label ${label}: ${error instanceof Error ? error.message : String(error)}`);
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
        UIService_1.ui.muted(`  ✓ Created GitHub issue: ${issueUrl}`);
        return issueUrl;
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('gh not found')) {
            UIService_1.ui.muted('  ⚠ GitHub CLI not installed, skipping issue creation');
        }
        else {
            UIService_1.ui.muted(`  ⚠ Could not create GitHub issue: ${error instanceof Error ? error.message : String(error)}`);
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
    UIService_1.ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
    UIService_1.ui.divider('Instant Agent Creation Examples');
    UIService_1.ui.command('magents create auth-system', 'Create agent with smart defaults');
    UIService_1.ui.command('magents create user-dashboard --mode standard', 'Create with Task Master integration');
    UIService_1.ui.command('magents create fix-login-bug --mode advanced', 'Create with full setup');
    UIService_1.ui.command('magents create payment-flow --task 24.1', 'Create for specific task');
    UIService_1.ui.command('magents create api-refactor --dry-run', 'Preview what would be created');
    UIService_1.ui.divider('Management Examples');
    UIService_1.ui.command('magents ls', 'Show all active agents');
    UIService_1.ui.command('magents a 1', 'Connect to first agent');
    UIService_1.ui.command('magents attach agent-123', 'Connect to specific agent');
    UIService_1.ui.command('magents cleanup --remove-worktrees', 'Clean up everything');
    UIService_1.ui.divider();
    UIService_1.ui.info('For more help on a specific command, use: magents help <command>');
});
if (process.argv.length === 2) {
    UIService_1.ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
    UIService_1.ui.divider('Core Commands');
    UIService_1.ui.command('magents create <name>', 'Create agent with smart defaults');
    UIService_1.ui.command('magents create <name> --mode <simple|standard|advanced>', 'Progressive complexity modes');
    UIService_1.ui.command('magents create <name> --task <id>', 'Create for Task Master task');
    UIService_1.ui.command('magents list (ls)', 'List all agents');
    UIService_1.ui.command('magents attach (a) <id>', 'Attach to agent');
    UIService_1.ui.command('magents stop <id>', 'Stop agent');
    UIService_1.ui.divider('Advanced Commands');
    UIService_1.ui.command('magents task-create <task-id>', 'Create intelligent agent for specific task');
    UIService_1.ui.command('magents task-agents', 'Create agents from all pending tasks');
    UIService_1.ui.command('magents work-issue <id>', 'Structured development workflow (PLAN→CREATE→TEST→DEPLOY)');
    UIService_1.ui.command('magents sync-taskmaster <id>', 'Sync Task Master config to agent');
    UIService_1.ui.command('magents doctor', 'Check system requirements');
    UIService_1.ui.command('magents config --docker', 'Enable Docker mode');
    UIService_1.ui.divider();
    UIService_1.ui.info(`Mode: ${config.DOCKER_ENABLED ? 'Docker containers' : 'tmux/git worktrees'}`);
    UIService_1.ui.info('Run "magents --help" for detailed examples');
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
    .option('--docker', 'Force Docker mode for this agent')
    .option('--no-docker', 'Force tmux mode for this agent')
    .option('--interactive', 'Use interactive mode for missing parameters')
    .action(async (name, agentId, options) => {
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
            const prefix = branchPrefixes[projectType] || 'feature';
            branchName = `${prefix}/${sanitizedName}`;
        }
        // 2. Smart agent ID generation
        if (!agentId) {
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
            agentId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${timestamp}`;
        }
        // 3. Progressive complexity modes
        const { modeManager } = await Promise.resolve().then(() => __importStar(require('../commands/mode')));
        const currentModeConfig = modeManager.getCurrentMode();
        const mode = options?.mode || currentModeConfig.mode || 'simple';
        // Show mode-specific help if different from current
        if (mode !== currentModeConfig.mode) {
            UIService_1.ui.info(`Creating agent in ${mode} mode (current default: ${currentModeConfig.mode})`);
            UIService_1.ui.tip(`Set ${mode} as default with: magents mode switch ${mode}`);
        }
        let creationConfig = {
            autoAccept: options?.autoAccept !== false, // Default to true for instant creation
            useDocker: options?.docker !== undefined ? options.docker : config.DOCKER_ENABLED
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
                const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                const taskOutput = execSync(`task-master show ${options.task}`, { encoding: 'utf8' });
                const task = parseTaskMasterOutput(options.task, taskOutput);
                if (task) {
                    UIService_1.ui.success(`Found Task Master task: ${task.title}`);
                    creationConfig.taskId = options.task;
                    creationConfig.setupTaskMaster = true;
                    // Update branch name to include task ID
                    if (!options?.branch) {
                        branchName = `task/${options.task}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
                    }
                }
            }
            catch (error) {
                UIService_1.ui.warning(`Task ${options.task} not found, proceeding without Task Master integration`);
            }
        }
        // 5. Interactive mode for missing parameters
        if (options?.interactive) {
            const answers = await inquirer_1.default.prompt([
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
            UIService_1.ui.header('Dry Run - Agent Creation Preview');
            UIService_1.ui.keyValue('Agent Name', name);
            UIService_1.ui.keyValue('Agent ID', agentId);
            UIService_1.ui.keyValue('Branch Name', branchName);
            UIService_1.ui.keyValue('Mode', mode);
            UIService_1.ui.keyValue('Docker Enabled', creationConfig.useDocker ? 'Yes' : 'No');
            UIService_1.ui.keyValue('Task Master Setup', creationConfig.setupTaskMaster ? 'Yes' : 'No');
            UIService_1.ui.keyValue('Create GitHub Issue', creationConfig.createIssue ? 'Yes' : 'No');
            UIService_1.ui.keyValue('Push Branch', creationConfig.pushBranch ? 'Yes' : 'No');
            if (options?.task) {
                UIService_1.ui.keyValue('Task Master Task', options.task);
            }
            UIService_1.ui.info('Use without --dry-run to create the agent');
            return;
        }
        // 7. Progress indicators for long operations
        const spinner = UIService_1.ui.spinner('Creating agent with smart defaults...');
        spinner.start();
        // 8. Create the agent
        const result = await agentManager.createAgent({
            branch: branchName,
            agentId,
            autoAccept: creationConfig.autoAccept,
            useDocker: creationConfig.useDocker
        });
        if (result.success && result.data) {
            spinner.succeed('Agent created successfully!');
            // 9. Post-creation setup based on mode
            if (creationConfig.setupTaskMaster) {
                const setupSpinner = UIService_1.ui.spinner('Setting up Task Master environment...');
                setupSpinner.start();
                try {
                    await setupTaskMasterEnvironment(result.data.worktreePath, options?.task);
                    setupSpinner.succeed('Task Master environment configured');
                }
                catch (error) {
                    setupSpinner.warn('Task Master setup failed, continuing...');
                }
            }
            if (creationConfig.pushBranch) {
                const pushSpinner = UIService_1.ui.spinner('Pushing branch to origin...');
                pushSpinner.start();
                try {
                    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                    execSync(`git push -u origin ${branchName}`, {
                        cwd: result.data.worktreePath,
                        stdio: 'pipe'
                    });
                    pushSpinner.succeed('Branch pushed to origin');
                }
                catch (error) {
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
            UIService_1.ui.agentDetails(agent);
            // 11. Show quick start commands
            UIService_1.ui.divider('Quick Start');
            UIService_1.ui.command(`magents attach ${result.data.agentId}`, 'Start working on the agent');
            if (options?.task) {
                UIService_1.ui.command(`get_task({id: "${options.task}"})`, 'Get task details in Claude Code');
            }
            UIService_1.ui.command(`magents a 1`, 'Or use shorthand to attach');
            UIService_1.ui.divider('Agent Setup Complete');
            UIService_1.ui.success(`✅ Mode: ${mode} (${creationConfig.useDocker ? 'Docker' : 'tmux'})`);
            if (creationConfig.setupTaskMaster) {
                UIService_1.ui.success('✅ Task Master environment ready');
            }
            if (creationConfig.pushBranch) {
                UIService_1.ui.success('✅ Branch pushed to origin');
            }
        }
        else {
            spinner.fail(result.message);
            process.exit(1);
        }
    }
    catch (error) {
        UIService_1.ui.error(`Failed to create agent: ${error instanceof Error ? error.message : String(error)}`);
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
    UIService_1.ui.header('Active Claude Code Agents', false);
    const formattedAgents = agents.map(agent => ({
        id: agent.id,
        branch: agent.branch,
        status: agent.status,
        createdAt: new Date(agent.createdAt)
    }));
    UIService_1.ui.agentList(formattedAgents);
    if (agents.length > 0) {
        UIService_1.ui.divider();
        UIService_1.ui.info(`Total: ${agents.length} agent${agents.length !== 1 ? 's' : ''}`);
        UIService_1.ui.muted('\nTip: Use "magents a <number>" to quickly attach by position');
    }
});
// Attach command
program
    .command('attach')
    .alias('a')
    .description('Attach to an existing agent\'s tmux session')
    .argument('<agent-id-or-number>', 'Agent ID or list position number (1, 2, etc.)')
    .option('--no-briefing', 'Skip showing task briefing before attaching')
    .action(async (agentIdOrNumber, options) => {
    const showBriefing = options.briefing !== false;
    try {
        // Get all agents
        const agents = agentManager.getActiveAgents();
        if (agents.length === 0) {
            UIService_1.ui.error('No active agents found. Create an agent first with "magents create".');
            process.exit(1);
        }
        let agent;
        // Check if input is a number
        const listNumber = parseInt(agentIdOrNumber);
        if (!isNaN(listNumber) && listNumber > 0 && listNumber <= agents.length) {
            // Use list position (1-based index)
            agent = agents[listNumber - 1];
            UIService_1.ui.muted(`Using agent #${listNumber} from list: ${agent.id}`);
        }
        else {
            // Try to find by agent ID
            agent = agents.find(a => a.id === agentIdOrNumber);
        }
        if (!agent) {
            UIService_1.ui.error(`Agent '${agentIdOrNumber}' not found.`);
            UIService_1.ui.info(`Available agents:`);
            agents.forEach((a, index) => {
                UIService_1.ui.keyValue(`  ${index + 1}`, a.id);
            });
            UIService_1.ui.info(`\nUse either the agent ID or position number (1-${agents.length})`);
            process.exit(1);
        }
        // Check for task briefing file
        if (showBriefing) {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const briefingFile = path.join(agent.worktreePath, 'TASK_BRIEFING.md');
            const taskContextFile = path.join(agent.worktreePath, '.taskmaster', 'current-task.json');
            if (fs.existsSync(taskContextFile)) {
                try {
                    const taskContent = fs.readFileSync(taskContextFile, 'utf8');
                    const task = JSON.parse(taskContent);
                    UIService_1.ui.header(`Task Briefing for Agent ${agent.id}`);
                    UIService_1.ui.box(`Task ID: ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority || 'medium'}\n\nDescription:\n${task.description || 'No description provided'}`, `Current Task: ${task.id}`, 'info');
                    if (task.dependencies && task.dependencies.length > 0) {
                        UIService_1.ui.keyValue('Dependencies', task.dependencies.join(', '));
                    }
                    if (task.subtasks && task.subtasks.length > 0) {
                        UIService_1.ui.divider('Subtasks');
                        task.subtasks.forEach((subtask) => {
                            const statusColor = subtask.status === 'done' ? '✅' :
                                subtask.status === 'in_progress' ? '🔄' : '⏳';
                            UIService_1.ui.keyValue(`${statusColor} ${subtask.id}`, `${subtask.title} (${subtask.status})`);
                        });
                    }
                    UIService_1.ui.divider('Quick Commands');
                    UIService_1.ui.command(`get_task({id: "${task.id}"})`, 'Get full task details');
                    UIService_1.ui.command(`set_task_status({id: "${task.id}", status: "in_progress"})`, 'Mark task as started');
                    UIService_1.ui.command(`update_subtask({id: "${task.id}", prompt: "your notes"})`, 'Log progress');
                    UIService_1.ui.command(`set_task_status({id: "${task.id}", status: "done"})`, 'Mark task complete');
                    UIService_1.ui.divider();
                    UIService_1.ui.info(`Full briefing available at: ${briefingFile}`);
                    // Brief pause to read the briefing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    UIService_1.ui.warning('Could not load task context, but agent exists');
                }
            }
            else if (fs.existsSync(briefingFile)) {
                UIService_1.ui.info(`Task briefing available at: ${briefingFile}`);
                UIService_1.ui.info('This agent has task context - check TASK_BRIEFING.md in the worktree');
            }
        }
        const spinner = UIService_1.ui.spinner(`Attaching to agent '${agent.id}'...`);
        spinner.start();
        const result = await agentManager.attachToAgent(agent.id);
        if (result.success) {
            spinner.stop();
            // The attach process will take over the terminal
        }
        else {
            spinner.fail(result.message);
            process.exit(1);
        }
    }
    catch (error) {
        UIService_1.ui.error(`Failed to attach: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
});
// Stop command
program
    .command('stop')
    .description('Stop an agent and optionally remove its worktree')
    .argument('<agent-id-or-number>', 'Agent ID or list position number (1, 2, etc.)')
    .option('-r, --remove-worktree', 'Remove the worktree as well')
    .action(async (agentIdOrNumber, options) => {
    // Get all agents
    const agents = agentManager.getActiveAgents();
    if (agents.length === 0) {
        UIService_1.ui.error('No active agents found.');
        process.exit(1);
    }
    let agent;
    let agentId;
    // Check if input is a number
    const listNumber = parseInt(agentIdOrNumber);
    if (!isNaN(listNumber) && listNumber > 0 && listNumber <= agents.length) {
        // Use list position (1-based index)
        agent = agents[listNumber - 1];
        agentId = agent.id;
        UIService_1.ui.muted(`Using agent #${listNumber} from list: ${agentId}`);
    }
    else {
        // Use as agent ID directly
        agentId = agentIdOrNumber;
        agent = agents.find(a => a.id === agentId);
    }
    if (!agent) {
        UIService_1.ui.error(`Agent '${agentIdOrNumber}' not found.`);
        UIService_1.ui.info(`Available agents:`);
        agents.forEach((a, index) => {
            UIService_1.ui.keyValue(`  ${index + 1}`, a.id);
        });
        UIService_1.ui.info(`\nUse either the agent ID or position number (1-${agents.length})`);
        process.exit(1);
    }
    let removeWorktree = options.removeWorktree || false;
    // Ask about worktree removal if not specified
    if (!options.removeWorktree) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'removeWorktree',
                message: 'Do you want to remove the worktree as well?',
                default: false
            }
        ]);
        removeWorktree = answer.removeWorktree;
    }
    const spinner = UIService_1.ui.spinner(`Stopping agent '${agentId}'...`);
    spinner.start();
    try {
        const result = await agentManager.stopAgent(agentId, removeWorktree);
        if (result.success) {
            spinner.succeed(result.message);
        }
        else {
            spinner.fail(result.message);
            process.exit(1);
        }
    }
    catch (error) {
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
    .action(async (options) => {
    const agents = agentManager.getActiveAgents();
    if (options.fixOrphaned) {
        UIService_1.ui.header('Fixing Orphaned Agents');
        const orphaned = [];
        // Check each agent to see if its worktree still exists
        for (const agent of agents) {
            if (!fs_1.default.existsSync(agent.worktreePath)) {
                orphaned.push(agent.id);
                UIService_1.ui.warning(`Found orphaned agent: ${agent.id} (worktree missing)`);
            }
        }
        if (orphaned.length > 0) {
            const confirmFix = await inquirer_1.default.prompt([
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
                    UIService_1.ui.success(`Removed orphaned agent: ${agentId}`);
                }
            }
        }
        else {
            UIService_1.ui.success('No orphaned agents found');
        }
        return;
    }
    if (agents.length === 0) {
        UIService_1.ui.warning('No active agents to cleanup');
        return;
    }
    UIService_1.ui.warning(`This will stop ${agents.length} active agent${agents.length !== 1 ? 's' : ''}:`);
    agents.forEach(agent => {
        UIService_1.ui.keyValue(`  ${agent.id}`, agent.branch);
    });
    UIService_1.ui.divider();
    const confirmCleanup = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue with cleanup?',
            default: false
        }
    ]);
    if (!confirmCleanup.proceed) {
        UIService_1.ui.info('Cleanup cancelled');
        return;
    }
    let removeWorktrees = options.removeWorktrees || false;
    if (!options.removeWorktrees) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'removeWorktrees',
                message: 'Remove all worktrees as well?',
                default: false
            }
        ]);
        removeWorktrees = answer.removeWorktrees;
    }
    const spinner = UIService_1.ui.spinner('Cleaning up all agents...');
    spinner.start();
    try {
        const result = await agentManager.cleanupAllAgents(removeWorktrees);
        if (result.success) {
            spinner.succeed(result.message);
        }
        else {
            spinner.warn(result.message);
        }
    }
    catch (error) {
        spinner.fail(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
});
// Init command
program
    .command('init')
    .description('Initialize configuration')
    .action(() => {
    const spinner = UIService_1.ui.spinner('Initializing magents configuration...');
    spinner.start();
    try {
        configManager.initializeConfig();
        spinner.succeed('Configuration initialized successfully!');
        const configPath = configManager.getConfigPath();
        UIService_1.ui.box(`Configuration file: ${configPath}\nAgents directory: ${configManager.getAgentsDir()}`, 'Configuration Details', 'success');
        UIService_1.ui.divider('Quick Start');
        UIService_1.ui.command('magents create feature/my-feature', 'Create a new agent');
        UIService_1.ui.command('magents list', 'List all agents');
        UIService_1.ui.command('magents attach <agent-id>', 'Attach to an agent');
    }
    catch (error) {
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
    .action(async (action, mode, options) => {
    const { modeManager } = await Promise.resolve().then(() => __importStar(require('../commands/mode')));
    switch (action) {
        case 'switch':
            if (!mode || !['simple', 'standard', 'advanced'].includes(mode)) {
                UIService_1.ui.error('Please specify a valid mode: simple, standard, or advanced');
                process.exit(1);
            }
            await modeManager.switchMode(mode, options?.preserve !== false, options?.dryRun);
            break;
        case 'show':
            const currentMode = modeManager.getCurrentMode();
            UIService_1.ui.header(`Current Mode: ${currentMode.mode}`);
            UIService_1.ui.keyValue('Help Level', currentMode.helpLevel);
            UIService_1.ui.divider('Enabled Features');
            Object.entries(currentMode.features).forEach(([feature, enabled]) => {
                const featureName = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                UIService_1.ui.keyValue(featureName, enabled ? '✓ Enabled' : '✗ Disabled');
            });
            break;
        case 'recommend':
            const recommended = modeManager.getModeRecommendation();
            UIService_1.ui.info(`Based on your environment, we recommend: ${recommended} mode`);
            UIService_1.ui.tip(`Switch with: magents mode switch ${recommended}`);
            break;
        case 'help':
            modeManager.showModeHelp(mode);
            break;
        default:
            // Show current mode and help
            const current = modeManager.getCurrentMode();
            UIService_1.ui.info(`Current mode: ${current.mode}`);
            modeManager.showModeHelp();
            UIService_1.ui.divider('Available Commands');
            UIService_1.ui.command('magents mode show', 'Show current mode and features');
            UIService_1.ui.command('magents mode switch <mode>', 'Switch to a different mode');
            UIService_1.ui.command('magents mode recommend', 'Get mode recommendation');
            UIService_1.ui.command('magents mode help [mode]', 'Show help for a specific mode');
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
    const { assignCommand } = await Promise.resolve().then(() => __importStar(require('../commands/assign')));
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
    .action(async (taskId, customAgentId, options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const prefix = options.prefix || 'task';
    try {
        // Check if task-master is available
        execSync('which task-master', { stdio: 'ignore' });
    }
    catch (error) {
        UIService_1.ui.error('Task Master not found. Install with: npm install -g task-master-ai');
        process.exit(1);
    }
    try {
        // Get specific task from Task Master
        let task;
        try {
            // Try with --json flag first (newer versions)
            const taskJson = execSync(`task-master show ${taskId} --json`, { encoding: 'utf8' });
            task = JSON.parse(taskJson);
        }
        catch (jsonError) {
            // Fallback to regular output and parse manually
            const taskOutput = execSync(`task-master show ${taskId}`, { encoding: 'utf8' });
            task = parseTaskMasterOutput(taskId, taskOutput);
        }
        if (!task || !task.id) {
            UIService_1.ui.error(`Task ${taskId} not found. Run "task-master list" to see available tasks.`);
            process.exit(1);
        }
        UIService_1.ui.header('Task-Specific Agent Creation');
        // Show task details
        UIService_1.ui.box(`Task ID: ${task.id}\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}\nPriority: ${task.priority || 'medium'}`, `Task ${task.id} Details`, 'info');
        // Generate branch and agent names
        const branchName = `${prefix}/${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        const agentId = customAgentId || `task-${task.id}-agent`;
        UIService_1.ui.keyValue('Branch Name', branchName);
        UIService_1.ui.keyValue('Agent ID', agentId);
        if (options.dryRun) {
            UIService_1.ui.info('Dry run complete. Use without --dry-run to create the agent.');
            return;
        }
        const confirm = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Create agent for Task ${task.id}?`,
                default: true
            }
        ]);
        if (!confirm.proceed) {
            UIService_1.ui.info('Agent creation cancelled.');
            return;
        }
        const spinner = UIService_1.ui.spinner(`Creating agent for Task ${task.id}: ${task.title}`);
        spinner.start();
        try {
            const result = await agentManager.createAgent({
                branch: branchName,
                agentId,
                autoAccept: true
            });
            if (result.success && result.data) {
                spinner.succeed(`Agent ${agentId} created successfully!`);
                // Create task context files in the worktree
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
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
                    UIService_1.ui.info('Creating GitHub issue for task...');
                    issueUrl = await createGitHubIssueForTask(task, branchName, agentId, worktreePath);
                }
                // Push branch to origin
                try {
                    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                    UIService_1.ui.info('Pushing branch to origin...');
                    // First, set upstream and push
                    execSync(`git push -u origin ${branchName}`, {
                        cwd: worktreePath,
                        stdio: 'pipe'
                    });
                    UIService_1.ui.muted(`  ✓ Branch pushed to origin/${branchName}`);
                }
                catch (error) {
                    UIService_1.ui.muted(`  ⚠ Could not push branch to origin: ${error instanceof Error ? error.message : String(error)}`);
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
                    ? task.dependencies.map((dep) => `- Task ${dep}`).join('\n')
                    : 'No dependencies'}

### Subtasks
${task.subtasks && task.subtasks.length > 0
                    ? task.subtasks.map((subtask) => `- ${subtask.id}: ${subtask.title} (${subtask.status})`).join('\n')
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
                UIService_1.ui.success('Task context files created in worktree');
                const agent = {
                    id: result.data.agentId,
                    branch: result.data.branch,
                    worktreePath: result.data.worktreePath,
                    tmuxSession: result.data.tmuxSession,
                    status: 'Active',
                    createdAt: new Date()
                };
                UIService_1.ui.agentDetails(agent);
                UIService_1.ui.divider('Next Steps');
                UIService_1.ui.command(`magents attach ${agentId}`, 'Attach to agent and start working on the task');
                UIService_1.ui.divider('Agent Setup Summary');
                UIService_1.ui.success(`✅ Complete Task Master environment configured`);
                UIService_1.ui.success(`✅ AI models and settings inherited from base project`);
                UIService_1.ui.success(`✅ PRD automatically parsed in agent context`);
                UIService_1.ui.success(`✅ Task-specific briefing created`);
                if (issueUrl) {
                    UIService_1.ui.success(`✅ GitHub issue created: ${issueUrl}`);
                }
                UIService_1.ui.info(`Task briefing: ${briefingFile}`);
                UIService_1.ui.info(`Agent has full Task Master access for Task ${task.id}`);
            }
            else {
                spinner.fail(`Failed to create agent: ${result.message}`);
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail(`Error creating agent: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Command failed')) {
            UIService_1.ui.error(`Task ${taskId} not found or Task Master error. Check that the task exists with "task-master list"`);
        }
        else {
            UIService_1.ui.error(`Failed to get task information: ${error instanceof Error ? error.message : String(error)}`);
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
    .action(async (options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const prefix = options.prefix || 'task';
    try {
        // Check if task-master is available
        execSync('which task-master', { stdio: 'ignore' });
    }
    catch (error) {
        UIService_1.ui.error('Task Master not found. Install with: npm install -g task-master-ai');
        process.exit(1);
    }
    try {
        // Get task list from Task Master
        let tasks;
        try {
            // Try with --json flag first (newer versions)
            const tasksJson = execSync('task-master list --json', { encoding: 'utf8' });
            tasks = JSON.parse(tasksJson);
        }
        catch (jsonError) {
            // Fallback to regular list output
            const listOutput = execSync('task-master list', { encoding: 'utf8' });
            tasks = parseTaskListOutput(listOutput);
        }
        if (!tasks || tasks.length === 0) {
            UIService_1.ui.warning('No tasks found. Run "task-master init" and "task-master parse-prd" first.');
            return;
        }
        // Filter for main tasks (not subtasks) that are pending
        const mainTasks = tasks.filter((task) => !task.id.includes('.') &&
            task.status === 'pending' &&
            task.title);
        if (mainTasks.length === 0) {
            UIService_1.ui.warning('No pending main tasks found to create agents for.');
            return;
        }
        UIService_1.ui.header('Task Master Integration');
        UIService_1.ui.info(`Found ${mainTasks.length} main tasks to create agents for:`);
        const agentPlans = mainTasks.map((task) => {
            const branchName = `${prefix}/${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
            const agentId = `task-${task.id}-agent`;
            return { task, branchName, agentId };
        });
        // Show what will be created
        agentPlans.forEach(({ task, branchName, agentId }) => {
            UIService_1.ui.keyValue(`Task ${task.id}`, `${task.title} → ${branchName} (${agentId})`);
        });
        if (options.dryRun) {
            UIService_1.ui.info('Dry run complete. Use without --dry-run to create agents.');
            return;
        }
        const confirm = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Create ${agentPlans.length} agents for these tasks?`,
                default: true
            }
        ]);
        if (!confirm.proceed) {
            UIService_1.ui.info('Agent creation cancelled.');
            return;
        }
        // Create agents for each task
        for (const { task, branchName, agentId } of agentPlans) {
            const spinner = UIService_1.ui.spinner(`Creating agent for Task ${task.id}: ${task.title}`);
            spinner.start();
            try {
                const result = await agentManager.createAgent({
                    branch: branchName,
                    agentId,
                    autoAccept: true
                });
                if (result.success && result.data) {
                    // Set up complete Task Master environment for each agent
                    await setupTaskMasterEnvironment(result.data.worktreePath, task.id);
                    spinner.succeed(`Agent ${agentId} created for Task ${task.id} with full TM environment`);
                }
                else {
                    spinner.fail(`Failed to create agent for Task ${task.id}: ${result.message}`);
                }
            }
            catch (error) {
                spinner.fail(`Error creating agent for Task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        UIService_1.ui.divider('Next Steps');
        UIService_1.ui.info('To start working on tasks:');
        agentPlans.forEach(({ agentId, task }) => {
            UIService_1.ui.command(`magents attach ${agentId}`, `Work on Task ${task.id}: ${task.title}`);
        });
    }
    catch (error) {
        UIService_1.ui.error(`Failed to integrate with Task Master: ${error instanceof Error ? error.message : String(error)}`);
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
    .action(async (issueOrTaskId, options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    try {
        UIService_1.ui.header('Structured Development Workflow');
        // Determine if this is a GitHub issue or Task Master task
        const isGitHubIssue = /^\d+$/.test(issueOrTaskId);
        let taskId = '';
        let issueNumber = '';
        if (isGitHubIssue) {
            issueNumber = issueOrTaskId;
            UIService_1.ui.info(`Working on GitHub Issue #${issueNumber}`);
        }
        else {
            taskId = issueOrTaskId;
            UIService_1.ui.info(`Working on Task Master Task ${taskId}`);
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
                    UIService_1.ui.success(`Found dedicated agent: ${agentId}`);
                }
            }
            if (!agentId && agents.length === 1) {
                agentId = agents[0].id;
                UIService_1.ui.info(`Using available agent: ${agentId}`);
            }
            else if (!agentId && agents.length > 1) {
                UIService_1.ui.warning('Multiple agents available. Please specify --agent <agent-id>');
                UIService_1.ui.info('Available agents:');
                agents.forEach(agent => UIService_1.ui.keyValue(agent.id, agent.branch));
                process.exit(1);
            }
            else if (!agentId) {
                UIService_1.ui.error('No active agents found. Create an agent first:');
                if (taskId) {
                    UIService_1.ui.command(`magents task-create ${taskId}`, 'Create agent for this task');
                }
                else {
                    UIService_1.ui.command('magents create feature/issue-' + issueNumber, 'Create agent for this issue');
                }
                process.exit(1);
            }
        }
        const agent = agentManager.getActiveAgents().find(a => a.id === agentId);
        if (!agent) {
            UIService_1.ui.error(`Agent '${agentId}' not found`);
            process.exit(1);
        }
        // ========== PLAN PHASE ==========
        if (!options.skipPlan) {
            UIService_1.ui.divider('PLAN PHASE');
            let issueDetails = '';
            let issueTitle = '';
            if (isGitHubIssue) {
                try {
                    UIService_1.ui.info('Fetching GitHub issue details...');
                    const issueJson = execSync(`gh issue view ${issueNumber} --json title,body,labels,assignees`, { encoding: 'utf8' });
                    const issue = JSON.parse(issueJson);
                    issueTitle = issue.title;
                    issueDetails = issue.body;
                    UIService_1.ui.success(`Retrieved issue: ${issueTitle}`);
                }
                catch (error) {
                    UIService_1.ui.error(`Failed to fetch GitHub issue #${issueNumber}`);
                    process.exit(1);
                }
            }
            else {
                try {
                    UIService_1.ui.info('Fetching Task Master task details...');
                    const taskOutput = execSync(`task-master show ${taskId}`, { encoding: 'utf8', cwd: agent.worktreePath });
                    issueDetails = taskOutput;
                    issueTitle = `Task ${taskId}`;
                    UIService_1.ui.success(`Retrieved task details for ${taskId}`);
                }
                catch (error) {
                    UIService_1.ui.error(`Failed to fetch Task Master task ${taskId}`);
                    process.exit(1);
                }
            }
            // Search for relevant context
            UIService_1.ui.info('Searching for relevant context...');
            const scratchpadDir = path.join(agent.worktreePath, 'scratchpad');
            let scratchpadFiles = [];
            if (fs.existsSync(scratchpadDir)) {
                scratchpadFiles = fs.readdirSync(scratchpadDir).filter(f => f.endsWith('.md'));
                UIService_1.ui.muted(`  Found ${scratchpadFiles.length} scratchpad files`);
            }
            // Search for related PRs
            let relatedPRs = [];
            try {
                const prSearch = execSync(`gh pr list --state all --limit 10 --json title,number,url`, { encoding: 'utf8' });
                const prs = JSON.parse(prSearch);
                relatedPRs = prs.map((pr) => `#${pr.number}: ${pr.title} (${pr.url})`);
                UIService_1.ui.muted(`  Found ${relatedPRs.length} recent PRs for context`);
            }
            catch (error) {
                UIService_1.ui.muted('  No PR history available');
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
            UIService_1.ui.success(`Created planning document: ${planFileName}`);
            if (options.planOnly) {
                UIService_1.ui.info('Planning phase complete. Edit the plan file and run without --plan-only to continue.');
                UIService_1.ui.command(`magents attach ${agentId}`, 'Attach to agent to edit plan');
                return;
            }
        }
        // ========== CREATE PHASE ==========
        UIService_1.ui.divider('CREATE PHASE');
        UIService_1.ui.info('Ready to start implementation phase');
        UIService_1.ui.command(`magents attach ${agentId}`, 'Attach to agent to begin implementation');
        UIService_1.ui.box(`Implementation Guidelines:
        
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
- Use 'magents work-issue ${issueOrTaskId} --skip-plan' to continue workflow`, 'Implementation Ready', 'success');
    }
    catch (error) {
        UIService_1.ui.error(`Failed to start work-issue workflow: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
});
// Sync Task Master config to existing agent
program
    .command('sync-taskmaster')
    .description('Sync Task Master configuration to an existing agent')
    .argument('<agent-id>', 'Agent ID to sync Task Master config to')
    .action(async (agentId) => {
    try {
        // Get agent info
        const agents = agentManager.getActiveAgents();
        const agent = agents.find(a => a.id === agentId);
        if (!agent) {
            UIService_1.ui.error(`Agent '${agentId}' not found. Run "magents list" to see active agents.`);
            process.exit(1);
        }
        const spinner = UIService_1.ui.spinner(`Syncing Task Master configuration to ${agentId}...`);
        spinner.start();
        try {
            await setupTaskMasterEnvironment(agent.worktreePath);
            spinner.succeed('Complete Task Master environment synced successfully');
            UIService_1.ui.success(`✅ Task Master environment set up in ${agentId}`);
            UIService_1.ui.success(`✅ AI models and settings inherited`);
            UIService_1.ui.success(`✅ PRD parsed and available`);
            UIService_1.ui.command(`magents attach ${agentId}`, 'Attach to test Task Master commands');
        }
        catch (error) {
            spinner.fail(`Failed to sync configuration: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
    catch (error) {
        UIService_1.ui.error(`Failed to sync Task Master config: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
});
// Troubleshooting command
program
    .command('doctor')
    .description('Check system requirements and troubleshoot issues')
    .action(async () => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    UIService_1.ui.header('Magents System Check');
    // Load config first
    const currentConfig = configManager.loadConfig();
    // Check Task Master installation
    try {
        execSync('which task-master', { stdio: 'ignore' });
        const version = execSync('task-master --version 2>/dev/null || echo "unknown"', { encoding: 'utf8' }).trim();
        UIService_1.ui.success(`Task Master AI: Installed (${version})`);
        // Test JSON support
        try {
            execSync('task-master list --json 2>/dev/null', { stdio: 'ignore' });
            UIService_1.ui.success('JSON support: Available (newer version)');
        }
        catch {
            UIService_1.ui.warning('JSON support: Not available (older version - text parsing will be used)');
        }
    }
    catch {
        UIService_1.ui.error('Task Master AI: Not installed');
        UIService_1.ui.info('Install with: npm install -g task-master-ai');
    }
    // Check Git
    try {
        execSync('git --version', { stdio: 'ignore' });
        UIService_1.ui.success('Git: Installed');
    }
    catch {
        UIService_1.ui.error('Git: Not installed');
    }
    // Check Tmux
    try {
        execSync('which tmux', { stdio: 'ignore' });
        UIService_1.ui.success('Tmux: Installed');
    }
    catch {
        UIService_1.ui.warning('Tmux: Not installed (required for non-Docker agent sessions)');
    }
    // Check Claude Code
    try {
        execSync('which claude', { stdio: 'ignore' });
        UIService_1.ui.success('Claude Code: Installed');
    }
    catch {
        UIService_1.ui.warning('Claude Code: Not found in PATH');
    }
    // Check Docker
    try {
        execSync('docker --version', { stdio: 'ignore' });
        UIService_1.ui.success('Docker: Installed');
        // Check if Docker daemon is running
        try {
            execSync('docker ps', { stdio: 'ignore' });
            UIService_1.ui.success('Docker daemon: Running');
        }
        catch {
            UIService_1.ui.warning('Docker daemon: Not running (start with: docker desktop or systemctl start docker)');
        }
        // Check if our Docker image exists
        if (currentConfig.DOCKER_ENABLED) {
            try {
                execSync(`docker image inspect ${currentConfig.DOCKER_IMAGE}`, { stdio: 'ignore' });
                UIService_1.ui.success(`Docker image: ${currentConfig.DOCKER_IMAGE} exists`);
            }
            catch {
                UIService_1.ui.warning(`Docker image: ${currentConfig.DOCKER_IMAGE} not found (build with: cd packages/cli/docker && ./build.sh)`);
            }
        }
    }
    catch {
        UIService_1.ui.warning('Docker: Not installed (required for Docker mode)');
    }
    UIService_1.ui.divider('Configuration');
    UIService_1.ui.keyValue('Config file', configManager.getConfigPath());
    UIService_1.ui.keyValue('Agents directory', configManager.getAgentsDir());
    UIService_1.ui.keyValue('Max agents', currentConfig.MAX_AGENTS.toString());
    UIService_1.ui.keyValue('Docker mode', currentConfig.DOCKER_ENABLED ? 'Enabled' : 'Disabled');
    if (currentConfig.DOCKER_ENABLED) {
        UIService_1.ui.keyValue('Docker image', currentConfig.DOCKER_IMAGE);
    }
    // Check for Task Master configuration in current project
    const fs = require('fs');
    const path = require('path');
    const currentDir = process.cwd();
    const taskMasterDir = path.join(currentDir, '.taskmaster');
    if (fs.existsSync(taskMasterDir)) {
        UIService_1.ui.success('Task Master project: Initialized in current directory');
        const tasksFile = path.join(taskMasterDir, 'tasks.json');
        const configFile = path.join(taskMasterDir, 'config.json');
        if (fs.existsSync(tasksFile)) {
            UIService_1.ui.success('Tasks file: Found');
        }
        else {
            UIService_1.ui.warning('Tasks file: Not found - run "task-master parse-prd"');
        }
        if (fs.existsSync(configFile)) {
            UIService_1.ui.success('Task Master config: Found');
        }
        else {
            UIService_1.ui.warning('Task Master config: Not found - run "task-master models --setup"');
        }
    }
    else {
        UIService_1.ui.warning('Task Master project: Not initialized in current directory');
        UIService_1.ui.info('Run "task-master init" to set up Task Master in this project');
    }
    UIService_1.ui.divider('Common Issues');
    UIService_1.ui.info('If "task-create" fails with "unknown option --json":');
    UIService_1.ui.command('npm update -g task-master-ai', 'Update to latest version');
    UIService_1.ui.info('Or use text parsing mode (automatic fallback)');
    UIService_1.ui.info('If tasks not found:');
    UIService_1.ui.command('task-master list', 'Check available tasks');
    UIService_1.ui.command('task-master init && task-master parse-prd', 'Initialize if needed');
});
// Dashboard command - open all agents in split tmux view
program
    .command('dashboard')
    .alias('dash')
    .description('Open all Claude agents in a split-screen tmux dashboard')
    .option('-l, --layout <layout>', 'Layout type: grid, horizontal, vertical', 'grid')
    .action(async (options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const agents = agentManager.getActiveAgents();
    const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
    if (runningAgents.length === 0) {
        UIService_1.ui.warning('No running agents found. Start some agents first!');
        return;
    }
    UIService_1.ui.header('Claude Agent Dashboard');
    UIService_1.ui.info(`Opening dashboard with ${runningAgents.length} agents...\n`);
    // Create a new tmux session for the dashboard
    const dashboardSession = 'magents-dashboard';
    try {
        // Kill existing dashboard session if it exists
        try {
            execSync(`tmux kill-session -t ${dashboardSession}`, { stdio: 'ignore' });
        }
        catch {
            // Session doesn't exist, that's fine
        }
        // First, link all claude windows from agents to the dashboard session
        runningAgents.forEach((agent, index) => {
            try {
                // Link each agent's claude window to the dashboard session
                execSync(`tmux link-window -s ${agent.tmuxSession}:claude -t ${dashboardSession}:${index}`, { stdio: 'pipe' });
            }
            catch (e) {
                // If linking fails, create a new session first
                if (index === 0) {
                    // For first agent, create new session with their claude window
                    execSync(`tmux new-session -d -s ${dashboardSession} -t ${agent.tmuxSession}:claude`, { stdio: 'pipe' });
                }
            }
        });
        // Now create the split layout in a new window
        execSync(`tmux new-window -t ${dashboardSession} -n dashboard`, { stdio: 'pipe' });
        const dashWindow = `${dashboardSession}:dashboard`;
        // For each agent, create a pane that switches to their claude window
        runningAgents.forEach((agent, index) => {
            if (index === 0) {
                // First pane - clear and set up
                execSync(`tmux send-keys -t ${dashWindow} "clear" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow} "echo 'Agent: ${agent.id}'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow} "echo 'Session: ${agent.tmuxSession}:claude'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow} "echo ''" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow} "echo 'Switching to Claude window...'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow} "sleep 1 && tmux switch-client -t ${agent.tmuxSession}:claude" Enter`, { stdio: 'pipe' });
            }
            else {
                // Create new panes
                let splitCmd = '';
                switch (options.layout) {
                    case 'horizontal':
                        splitCmd = '-h';
                        break;
                    case 'vertical':
                        splitCmd = '-v';
                        break;
                    case 'grid':
                    default:
                        splitCmd = index % 2 === 0 ? '-v' : '-h';
                        break;
                }
                execSync(`tmux split-window -t ${dashWindow} ${splitCmd}`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "clear" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "echo 'Agent: ${agent.id}'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "echo 'Session: ${agent.tmuxSession}:claude'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "echo ''" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "echo 'Switching to Claude window...'" Enter`, { stdio: 'pipe' });
                execSync(`tmux send-keys -t ${dashWindow}.${index} "sleep 1 && tmux switch-client -t ${agent.tmuxSession}:claude" Enter`, { stdio: 'pipe' });
            }
        });
        // Apply layout
        if (options.layout === 'grid') {
            execSync(`tmux select-layout -t ${dashWindow} tiled`, { stdio: 'pipe' });
        }
        else if (options.layout === 'horizontal') {
            execSync(`tmux select-layout -t ${dashWindow} even-horizontal`, { stdio: 'pipe' });
        }
        else if (options.layout === 'vertical') {
            execSync(`tmux select-layout -t ${dashWindow} even-vertical`, { stdio: 'pipe' });
        }
        UIService_1.ui.success('Dashboard created successfully!');
        UIService_1.ui.divider('Dashboard Windows');
        runningAgents.forEach((agent, index) => {
            UIService_1.ui.keyValue(`Window ${index}`, `${agent.id} (${agent.tmuxSession}:claude)`);
        });
        UIService_1.ui.divider('Navigation');
        UIService_1.ui.keyValue('Switch windows', 'Ctrl+b then window number (0-9)');
        UIService_1.ui.keyValue('Switch panes', 'Ctrl+b then arrow keys');
        UIService_1.ui.keyValue('Next window', 'Ctrl+b then n');
        UIService_1.ui.keyValue('Previous window', 'Ctrl+b then p');
        UIService_1.ui.keyValue('List windows', 'Ctrl+b then w');
        UIService_1.ui.keyValue('Exit dashboard', 'Ctrl+b then d');
        UIService_1.ui.divider();
        // Attach to the dashboard
        if (process.stdout.isTTY) {
            execSync(`tmux attach-session -t ${dashboardSession}`, { stdio: 'inherit' });
        }
        else {
            UIService_1.ui.info(`Run this command to attach: tmux attach-session -t ${dashboardSession}`);
        }
    }
    catch (error) {
        UIService_1.ui.error(`Failed to create dashboard: ${error instanceof Error ? error.message : String(error)}`);
        UIService_1.ui.info('\nTip: Make sure tmux is installed and you have running agents.');
    }
});
// Monitor command - preview all tmux sessions
program
    .command('monitor')
    .alias('preview')
    .description('Show live preview of all Claude agent sessions')
    .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '2')
    .option('-l, --lines <number>', 'Number of lines to show per session', '10')
    .action(async (options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const refreshInterval = parseInt(options.refresh || '2') * 1000;
    const linesToShow = parseInt(options.lines || '10');
    UIService_1.ui.header('Claude Agent Monitor', true);
    UIService_1.ui.info('Press Ctrl+C to exit monitor mode\n');
    // Function to get tmux pane content
    const getPaneContent = (sessionName, paneName) => {
        try {
            // Capture the pane content
            const output = execSync(`tmux capture-pane -t "${sessionName}:${paneName}" -p -S -${linesToShow}`, { encoding: 'utf8', stdio: 'pipe' });
            return output.split('\n').slice(-linesToShow).filter(line => line.trim());
        }
        catch {
            return ['[Session not accessible]'];
        }
    };
    // Function to display all agents
    const displayAgents = () => {
        // Clear screen
        console.clear();
        UIService_1.ui.header('Claude Agent Monitor - Live Preview', true);
        UIService_1.ui.muted(`Refreshing every ${options.refresh}s • Showing last ${linesToShow} lines • Press Ctrl+C to exit\n`);
        const agents = agentManager.getActiveAgents();
        if (agents.length === 0) {
            UIService_1.ui.warning('No active agents found');
            return;
        }
        // Get all magent tmux sessions
        const tmuxSessions = agentManager.getTmuxService().listSessions()
            .filter((session) => session.startsWith('magent-'));
        agents.forEach(agent => {
            const isRunning = tmuxSessions.includes(agent.tmuxSession);
            UIService_1.ui.divider(`Agent: ${agent.id} (${agent.status})`);
            UIService_1.ui.keyValue('Branch', agent.branch);
            UIService_1.ui.keyValue('Session', agent.tmuxSession);
            if (isRunning && agent.status === 'RUNNING') {
                // Get claude window content (where Claude Code runs)
                const claudeContent = getPaneContent(agent.tmuxSession, 'claude');
                UIService_1.ui.muted('\nClaude Code Output:');
                UIService_1.ui.box(claudeContent.join('\n') || '[No output yet]', undefined, claudeContent.some(line => line.includes('error') || line.includes('Error')) ? 'error' : 'info');
                // Check if Claude is currently processing
                const lastLine = claudeContent[claudeContent.length - 1] || '';
                if (lastLine.includes('Thinking') || lastLine.includes('...')) {
                    UIService_1.ui.spinner('Claude is thinking...').start();
                }
            }
            else {
                UIService_1.ui.warning('Session not running or not accessible');
            }
            console.log(''); // Add spacing between agents
        });
        UIService_1.ui.divider();
        UIService_1.ui.muted(`Last updated: ${new Date().toLocaleTimeString()}`);
    };
    // Initial display
    displayAgents();
    // Set up refresh interval
    const interval = setInterval(displayAgents, refreshInterval);
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        clearInterval(interval);
        console.clear();
        UIService_1.ui.success('\nMonitor stopped');
        process.exit(0);
    });
});
// Config command
program
    .command('config')
    .description('View or edit configuration')
    .option('-e, --edit', 'Edit configuration interactively')
    .option('--docker', 'Enable Docker mode for agents')
    .option('--no-docker', 'Disable Docker mode (use tmux/worktrees)')
    .action(async (options) => {
    const config = configManager.loadConfig();
    // Handle docker mode toggle
    if (options.docker !== undefined) {
        configManager.updateConfig({ DOCKER_ENABLED: options.docker });
        UIService_1.ui.success(`Docker mode ${options.docker ? 'enabled' : 'disabled'}`);
        UIService_1.ui.info(`Agents will now be created using ${options.docker ? 'Docker containers' : 'tmux sessions and git worktrees'}`);
        return;
    }
    if (options.edit) {
        UIService_1.ui.header('Edit Configuration');
        UIService_1.ui.divider('Current Configuration');
        Object.entries(config).forEach(([key, value]) => {
            UIService_1.ui.keyValue(key, String(value));
        });
        UIService_1.ui.divider();
        const answers = await inquirer_1.default.prompt([
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
        UIService_1.ui.success('Configuration updated successfully!');
    }
    else {
        UIService_1.ui.header('Current Configuration');
        const configDetails = Object.entries(config)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        UIService_1.ui.box(configDetails + `\n\nConfig file: ${configManager.getConfigPath()}`, 'Configuration', 'info');
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
    .option('--volume <mapping>', 'Additional volume mappings', (value, previous = []) => previous.concat(value), [])
    .option('--env <var>', 'Environment variables', (value, previous = []) => previous.concat(value), [])
    .option('--health-check', 'Enable health monitoring')
    .option('--restart <policy>', 'Restart policy (no, on-failure, unless-stopped, always)')
    .option('--detach', 'Run in detached mode')
    .option('--logs', 'Show container logs after starting')
    .option('--shell', 'Open shell in container after starting')
    .option('--dry-run', 'Preview what would be started without actually starting')
    .action(async (agentId, options) => {
    const { startCommand } = await Promise.resolve().then(() => __importStar(require('../commands/start')));
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
// Override help to show our custom styling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    UIService_1.ui.header('MAGENTS - Multi-Agent Claude Code Workflow Manager', true);
}
program.parse();
//# sourceMappingURL=magents.js.map