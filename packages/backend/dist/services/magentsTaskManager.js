"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.magentsTaskManager = exports.MagentsTaskManager = void 0;
const taskMasterIntegration_1 = require("./taskMasterIntegration");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class MagentsTaskManager {
    constructor() {
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.taskMasterService = new taskMasterIntegration_1.TaskMasterIntegrationService();
        this.cache = new Map();
    }
    /**
     * Quick start Task Master for a project with minimal configuration
     */
    async quickStart(options) {
        const { projectPath, projectName, autoDetectType = true } = options;
        try {
            // Check if already initialized
            const detection = await this.taskMasterService.detectTaskMaster(projectPath);
            if (detection.isConfigured) {
                return {
                    success: true,
                    message: 'Task Master is already configured for this project'
                };
            }
            // Initialize Task Master
            (0, child_process_1.execSync)('task-master init', { cwd: projectPath });
            // Auto-detect project type and generate PRD if requested
            if (autoDetectType) {
                const projectType = await this.detectProjectType(projectPath);
                const prdContent = await this.generatePRDFromProject(projectPath, projectType, projectName);
                // Save PRD
                const prdPath = path_1.default.join(projectPath, '.taskmaster', 'docs', 'auto-generated-prd.txt');
                await fs_1.promises.mkdir(path_1.default.dirname(prdPath), { recursive: true });
                await fs_1.promises.writeFile(prdPath, prdContent);
                // Parse PRD to generate tasks
                (0, child_process_1.execSync)(`task-master parse-prd "${prdPath}"`, { cwd: projectPath });
            }
            return {
                success: true,
                message: 'Task Master initialized successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: this.translateError(error)
            };
        }
    }
    /**
     * Automatically analyze project and expand tasks
     */
    async autoAnalyze(projectPath) {
        try {
            // Run complexity analysis
            (0, child_process_1.execSync)('task-master analyze-complexity', { cwd: projectPath });
            // Expand all tasks based on complexity
            (0, child_process_1.execSync)('task-master expand --all', { cwd: projectPath });
            // Get task count
            const tasks = await this.getSimplifiedTasks(projectPath);
            return {
                success: true,
                message: `Analysis complete. ${tasks.length} tasks created.`,
                taskCount: tasks.length
            };
        }
        catch (error) {
            return {
                success: false,
                message: this.translateError(error)
            };
        }
    }
    /**
     * Get simplified view of tasks
     */
    async getSimplifiedTasks(projectPath) {
        const cacheKey = `tasks-${projectPath}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return cached;
        try {
            const tasks = await this.taskMasterService.getTasks(projectPath);
            const simplified = tasks.map(task => this.simplifyTask(task));
            this.setCache(cacheKey, simplified);
            return simplified;
        }
        catch (error) {
            console.error('Error getting simplified tasks:', error);
            return [];
        }
    }
    /**
     * Get next task in simplified format
     */
    async getNextTask(projectPath) {
        try {
            const tasks = await this.getSimplifiedTasks(projectPath);
            const pendingTask = tasks.find(task => task.status === 'pending' && !task.isSubtask);
            return pendingTask || null;
        }
        catch (error) {
            console.error('Error getting next task:', error);
            return null;
        }
    }
    /**
     * Create a task with minimal input
     */
    async createSimpleTask(projectPath, title, priority = 'medium') {
        try {
            const task = await this.taskMasterService.createTask(projectPath, title, '', // Empty description, let Task Master AI enhance it
            priority);
            // Clear cache
            this.clearProjectCache(projectPath);
            return this.simplifyTask(task);
        }
        catch (error) {
            console.error('Error creating task:', error);
            return null;
        }
    }
    /**
     * Detect project type from files
     */
    async detectProjectType(projectPath) {
        const result = {
            type: 'unknown',
            frameworks: []
        };
        try {
            const files = await fs_1.promises.readdir(projectPath);
            // Node.js detection
            if (files.includes('package.json')) {
                result.type = 'node';
                const packageJson = JSON.parse(await fs_1.promises.readFile(path_1.default.join(projectPath, 'package.json'), 'utf-8'));
                // Detect package manager
                if (files.includes('yarn.lock'))
                    result.packageManager = 'yarn';
                else if (files.includes('pnpm-lock.yaml'))
                    result.packageManager = 'pnpm';
                else
                    result.packageManager = 'npm';
                // Detect frameworks
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                if (deps.react)
                    result.frameworks.push('react');
                if (deps.vue)
                    result.frameworks.push('vue');
                if (deps.angular)
                    result.frameworks.push('angular');
                if (deps.express)
                    result.frameworks.push('express');
                if (deps.next)
                    result.frameworks.push('nextjs');
                if (deps.nest || deps['@nestjs/core'])
                    result.frameworks.push('nestjs');
            }
            // Python detection
            else if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
                result.type = 'python';
                result.packageManager = 'pip';
                // Check for common frameworks in requirements.txt
                if (files.includes('requirements.txt')) {
                    const requirements = await fs_1.promises.readFile(path_1.default.join(projectPath, 'requirements.txt'), 'utf-8');
                    if (requirements.includes('django'))
                        result.frameworks.push('django');
                    if (requirements.includes('flask'))
                        result.frameworks.push('flask');
                    if (requirements.includes('fastapi'))
                        result.frameworks.push('fastapi');
                }
            }
            // Java detection
            else if (files.includes('pom.xml')) {
                result.type = 'java';
                result.packageManager = 'maven';
            }
            else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
                result.type = 'java';
                result.packageManager = 'gradle';
            }
            // Rust detection
            else if (files.includes('Cargo.toml')) {
                result.type = 'rust';
                result.packageManager = 'cargo';
            }
            // Go detection
            else if (files.includes('go.mod')) {
                result.type = 'go';
            }
            return result;
        }
        catch (error) {
            console.error('Error detecting project type:', error);
            return result;
        }
    }
    /**
     * Generate PRD from project structure
     */
    async generatePRDFromProject(projectPath, projectType, projectName) {
        const name = projectName || path_1.default.basename(projectPath);
        const timestamp = new Date().toISOString();
        let prd = `# Product Requirements Document
Generated: ${timestamp}
Project: ${name}

## Project Overview
This is a ${projectType.type} project${projectType.packageManager ? ` using ${projectType.packageManager}` : ''}.
${projectType.frameworks.length > 0 ? `Frameworks: ${projectType.frameworks.join(', ')}` : ''}

## Detected Structure
`;
        // Analyze project structure
        const structure = await this.analyzeProjectStructure(projectPath);
        prd += structure;
        prd += `
## Implementation Tasks

Based on the project structure, the following tasks should be completed:

1. **Code Review and Documentation**
   - Review existing code for quality and consistency
   - Add missing documentation and comments
   - Create or update README.md

2. **Testing and Quality**
   - Add unit tests for uncovered code
   - Set up integration tests
   - Configure linting and formatting

3. **Performance and Optimization**
   - Identify and optimize performance bottlenecks
   - Implement caching where appropriate
   - Optimize build process

4. **Security and Best Practices**
   - Audit dependencies for vulnerabilities
   - Implement security best practices
   - Add input validation and sanitization

5. **Features and Enhancements**
   - Implement planned features
   - Improve user experience
   - Add monitoring and logging
`;
        return prd;
    }
    /**
     * Analyze project structure
     */
    async analyzeProjectStructure(projectPath, depth = 0, maxDepth = 3) {
        if (depth > maxDepth)
            return '';
        let structure = '';
        const indent = '  '.repeat(depth);
        try {
            const items = await fs_1.promises.readdir(projectPath);
            for (const item of items) {
                // Skip common ignored directories
                if (['.git', 'node_modules', '.taskmaster', 'dist', 'build', '__pycache__'].includes(item)) {
                    continue;
                }
                const itemPath = path_1.default.join(projectPath, item);
                const stats = await fs_1.promises.stat(itemPath);
                if (stats.isDirectory()) {
                    structure += `${indent}- ${item}/\n`;
                    structure += await this.analyzeProjectStructure(itemPath, depth + 1, maxDepth);
                }
                else if (stats.isFile()) {
                    // Only include relevant files
                    const ext = path_1.default.extname(item);
                    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.json', '.md'].includes(ext)) {
                        structure += `${indent}- ${item}\n`;
                    }
                }
            }
        }
        catch (error) {
            console.error('Error analyzing structure:', error);
        }
        return structure;
    }
    /**
     * Simplify task data
     */
    simplifyTask(task) {
        const isSubtask = task.id.includes('.');
        const parentId = isSubtask ? task.id.split('.').slice(0, -1).join('.') : undefined;
        return {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority || 'medium',
            isSubtask,
            parentId,
            description: task.description
        };
    }
    /**
     * Translate Task Master errors to user-friendly messages
     */
    translateError(error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        // Common error translations
        const translations = {
            'command not found': 'Task Master is not installed. Please install it first.',
            'ENOENT': 'Project directory not found. Please check the path.',
            'already initialized': 'Task Master is already set up for this project.',
            'no tasks found': 'No tasks available. Try creating some tasks first.',
            'parse error': 'Could not understand the task format. Please check your input.',
            'API error': 'AI service is temporarily unavailable. Please try again later.',
            'permission denied': 'Permission denied. Please check file permissions.',
        };
        for (const [key, translation] of Object.entries(translations)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
                return translation;
            }
        }
        // Generic friendly message for unknown errors
        return `Something went wrong: ${errorMessage.split('\n')[0]}`;
    }
    /**
     * Cache management
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    clearProjectCache(projectPath) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(projectPath)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }
}
exports.MagentsTaskManager = MagentsTaskManager;
exports.magentsTaskManager = new MagentsTaskManager();
//# sourceMappingURL=magentsTaskManager.js.map