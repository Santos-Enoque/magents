import { MagentsTaskManager } from '../magentsTaskManager';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// This is an integration test - it requires Task Master to be installed
describe('MagentsTaskManager Integration Tests', () => {
  const testProjectPath = path.join(__dirname, 'test-project');
  let manager: MagentsTaskManager;

  beforeAll(async () => {
    // Create test project directory
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create a simple Node.js project
    const packageJson = {
      name: 'test-integration-project',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0',
        react: '^18.0.0'
      }
    };
    await fs.writeFile(
      path.join(testProjectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create some source files
    await fs.mkdir(path.join(testProjectPath, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'index.js'),
      'console.log("Hello World");'
    );

    manager = new MagentsTaskManager();
  });

  afterAll(async () => {
    // Clean up
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Real Task Master Integration', () => {
    it('should quick start a project', async () => {
      // Check if task-master is installed
      try {
        execSync('which task-master', { stdio: 'ignore' });
      } catch {
        console.log('Skipping integration test - Task Master not installed');
        return;
      }

      const result = await manager.quickStart({
        projectPath: testProjectPath,
        projectName: 'Test Integration Project',
        autoDetectType: true
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Task Master initialized successfully');

      // Verify files were created
      const taskMasterDir = path.join(testProjectPath, '.taskmaster');
      const dirExists = await fs.access(taskMasterDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      // Verify PRD was generated
      const prdPath = path.join(taskMasterDir, 'docs', 'auto-generated-prd.txt');
      const prdExists = await fs.access(prdPath).then(() => true).catch(() => false);
      expect(prdExists).toBe(true);

      if (prdExists) {
        const prdContent = await fs.readFile(prdPath, 'utf-8');
        expect(prdContent).toContain('Product Requirements Document');
        expect(prdContent).toContain('node project using npm');
        expect(prdContent).toContain('express, react');
      }
    });

    it('should get simplified tasks', async () => {
      try {
        execSync('which task-master', { stdio: 'ignore' });
      } catch {
        console.log('Skipping integration test - Task Master not installed');
        return;
      }

      const tasks = await manager.getSimplifiedTasks(testProjectPath);
      expect(Array.isArray(tasks)).toBe(true);
      
      // Should have generated some tasks from the PRD
      if (tasks.length > 0) {
        const task = tasks[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('isSubtask');
      }
    });

    it('should detect project type correctly', async () => {
      const projectType = await (manager as any).detectProjectType(testProjectPath);
      
      expect(projectType).toEqual({
        type: 'node',
        packageManager: 'npm',
        frameworks: expect.arrayContaining(['express', 'react'])
      });
    });
  });
});