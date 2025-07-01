import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class TestHelpers {
  static async waitForElementWithRetry(
    page: Page, 
    selector: string, 
    options?: { timeout?: number; retries?: number }
  ) {
    const { timeout = 5000, retries = 3 } = options || {};
    
    for (let i = 0; i < retries; i++) {
      try {
        await page.locator(selector).waitFor({ timeout });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await page.waitForTimeout(1000);
      }
    }
  }

  static async takeScreenshotOnFailure(page: Page, testName: string) {
    const screenshotPath = path.join(__dirname, '../screenshots', `${testName}-failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  static async measurePageLoadTime(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  static async measureElementRenderTime(
    page: Page, 
    triggerAction: () => Promise<void>, 
    selector: string
  ): Promise<number> {
    const startTime = Date.now();
    await triggerAction();
    await page.locator(selector).waitFor();
    return Date.now() - startTime;
  }

  static async getMemoryUsage(page: Page): Promise<{ heap: number; total: number }> {
    return await page.evaluate(() => {
      const memory = (performance as any).memory;
      return {
        heap: memory?.usedJSHeapSize || 0,
        total: memory?.totalJSHeapSize || 0
      };
    });
  }

  static async simulateSlowNetwork(page: Page) {
    await page.context().route('**/*', route => {
      setTimeout(() => route.continue(), Math.random() * 2000);
    });
  }

  static async simulateNetworkError(page: Page, urlPattern: string) {
    await page.context().route(urlPattern, route => {
      route.abort('failed');
    });
  }

  static async mockApiResponse(
    page: Page, 
    endpoint: string, 
    response: any, 
    status: number = 200
  ) {
    await page.context().route(`**/${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static async createTestProject(name: string): Promise<string> {
    const projectPath = path.join(__dirname, '../fixtures', name);
    
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    
    fs.mkdirSync(projectPath, { recursive: true });
    
    // Initialize git repository
    try {
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: projectPath, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: projectPath, stdio: 'pipe' });
      
      // Create package.json
      const packageJson = {
        name,
        version: '1.0.0',
        description: 'Test project for E2E testing',
        scripts: {
          test: 'echo "Error: no test specified" && exit 1'
        }
      };
      
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      
      // Create README
      fs.writeFileSync(
        path.join(projectPath, 'README.md'),
        `# ${name}\n\nThis is a test project for E2E testing.`
      );
      
      // Initial commit
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' });
      
    } catch (error) {
      console.warn('Failed to initialize git repository:', error);
    }
    
    return projectPath;
  }

  static async createTaskMasterConfig(projectPath: string, tasks: any[]) {
    const taskMasterDir = path.join(projectPath, '.taskmaster');
    fs.mkdirSync(taskMasterDir, { recursive: true });
    
    const tasksData = {};
    tasks.forEach((task, index) => {
      tasksData[task.id || (index + 1).toString()] = {
        id: task.id || (index + 1).toString(),
        title: task.title || `Test Task ${index + 1}`,
        description: task.description || `Description for test task ${index + 1}`,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        dependencies: task.dependencies || [],
        ...task
      };
    });
    
    fs.writeFileSync(
      path.join(taskMasterDir, 'tasks.json'),
      JSON.stringify({ tasks: tasksData }, null, 2)
    );
    
    const config = {
      models: {
        main: 'claude-3-5-sonnet-20241022',
        research: 'perplexity-llama-3.1-sonar-large-128k-online',
        fallback: 'gpt-4o-mini'
      }
    };
    
    fs.writeFileSync(
      path.join(taskMasterDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  static async cleanupTestProjects() {
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  }

  static async validateFormData(page: Page, expectedData: Record<string, string>) {
    for (const [field, expectedValue] of Object.entries(expectedData)) {
      const input = page.locator(`input[name="${field}"], input[placeholder*="${field}"]`).first();
      if (await input.isVisible()) {
        const actualValue = await input.inputValue();
        expect(actualValue).toBe(expectedValue);
      }
    }
  }

  static async fillFormData(page: Page, formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = page.locator(`input[name="${field}"], input[placeholder*="${field}"]`).first();
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  static async getAllInputValues(page: Page): Promise<Record<string, string>> {
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();
    const values: Record<string, string> = {};
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || `input-${i}`;
      const value = await input.inputValue();
      values[name] = value;
    }
    
    return values;
  }

  static async waitForApiCall(page: Page, endpoint: string, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`API call to ${endpoint} timed out after ${timeout}ms`));
      }, timeout);

      page.on('response', response => {
        if (response.url().includes(endpoint)) {
          clearTimeout(timer);
          response.json().then(resolve).catch(reject);
        }
      });
    });
  }

  static async interceptApiCall(
    page: Page, 
    endpoint: string, 
    callback: (request: any) => any
  ) {
    await page.context().route(`**/${endpoint}`, route => {
      const response = callback(route.request());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static generateRandomString(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateValidBranchName(): string {
    const prefixes = ['feature', 'bugfix', 'hotfix', 'release'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = this.generateRandomString(8);
    return `${prefix}/${suffix}`;
  }

  static generateValidAgentId(): string {
    return `agent-${this.generateRandomString(6)}`;
  }

  static async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('All retries failed');
  }

  static async logTestStep(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] TEST STEP: ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  static async assertEventuallyTrue(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

export const createTestData = {
  project: (overrides?: any) => ({
    id: TestHelpers.generateRandomString(),
    name: `Test Project ${TestHelpers.generateRandomString(4)}`,
    path: `/test/project/${TestHelpers.generateRandomString()}`,
    description: 'A test project for E2E testing',
    status: 'ACTIVE',
    agents: [],
    tags: ['test', 'e2e'],
    ...overrides
  }),

  task: (overrides?: any) => ({
    id: TestHelpers.generateRandomString(),
    title: `Test Task ${TestHelpers.generateRandomString(4)}`,
    description: 'A test task for E2E testing',
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    ...overrides
  }),

  agentConfig: (overrides?: any) => ({
    branch: TestHelpers.generateValidBranchName(),
    agentId: TestHelpers.generateValidAgentId(),
    projectPath: `/test/project/${TestHelpers.generateRandomString()}`,
    autoAccept: false,
    useDocker: false,
    taskMasterEnabled: false,
    selectedTasks: [],
    ...overrides
  })
};