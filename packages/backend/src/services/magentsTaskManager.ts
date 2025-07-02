import { TaskMasterIntegrationService, TaskMasterTask } from './taskMasterIntegration';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface SimplifiedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  isSubtask: boolean;
  parentId?: string;
  description?: string;
}

export interface QuickStartOptions {
  projectPath: string;
  projectName?: string;
  autoDetectType?: boolean;
}

export interface ProjectType {
  type: 'node' | 'python' | 'java' | 'go' | 'rust' | 'unknown';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'maven' | 'gradle' | 'cargo';
  frameworks: string[];
}

export class MagentsTaskManager {
  private taskMasterService: TaskMasterIntegrationService;
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.taskMasterService = new TaskMasterIntegrationService();
    this.cache = new Map();
  }

  /**
   * Quick start Task Master for a project with minimal configuration
   */
  async quickStart(options: QuickStartOptions): Promise<{ success: boolean; message: string }> {
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
      execSync('task-master init', { cwd: projectPath });

      // Auto-detect project type and generate PRD if requested
      if (autoDetectType) {
        const projectType = await this.detectProjectType(projectPath);
        const prdContent = await this.generatePRDFromProject(projectPath, projectType, projectName);
        
        // Save PRD
        const prdPath = path.join(projectPath, '.taskmaster', 'docs', 'auto-generated-prd.txt');
        await fs.mkdir(path.dirname(prdPath), { recursive: true });
        await fs.writeFile(prdPath, prdContent);

        // Parse PRD to generate tasks
        execSync(`task-master parse-prd "${prdPath}"`, { cwd: projectPath });
      }

      return { 
        success: true, 
        message: 'Task Master initialized successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: this.translateError(error) 
      };
    }
  }

  /**
   * Automatically analyze project and expand tasks
   */
  async autoAnalyze(projectPath: string): Promise<{ success: boolean; message: string; taskCount?: number }> {
    try {
      // Run complexity analysis
      execSync('task-master analyze-complexity', { cwd: projectPath });

      // Expand all tasks based on complexity
      execSync('task-master expand --all', { cwd: projectPath });

      // Get task count
      const tasks = await this.getSimplifiedTasks(projectPath);
      
      return { 
        success: true, 
        message: `Analysis complete. ${tasks.length} tasks created.`,
        taskCount: tasks.length 
      };
    } catch (error) {
      return { 
        success: false, 
        message: this.translateError(error) 
      };
    }
  }

  /**
   * Get simplified view of tasks
   */
  async getSimplifiedTasks(projectPath: string): Promise<SimplifiedTask[]> {
    const cacheKey = `tasks-${projectPath}`;
    const cached = this.getCached<SimplifiedTask[]>(cacheKey);
    if (cached) return cached;

    try {
      const tasks = await this.taskMasterService.getTasks(projectPath);
      const simplified = tasks.map(task => this.simplifyTask(task));
      
      this.setCache(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('Error getting simplified tasks:', error);
      return [];
    }
  }

  /**
   * Get next task in simplified format
   */
  async getNextTask(projectPath: string): Promise<SimplifiedTask | null> {
    try {
      const tasks = await this.getSimplifiedTasks(projectPath);
      const pendingTask = tasks.find(task => task.status === 'pending' && !task.isSubtask);
      return pendingTask || null;
    } catch (error) {
      console.error('Error getting next task:', error);
      return null;
    }
  }

  /**
   * Create a task with minimal input
   */
  async createSimpleTask(
    projectPath: string, 
    title: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<SimplifiedTask | null> {
    try {
      const task = await this.taskMasterService.createTask(
        projectPath,
        title,
        '', // Empty description, let Task Master AI enhance it
        priority
      );
      
      // Clear cache
      this.clearProjectCache(projectPath);
      
      return this.simplifyTask(task);
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  /**
   * Detect project type from files
   */
  private async detectProjectType(projectPath: string): Promise<ProjectType> {
    const result: ProjectType = {
      type: 'unknown',
      frameworks: []
    };

    try {
      const files = await fs.readdir(projectPath);

      // Node.js detection
      if (files.includes('package.json')) {
        result.type = 'node';
        const packageJson = JSON.parse(
          await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
        );

        // Detect package manager
        if (files.includes('yarn.lock')) result.packageManager = 'yarn';
        else if (files.includes('pnpm-lock.yaml')) result.packageManager = 'pnpm';
        else result.packageManager = 'npm';

        // Detect frameworks
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.react) result.frameworks.push('react');
        if (deps.vue) result.frameworks.push('vue');
        if (deps.angular) result.frameworks.push('angular');
        if (deps.express) result.frameworks.push('express');
        if (deps.next) result.frameworks.push('nextjs');
        if (deps.nest || deps['@nestjs/core']) result.frameworks.push('nestjs');
      }

      // Python detection
      else if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
        result.type = 'python';
        result.packageManager = 'pip';

        // Check for common frameworks in requirements.txt
        if (files.includes('requirements.txt')) {
          const requirements = await fs.readFile(path.join(projectPath, 'requirements.txt'), 'utf-8');
          if (requirements.includes('django')) result.frameworks.push('django');
          if (requirements.includes('flask')) result.frameworks.push('flask');
          if (requirements.includes('fastapi')) result.frameworks.push('fastapi');
        }
      }

      // Java detection
      else if (files.includes('pom.xml')) {
        result.type = 'java';
        result.packageManager = 'maven';
      } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
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
    } catch (error) {
      console.error('Error detecting project type:', error);
      return result;
    }
  }

  /**
   * Generate PRD from project structure
   */
  private async generatePRDFromProject(
    projectPath: string, 
    projectType: ProjectType,
    projectName?: string
  ): Promise<string> {
    const name = projectName || path.basename(projectPath);
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
  private async analyzeProjectStructure(projectPath: string, depth: number = 0, maxDepth: number = 3): Promise<string> {
    if (depth > maxDepth) return '';

    let structure = '';
    const indent = '  '.repeat(depth);

    try {
      const items = await fs.readdir(projectPath);
      
      for (const item of items) {
        // Skip common ignored directories
        if (['.git', 'node_modules', '.taskmaster', 'dist', 'build', '__pycache__'].includes(item)) {
          continue;
        }

        const itemPath = path.join(projectPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          structure += `${indent}- ${item}/\n`;
          structure += await this.analyzeProjectStructure(itemPath, depth + 1, maxDepth);
        } else if (stats.isFile()) {
          // Only include relevant files
          const ext = path.extname(item);
          if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.json', '.md'].includes(ext)) {
            structure += `${indent}- ${item}\n`;
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing structure:', error);
    }

    return structure;
  }

  /**
   * Simplify task data
   */
  private simplifyTask(task: TaskMasterTask): SimplifiedTask {
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
  private translateError(error: any): string {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Common error translations
    const translations: Record<string, string> = {
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
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearProjectCache(projectPath: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(projectPath)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const magentsTaskManager = new MagentsTaskManager();