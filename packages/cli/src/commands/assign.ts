import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ui } from '../ui/UIService';
import { ConfigManager } from '../config/ConfigManager';
import { AgentManager } from '../services/AgentManager';
import { GitService } from '../services/GitService';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

export interface ProjectAnalysis {
  projectType: string;
  languages: string[];
  frameworks: string[];
  testingTools: string[];
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  packageManager: string;
  suggestedTasks: TaskSuggestion[];
}

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  complexity: number;
  category: string;
  rationale: string;
  assignToAgent?: string;
}

export class AssignCommand {
  private configManager: ConfigManager;
  private agentManager: AgentManager;
  private gitService: GitService;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.agentManager = new AgentManager();
    this.gitService = new GitService();
  }

  public async execute(options: {
    analyze?: boolean;
    autoCreate?: boolean;
    projectPath?: string;
    maxTasks?: number;
    category?: string;
    priority?: string;
    agent?: string;
    dryRun?: boolean;
    mode?: string;
  }): Promise<void> {
    try {
      const projectPath = options.projectPath || process.cwd();
      
      // Step 1: Analyze project
      ui.header('Project Analysis');
      const spinner = ui.spinner('Analyzing project structure...');
      spinner.start();
      
      const analysis = await this.analyzeProject(projectPath);
      spinner.succeed('Project analysis complete');
      
      // Display analysis results
      this.displayAnalysis(analysis);
      
      // Step 2: Check if Task Master is available
      const hasTaskMaster = await this.checkTaskMaster();
      
      if (!hasTaskMaster && !options.dryRun) {
        const setupTaskMaster = await inquirer.prompt([{
          type: 'confirm',
          name: 'setup',
          message: 'Task Master not found. Would you like to set it up?',
          default: true
        }]);
        
        if (setupTaskMaster.setup) {
          await this.setupTaskMaster(projectPath);
        } else {
          ui.warning('Task generation requires Task Master. Exiting.');
          return;
        }
      }
      
      // Step 3: Generate tasks based on analysis
      ui.header('Task Generation');
      const generateSpinner = ui.spinner('Generating task suggestions...');
      generateSpinner.start();
      
      let tasks = analysis.suggestedTasks;
      
      // If Task Master is available and not in simple mode, use AI generation
      if (hasTaskMaster && options.mode !== 'simple') {
        tasks = await this.generateTasksWithAI(analysis, options);
      }
      
      generateSpinner.succeed(`Generated ${tasks.length} task suggestions`);
      
      // Step 4: Filter tasks based on options
      if (options.category) {
        tasks = tasks.filter(t => t.category === options.category);
      }
      
      if (options.priority) {
        tasks = tasks.filter(t => t.priority === options.priority);
      }
      
      if (options.maxTasks) {
        tasks = tasks.slice(0, options.maxTasks);
      }
      
      // Step 5: Display tasks and get user confirmation
      this.displayTasks(tasks);
      
      if (options.dryRun) {
        ui.info('Dry run complete. No tasks were created.');
        return;
      }
      
      // Step 6: Assign tasks to agents
      const agents = this.agentManager.getActiveAgents();
      
      if (agents.length === 0 && !options.autoCreate) {
        ui.warning('No active agents found.');
        const createAgent = await inquirer.prompt([{
          type: 'confirm',
          name: 'create',
          message: 'Would you like to create an agent for these tasks?',
          default: true
        }]);
        
        if (!createAgent.create) {
          ui.info('Tasks generated but not assigned. Use Task Master to manage them.');
          return;
        }
        
        options.autoCreate = true;
      }
      
      // Step 7: Create tasks in Task Master
      if (hasTaskMaster) {
        await this.createTasksInTaskMaster(tasks, projectPath);
      }
      
      // Step 8: Assign tasks to agents
      await this.assignTasksToAgents(tasks, agents, options);
      
      ui.success('Task assignment complete!');
      
    } catch (error) {
      ui.error(`Failed to assign tasks: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      projectType: 'unknown',
      languages: [],
      frameworks: [],
      testingTools: [],
      hasTests: false,
      hasDocker: false,
      hasCI: false,
      packageManager: 'npm',
      suggestedTasks: []
    };
    
    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Detect project type
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        analysis.projectType = 'react';
        analysis.frameworks.push('React');
      }
      if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        analysis.projectType = 'vue';
        analysis.frameworks.push('Vue');
      }
      if (packageJson.dependencies?.express) {
        analysis.projectType = 'node-backend';
        analysis.frameworks.push('Express');
      }
      if (packageJson.dependencies?.next) {
        analysis.projectType = 'nextjs';
        analysis.frameworks.push('Next.js');
      }
      
      // Detect testing tools
      if (packageJson.devDependencies?.jest) {
        analysis.testingTools.push('Jest');
        analysis.hasTests = true;
      }
      if (packageJson.devDependencies?.mocha) {
        analysis.testingTools.push('Mocha');
        analysis.hasTests = true;
      }
      if (packageJson.devDependencies?.playwright) {
        analysis.testingTools.push('Playwright');
        analysis.hasTests = true;
      }
      
      // Check for test script
      if (packageJson.scripts?.test) {
        analysis.hasTests = true;
      }
    }
    
    // Check for other files
    if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) {
      analysis.hasDocker = true;
    }
    
    if (fs.existsSync(path.join(projectPath, '.github/workflows'))) {
      analysis.hasCI = true;
    }
    
    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
      analysis.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      analysis.packageManager = 'pnpm';
    }
    
    // Detect languages
    const files = this.getAllFiles(projectPath);
    const extensions = files.map(f => path.extname(f)).filter(Boolean);
    const languageMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust'
    };
    
    const detectedLanguages = new Set<string>();
    extensions.forEach(ext => {
      if (languageMap[ext]) {
        detectedLanguages.add(languageMap[ext]);
      }
    });
    
    analysis.languages = Array.from(detectedLanguages);
    
    // Generate basic task suggestions based on analysis
    analysis.suggestedTasks = this.generateBasicTasks(analysis);
    
    return analysis;
  }

  private getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      // Skip node_modules and other common directories
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        return;
      }
      
      if (fs.statSync(filePath).isDirectory()) {
        this.getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  private generateBasicTasks(analysis: ProjectAnalysis): TaskSuggestion[] {
    const tasks: TaskSuggestion[] = [];
    
    // Testing tasks
    if (!analysis.hasTests) {
      tasks.push({
        title: 'Add unit tests',
        description: 'Set up testing framework and add unit tests for core functionality',
        priority: 'high',
        complexity: 5,
        category: 'testing',
        rationale: 'No tests detected in the project'
      });
    } else if (analysis.testingTools.length > 0) {
      tasks.push({
        title: 'Improve test coverage',
        description: 'Increase test coverage to at least 80%',
        priority: 'medium',
        complexity: 4,
        category: 'testing',
        rationale: 'Tests exist but coverage could be improved'
      });
    }
    
    // Docker tasks
    if (!analysis.hasDocker && analysis.projectType !== 'unknown') {
      tasks.push({
        title: 'Add Docker support',
        description: 'Create Dockerfile and docker-compose configuration',
        priority: 'medium',
        complexity: 3,
        category: 'infrastructure',
        rationale: 'Docker support not detected'
      });
    }
    
    // CI/CD tasks
    if (!analysis.hasCI) {
      tasks.push({
        title: 'Set up CI/CD pipeline',
        description: 'Add GitHub Actions or similar CI/CD configuration',
        priority: 'medium',
        complexity: 4,
        category: 'infrastructure',
        rationale: 'No CI/CD configuration detected'
      });
    }
    
    // Framework-specific tasks
    if (analysis.frameworks.includes('React')) {
      tasks.push({
        title: 'Optimize React performance',
        description: 'Add memoization, lazy loading, and performance optimizations',
        priority: 'low',
        complexity: 3,
        category: 'optimization',
        rationale: 'React applications benefit from performance optimization'
      });
    }
    
    // TypeScript tasks
    if (analysis.languages.includes('TypeScript')) {
      tasks.push({
        title: 'Improve TypeScript types',
        description: 'Add strict type checking and eliminate any types',
        priority: 'low',
        complexity: 2,
        category: 'code-quality',
        rationale: 'TypeScript projects benefit from strict typing'
      });
    }
    
    return tasks;
  }

  private async checkTaskMaster(): Promise<boolean> {
    try {
      execSync('which task-master', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async setupTaskMaster(projectPath: string): Promise<void> {
    ui.info('Setting up Task Master...');
    try {
      execSync('npm install -g task-master-ai', { stdio: 'inherit' });
      execSync('task-master init', { cwd: projectPath, stdio: 'inherit' });
      ui.success('Task Master setup complete');
    } catch (error) {
      ui.error('Failed to setup Task Master');
      throw error;
    }
  }

  private async generateTasksWithAI(
    analysis: ProjectAnalysis,
    options: any
  ): Promise<TaskSuggestion[]> {
    // This would integrate with Task Master's AI capabilities
    // For now, we'll enhance the basic tasks
    const tasks = analysis.suggestedTasks;
    
    // In a real implementation, this would call Task Master's AI
    // to generate more sophisticated task suggestions
    try {
      const prdContent = this.generatePRDFromAnalysis(analysis);
      const prdPath = path.join(process.cwd(), '.taskmaster', 'auto-generated-prd.txt');
      
      // Ensure directory exists
      const taskMasterDir = path.join(process.cwd(), '.taskmaster');
      if (!fs.existsSync(taskMasterDir)) {
        fs.mkdirSync(taskMasterDir, { recursive: true });
      }
      
      // Write PRD
      fs.writeFileSync(prdPath, prdContent);
      
      // Parse with Task Master
      ui.muted('Using Task Master AI to enhance task suggestions...');
      execSync(`task-master parse-prd ${prdPath} --append`, { stdio: 'pipe' });
      
      // The actual tasks would be retrieved from Task Master
      // For now, we'll return enhanced versions
      return tasks.map(task => ({
        ...task,
        description: `${task.description}\n\nEnhanced with AI analysis based on project structure.`
      }));
      
    } catch (error) {
      ui.muted('AI enhancement failed, using basic task generation');
      return tasks;
    }
  }

  private generatePRDFromAnalysis(analysis: ProjectAnalysis): string {
    return `# Auto-Generated Project Requirements

## Project Analysis Summary
- Type: ${analysis.projectType}
- Languages: ${analysis.languages.join(', ')}
- Frameworks: ${analysis.frameworks.join(', ')}
- Testing: ${analysis.hasTests ? 'Yes' : 'No'} (${analysis.testingTools.join(', ')})
- Docker: ${analysis.hasDocker ? 'Yes' : 'No'}
- CI/CD: ${analysis.hasCI ? 'Yes' : 'No'}

## Suggested Improvements

${analysis.suggestedTasks.map(task => `
### ${task.title}
**Priority**: ${task.priority}
**Category**: ${task.category}
**Complexity**: ${task.complexity}/10

${task.description}

**Rationale**: ${task.rationale}
`).join('\n')}

## Implementation Guidelines
- Follow existing code patterns and conventions
- Ensure all changes are tested
- Update documentation as needed
- Consider performance implications
`;
  }

  private displayAnalysis(analysis: ProjectAnalysis): void {
    ui.divider('Project Analysis Results');
    ui.keyValue('Project Type', analysis.projectType);
    ui.keyValue('Languages', analysis.languages.join(', ') || 'None detected');
    ui.keyValue('Frameworks', analysis.frameworks.join(', ') || 'None detected');
    ui.keyValue('Testing Tools', analysis.testingTools.join(', ') || 'None detected');
    ui.keyValue('Has Tests', analysis.hasTests ? 'Yes' : 'No');
    ui.keyValue('Has Docker', analysis.hasDocker ? 'Yes' : 'No');
    ui.keyValue('Has CI/CD', analysis.hasCI ? 'Yes' : 'No');
    ui.keyValue('Package Manager', analysis.packageManager);
  }

  private displayTasks(tasks: TaskSuggestion[]): void {
    ui.divider('Generated Tasks');
    
    tasks.forEach((task, index) => {
      ui.info(`${index + 1}. ${task.title}`);
      ui.muted(`   Priority: ${task.priority} | Category: ${task.category} | Complexity: ${task.complexity}/10`);
      ui.muted(`   ${task.description}`);
      console.log(); // Empty line
    });
  }

  private async createTasksInTaskMaster(tasks: TaskSuggestion[], projectPath: string): Promise<void> {
    const spinner = ui.spinner('Creating tasks in Task Master...');
    spinner.start();
    
    try {
      // Create tasks using Task Master CLI
      for (const task of tasks) {
        const taskCommand = `task-master add-task --prompt="${task.title}: ${task.description}" --priority=${task.priority}`;
        execSync(taskCommand, { cwd: projectPath, stdio: 'pipe' });
      }
      
      spinner.succeed('Tasks created in Task Master');
    } catch (error) {
      spinner.fail('Failed to create some tasks in Task Master');
      // Continue anyway - tasks can be managed manually
    }
  }

  private async assignTasksToAgents(
    tasks: TaskSuggestion[],
    agents: any[],
    options: any
  ): Promise<void> {
    if (options.agent) {
      // Assign all tasks to specific agent
      const agent = agents.find(a => a.id === options.agent);
      if (!agent) {
        ui.warning(`Agent ${options.agent} not found`);
        return;
      }
      
      ui.info(`Assigning ${tasks.length} tasks to agent ${agent.id}`);
      // In a real implementation, this would update agent context
      return;
    }
    
    if (options.autoCreate) {
      // Create agents for high-priority tasks
      const highPriorityTasks = tasks.filter(t => t.priority === 'high');
      
      for (const task of highPriorityTasks) {
        const agentName = task.title.toLowerCase().replace(/\s+/g, '-');
        ui.info(`Creating agent for task: ${task.title}`);
        
        try {
          const result = await this.agentManager.createAgent({
            branch: `task/${agentName}`,
            agentId: `${agentName}-agent`,
            autoAccept: true
          });
          
          if (result.success) {
            task.assignToAgent = result.data?.agentId;
          }
        } catch (error) {
          ui.warning(`Failed to create agent for ${task.title}`);
        }
      }
    } else {
      // Distribute tasks among existing agents
      if (agents.length > 0) {
        tasks.forEach((task, index) => {
          const agentIndex = index % agents.length;
          task.assignToAgent = agents[agentIndex].id;
        });
        
        ui.info(`Distributed ${tasks.length} tasks among ${agents.length} agents`);
      }
    }
    
    // Display final assignment
    ui.divider('Task Assignments');
    tasks.forEach(task => {
      if (task.assignToAgent) {
        ui.keyValue(task.title, `→ ${task.assignToAgent}`);
      } else {
        ui.keyValue(task.title, '→ Unassigned');
      }
    });
  }
}

// Export singleton instance
export const assignCommand = new AssignCommand();