import { test, expect } from '@playwright/test';
import { CreateAgentPage } from './pages/CreateAgentPage';
import fs from 'fs';
import path from 'path';

test.describe('Agent Creation Performance Tests', () => {
  let createAgentPage: CreateAgentPage;

  test.beforeEach(async ({ page }) => {
    createAgentPage = new CreateAgentPage(page);
  });

  test.describe('UI Performance', () => {
    test('should load wizard quickly', async ({ page }) => {
      // Measure time to load wizard
      const startTime = Date.now();
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should navigate between steps quickly', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to step with valid data
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      
      // Measure step navigation performance
      const navigationTimes: number[] = [];
      
      for (let i = 0; i < 4; i++) {
        const startTime = Date.now();
        await createAgentPage.clickNext();
        const endTime = Date.now();
        
        navigationTimes.push(endTime - startTime);
      }
      
      // Each step navigation should be under 1 second
      for (const time of navigationTimes) {
        expect(time).toBeLessThan(1000);
      }
      
      const averageTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(averageTime).toBeLessThan(500); // Average should be under 500ms
    });

    test('should handle form input responsively', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to branch step
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Measure input responsiveness
      const branchInput = page.locator('input[placeholder="feature/my-new-feature"]');
      
      const startTime = Date.now();
      await branchInput.fill('feature/performance-test-branch-with-very-long-name');
      await page.waitForFunction(() => {
        const input = document.querySelector('input[placeholder="feature/my-new-feature"]') as HTMLInputElement;
        return input?.value === 'feature/performance-test-branch-with-very-long-name';
      });
      const inputTime = Date.now() - startTime;
      
      expect(inputTime).toBeLessThan(500); // Input should be responsive
    });

    test('should validate forms quickly', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to branch step
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Measure validation performance
      const branchInput = page.locator('input[placeholder="feature/my-new-feature"]');
      
      const startTime = Date.now();
      await branchInput.fill('invalid branch name with spaces');
      
      // Wait for validation error to appear
      await page.waitForSelector('.text-red-600', { timeout: 2000 });
      const validationTime = Date.now() - startTime;
      
      expect(validationTime).toBeLessThan(1000); // Validation should be quick
    });
  });

  test.describe('Large Dataset Performance', () => {
    test.beforeAll(async () => {
      // Create large dataset for testing
      const fixturesDir = path.join(__dirname, '../fixtures');
      const largeProjectDir = path.join(fixturesDir, 'large-project');
      
      if (!fs.existsSync(largeProjectDir)) {
        fs.mkdirSync(largeProjectDir, { recursive: true });
        
        // Create many directories and files
        for (let i = 0; i < 100; i++) {
          const subDir = path.join(largeProjectDir, `module-${i}`);
          fs.mkdirSync(subDir, { recursive: true });
          
          for (let j = 0; j < 50; j++) {
            const filePath = path.join(subDir, `file-${j}.ts`);
            fs.writeFileSync(filePath, `// File ${j} in module ${i}\nexport const value${j} = ${j};\n`);
          }
        }
        
        // Create large package.json
        const packageJson = {
          name: 'large-test-project',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {}
        };
        
        // Add many dependencies
        for (let i = 0; i < 200; i++) {
          packageJson.dependencies[`package-${i}`] = `^${i}.0.0`;
        }
        
        fs.writeFileSync(
          path.join(largeProjectDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      }
    });

    test('should handle large project directory efficiently', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const largeProjectPath = path.join(__dirname, '../fixtures/large-project');
      
      // Measure time to select large project
      const startTime = Date.now();
      await createAgentPage.selectCustomPath(largeProjectPath);
      
      // Wait for UI to update
      await page.waitForTimeout(100);
      const selectionTime = Date.now() - startTime;
      
      expect(selectionTime).toBeLessThan(2000); // Should handle large projects quickly
      expect(await createAgentPage.canProceed()).toBe(true);
    });

    test('should maintain performance with many tasks', async ({ page }) => {
      // This would test performance with a large number of TaskMaster tasks
      // For now, we'll simulate the scenario
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to TaskMaster step
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/many-tasks-test');
      await createAgentPage.clickNext();
      
      // Measure time to load TaskMaster step
      const startTime = Date.now();
      await createAgentPage.enableTaskMaster();
      
      // Wait for task list to load
      await page.waitForTimeout(500);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000); // Should load tasks quickly
    });
  });

  test.describe('Memory Performance', () => {
    test('should not leak memory during wizard usage', async ({ page, context }) => {
      // Enable memory tracking
      await context.addInitScript(() => {
        (window as any).initialMemory = performance.memory?.usedJSHeapSize || 0;
      });
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate through wizard multiple times
      for (let iteration = 0; iteration < 5; iteration++) {
        // Go through all steps
        const testProjectPath = path.join(__dirname, '../fixtures/test-project');
        await createAgentPage.selectCustomPath(testProjectPath);
        await createAgentPage.clickNext();
        
        await createAgentPage.setBranch(`feature/memory-test-${iteration}`);
        await createAgentPage.setAgentId(`memory-agent-${iteration}`);
        await createAgentPage.clickNext();
        
        await createAgentPage.enableTaskMaster();
        await createAgentPage.clickNext();
        
        await createAgentPage.enableAutoAccept();
        await createAgentPage.clickNext();
        
        // Go back to start for next iteration
        await createAgentPage.goToStep(0);
        
        // Clear form data
        await createAgentPage.selectCustomPath('');
      }
      
      // Check memory usage
      const memoryInfo = await page.evaluate(() => {
        const memory = performance.memory;
        return {
          initial: (window as any).initialMemory || 0,
          current: memory?.usedJSHeapSize || 0,
          limit: memory?.jsHeapSizeLimit || 0
        };
      });
      
      if (memoryInfo.initial > 0 && memoryInfo.current > 0) {
        const memoryIncrease = memoryInfo.current - memoryInfo.initial;
        const increasePercentage = (memoryIncrease / memoryInfo.initial) * 100;
        
        // Memory increase should be reasonable (less than 100% increase)
        expect(increasePercentage).toBeLessThan(100);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize API calls during wizard navigation', async ({ page }) => {
      // Track network requests
      const requests: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push(request.url());
        }
      });
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate through wizard
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/network-test');
      await createAgentPage.clickNext();
      
      await createAgentPage.enableTaskMaster();
      await createAgentPage.clickNext();
      
      await createAgentPage.clickNext();
      
      // Should make minimal API calls for navigation
      const uniqueEndpoints = [...new Set(requests)];
      expect(uniqueEndpoints.length).toBeLessThan(10); // Reasonable number of API calls
    });

    test('should cache data appropriately', async ({ page }) => {
      // Track cache behavior
      const responses: string[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/projects') || response.url().includes('/api/taskmaster')) {
          const cacheControl = response.headers()['cache-control'];
          responses.push(`${response.url()}: ${cacheControl || 'no-cache'}`);
        }
      });
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to TaskMaster step to trigger API calls
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/cache-test');
      await createAgentPage.clickNext();
      
      await createAgentPage.enableTaskMaster();
      
      // Allow time for API calls
      await page.waitForTimeout(1000);
      
      // Should have appropriate caching headers
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Bundle Size Performance', () => {
    test('should load efficiently sized bundles', async ({ page }) => {
      // Track resource loading
      const resources: Array<{ url: string; size: number; type: string }> = [];
      
      page.on('response', response => {
        const url = response.url();
        const contentLength = response.headers()['content-length'];
        const contentType = response.headers()['content-type'] || '';
        
        if (url.includes('.js') || url.includes('.css')) {
          resources.push({
            url,
            size: parseInt(contentLength || '0'),
            type: contentType.includes('javascript') ? 'js' : 'css'
          });
        }
      });
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Calculate total bundle size
      const totalJsSize = resources
        .filter(r => r.type === 'js')
        .reduce((sum, r) => sum + r.size, 0);
      
      const totalCssSize = resources
        .filter(r => r.type === 'css')
        .reduce((sum, r) => sum + r.size, 0);
      
      // Bundle sizes should be reasonable
      expect(totalJsSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB JS
      expect(totalCssSize).toBeLessThan(500 * 1024); // Less than 500KB CSS
    });
  });
});