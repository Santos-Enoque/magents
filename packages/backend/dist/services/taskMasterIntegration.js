"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskMasterIntegrationService = exports.TaskMasterIntegrationService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class TaskMasterIntegrationService {
    constructor() {
        this.taskCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds
    }
    /**
     * Detect if TaskMaster is configured in a project
     */
    async detectTaskMaster(projectPath) {
        const result = {
            isConfigured: false
        };
        try {
            // Check for .taskmaster directory
            const taskMasterDir = path_1.default.join(projectPath, '.taskmaster');
            const dirStats = await fs_1.promises.stat(taskMasterDir).catch(() => null);
            if (!dirStats || !dirStats.isDirectory()) {
                return result;
            }
            // Check for config file
            const configPath = path_1.default.join(taskMasterDir, 'config.json');
            const configExists = await fs_1.promises.access(configPath).then(() => true).catch(() => false);
            if (configExists) {
                result.isConfigured = true;
                result.configPath = configPath;
                try {
                    const configContent = await fs_1.promises.readFile(configPath, 'utf-8');
                    result.config = JSON.parse(configContent);
                }
                catch (error) {
                    console.warn('Failed to parse TaskMaster config:', error);
                }
            }
            // Check for tasks file
            const tasksPath = path_1.default.join(taskMasterDir, 'tasks', 'tasks.json');
            const tasksExists = await fs_1.promises.access(tasksPath).then(() => true).catch(() => false);
            if (tasksExists) {
                result.tasksPath = tasksPath;
                result.hasActiveTasks = true;
            }
            return result;
        }
        catch (error) {
            console.error('Error detecting TaskMaster:', error);
            return result;
        }
    }
    /**
     * Get available TaskMaster tasks from a project
     */
    async getTasks(projectPath) {
        // Check cache first
        const cacheKey = projectPath;
        const cached = this.taskCache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < this.cacheExpiry) {
            return cached.tasks;
        }
        try {
            // First check if TaskMaster is configured
            const detection = await this.detectTaskMaster(projectPath);
            if (!detection.isConfigured || !detection.tasksPath) {
                // Cache empty result
                this.taskCache.set(cacheKey, {
                    tasks: [],
                    timestamp: now,
                    projectPath
                });
                return [];
            }
            // Execute task-master list command with JSON output
            const { stdout } = await execAsync('task-master list --json', {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' } // Disable color output
            });
            // Parse the JSON output
            const tasksData = JSON.parse(stdout);
            // Extract tasks from the structure
            let tasks = [];
            if (tasksData && tasksData.master && tasksData.master.tasks) {
                tasks = this.flattenTasks(tasksData.master.tasks);
            }
            // Cache the result
            this.taskCache.set(cacheKey, {
                tasks,
                timestamp: now,
                projectPath
            });
            return tasks;
        }
        catch (error) {
            console.error('Error getting TaskMaster tasks:', error);
            // Fallback to reading tasks.json directly
            try {
                const tasksPath = path_1.default.join(projectPath, '.taskmaster', 'tasks', 'tasks.json');
                const tasksContent = await fs_1.promises.readFile(tasksPath, 'utf-8');
                const tasksData = JSON.parse(tasksContent);
                let tasks = [];
                if (tasksData && tasksData.master && tasksData.master.tasks) {
                    tasks = this.flattenTasks(tasksData.master.tasks);
                }
                // Cache the fallback result
                this.taskCache.set(cacheKey, {
                    tasks,
                    timestamp: now,
                    projectPath
                });
                return tasks;
            }
            catch (fallbackError) {
                console.error('Fallback task reading failed:', fallbackError);
            }
            // Cache empty result on complete failure
            this.taskCache.set(cacheKey, {
                tasks: [],
                timestamp: now,
                projectPath
            });
            return [];
        }
    }
    /**
     * Get details of a specific task
     */
    async getTaskDetails(projectPath, taskId) {
        try {
            // Execute task-master show command
            const { stdout } = await execAsync(`task-master show ${taskId} --json`, {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' }
            });
            const taskData = JSON.parse(stdout);
            return this.normalizeTask(taskData);
        }
        catch (error) {
            console.error(`Error getting task details for ${taskId}:`, error);
            // Fallback to getting all tasks and finding the specific one
            const allTasks = await this.getTasks(projectPath);
            return allTasks.find(task => task.id === taskId) || null;
        }
    }
    /**
     * Assign a task to an agent
     */
    async assignTaskToAgent(agentId, taskId, projectPath, worktreePath) {
        // Get task details
        const task = await this.getTaskDetails(projectPath, taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        // Create briefing content
        const briefingContent = this.generateTaskBriefing(task, agentId);
        // Write briefing file to agent's worktree
        const briefingDir = path_1.default.join(worktreePath, '.agent');
        await fs_1.promises.mkdir(briefingDir, { recursive: true });
        const briefingPath = path_1.default.join(briefingDir, 'task-briefing.md');
        await fs_1.promises.writeFile(briefingPath, briefingContent);
        // Create context file with task details
        const contextContent = this.generateTaskContext(task);
        const contextPath = path_1.default.join(briefingDir, 'task-context.json');
        await fs_1.promises.writeFile(contextPath, JSON.stringify(contextContent, null, 2));
        // Create environment variables for the task
        const environment = {
            AGENT_TASK_ID: taskId,
            AGENT_TASK_TITLE: task.title,
            AGENT_TASK_PRIORITY: task.priority || 'medium',
            AGENT_TASK_STATUS: task.status,
            TASKMASTER_PROJECT_PATH: projectPath,
            TASKMASTER_BRIEFING_PATH: briefingPath,
            TASKMASTER_CONTEXT_PATH: contextPath
        };
        // Update task status to in-progress if it's pending
        if (task.status === 'pending') {
            try {
                await execAsync(`task-master set-status --id=${taskId} --status=in-progress`, {
                    cwd: projectPath
                });
            }
            catch (error) {
                console.warn(`Failed to update task status: ${error}`);
            }
        }
        return {
            agentId,
            taskId,
            task,
            briefingPath,
            contextPath,
            environment
        };
    }
    /**
     * Create a new task from the GUI
     */
    async createTask(projectPath, title, description, priority = 'medium') {
        try {
            // Build the command with proper escaping
            const escapedTitle = title.replace(/"/g, '\\"');
            const escapedDescription = description.replace(/"/g, '\\"');
            const command = `task-master add-task --prompt="${escapedTitle}: ${escapedDescription}" --priority=${priority}`;
            const { stdout } = await execAsync(command, {
                cwd: projectPath,
                env: { ...process.env, FORCE_COLOR: '0' }
            });
            // Parse the output to extract the created task ID
            const taskIdMatch = stdout.match(/Task (\d+(?:\.\d+)*) added successfully/);
            if (taskIdMatch && taskIdMatch[1]) {
                // Invalidate cache since we added a new task
                this.invalidateCache(projectPath);
                const newTaskId = taskIdMatch[1];
                const task = await this.getTaskDetails(projectPath, newTaskId);
                if (task) {
                    return task;
                }
            }
            // Invalidate cache even if we couldn't parse the task ID
            this.invalidateCache(projectPath);
            // If we couldn't parse the task ID, return a minimal task object
            return {
                id: 'temp-' + Date.now(),
                title,
                description,
                status: 'pending',
                priority
            };
        }
        catch (error) {
            throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update task status
     */
    async updateTaskStatus(projectPath, taskId, status) {
        try {
            await execAsync(`task-master set-status --id=${taskId} --status=${status}`, {
                cwd: projectPath
            });
            // Invalidate cache for this project
            this.invalidateCache(projectPath);
        }
        catch (error) {
            throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Invalidate cache for a specific project
     */
    invalidateCache(projectPath) {
        this.taskCache.delete(projectPath);
    }
    /**
     * Clear all cached tasks
     */
    clearCache() {
        this.taskCache.clear();
    }
    /**
     * Generate a task briefing for an agent
     */
    generateTaskBriefing(task, agentId) {
        const briefing = `# Task Briefing for Agent ${agentId}

## Task Information

**ID:** ${task.id}
**Title:** ${task.title}
**Priority:** ${task.priority || 'medium'}
**Status:** ${task.status}

## Description

${task.description || 'No description provided.'}

## Implementation Details

${task.details || 'No additional details provided.'}

## Test Strategy

${task.testStrategy || 'No specific test strategy defined.'}

${task.dependencies && task.dependencies.length > 0 ? `
## Dependencies

This task depends on the following tasks:
${task.dependencies.map(dep => `- Task ${dep}`).join('\n')}
` : ''}

${task.subtasks && task.subtasks.length > 0 ? `
## Subtasks

${task.subtasks.map((subtask, index) => `
### ${index + 1}. ${subtask.title}

${subtask.description || ''}

**Status:** ${subtask.status}
${subtask.details ? `\n**Details:** ${subtask.details}` : ''}
`).join('\n')}
` : ''}

## Instructions

1. Review the task requirements carefully
2. Implement the functionality as described
3. Write comprehensive tests following the test strategy
4. Update task status when complete
5. Document any important decisions or changes

## Commands

- View this task: \`task-master show ${task.id}\`
- Update status: \`task-master set-status --id=${task.id} --status=done\`
- Add notes: \`task-master update-task --id=${task.id} --prompt="your notes"\`

---

*This briefing was generated automatically for agent ${agentId}*
`;
        return briefing;
    }
    /**
     * Generate task context JSON
     */
    generateTaskContext(task) {
        return {
            task: {
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority || 'medium',
                details: task.details,
                testStrategy: task.testStrategy,
                dependencies: task.dependencies || [],
                subtasks: task.subtasks || []
            },
            metadata: {
                generated: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    /**
     * Flatten nested tasks into a single array
     */
    flattenTasks(tasks) {
        const flattened = [];
        const processTask = (task) => {
            const normalizedTask = this.normalizeTask(task);
            if (normalizedTask) {
                flattened.push(normalizedTask);
                // Process subtasks recursively
                const taskObj = task;
                if (taskObj.subtasks && Array.isArray(taskObj.subtasks)) {
                    taskObj.subtasks.forEach((subtask) => {
                        processTask(subtask);
                    });
                }
            }
        };
        tasks.forEach(task => processTask(task));
        return flattened;
    }
    /**
     * Normalize task data from various formats
     */
    normalizeTask(task) {
        if (!task || typeof task !== 'object') {
            return null;
        }
        const taskObj = task;
        return {
            id: String(taskObj.id || ''),
            title: String(taskObj.title || 'Untitled Task'),
            description: taskObj.description,
            status: taskObj.status || 'pending',
            priority: taskObj.priority || 'medium',
            dependencies: taskObj.dependencies || [],
            details: taskObj.details,
            testStrategy: taskObj.testStrategy,
            subtasks: [] // Subtasks are flattened separately
        };
    }
}
exports.TaskMasterIntegrationService = TaskMasterIntegrationService;
exports.taskMasterIntegrationService = new TaskMasterIntegrationService();
//# sourceMappingURL=taskMasterIntegration.js.map