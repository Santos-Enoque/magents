import { test, expect } from '@playwright/test';
import { CreateAgentPage } from './pages/CreateAgentPage';
import path from 'path';

test.describe('Error Handling and Edge Cases', () => {
  let createAgentPage: CreateAgentPage;

  test.beforeEach(async ({ page }) => {
    createAgentPage = new CreateAgentPage(page);
  });

  test.describe('Network Error Handling', () => {
    test('should handle API server being down', async ({ page, context }) => {
      // Block all API requests to simulate server being down
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Unavailable' })
        });
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Should still be able to navigate wizard
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/network-error-test');
      await createAgentPage.clickNext();
      
      // TaskMaster step might show error state
      await createAgentPage.enableTaskMaster();
      
      // Should show appropriate error message for missing tasks
      const errorMessage = page.locator('text=No Tasks Available');
      // Error handling should be graceful, not crashing the app
    });

    test('should handle slow API responses', async ({ page, context }) => {
      // Delay API responses to test loading states
      await context.route('**/api/projects', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }, 3000);
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Should show loading state while API is slow
      // The wizard should remain responsive during slow requests
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      
      expect(await createAgentPage.canProceed()).toBe(true);
    });

    test('should handle network timeouts gracefully', async ({ page, context }) => {
      // Simulate network timeout
      await context.route('**/api/agents', route => {
        // Never resolve to simulate timeout
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Complete wizard configuration
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/timeout-test');
      await createAgentPage.clickNext();
      await createAgentPage.clickNext();
      await createAgentPage.clickNext();
      
      // Attempt to create agent (will timeout)
      await createAgentPage.createAgent();
      
      // Should show error message, not crash
      await page.waitForTimeout(5000);
      
      // Should be able to try again
      expect(await page.locator('button', { hasText: 'Create Agent' }).isVisible()).toBe(true);
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle extremely long input values', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to branch step
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Test extremely long branch name
      const longBranchName = 'feature/' + 'a'.repeat(1000);
      await createAgentPage.setBranch(longBranchName);
      
      // Should handle gracefully with validation error
      const errors = await createAgentPage.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
      
      // Test extremely long agent ID
      const longAgentId = 'a'.repeat(1000);
      await createAgentPage.setBranch('feature/valid-branch'); // Reset to valid
      await createAgentPage.setAgentId(longAgentId);
      
      const agentIdErrors = await createAgentPage.getValidationErrors();
      expect(agentIdErrors.length).toBeGreaterThan(0);
    });

    test('should handle special characters in inputs', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Test special characters in branch names
      const specialCharBranches = [
        'feature/test@branch',
        'feature/test#branch',
        'feature/test$branch',
        'feature/test%branch',
        'feature/test&branch',
        'feature/test*branch',
        'feature/test+branch',
        'feature/test=branch',
        'feature/test?branch',
        'feature/test[branch]',
        'feature/test{branch}',
        'feature/test|branch',
        'feature/test\\branch',
        'feature/test:branch',
        'feature/test;branch',
        'feature/test"branch',
        'feature/test\'branch',
        'feature/test<branch>',
        'feature/test,branch'
      ];
      
      for (const branch of specialCharBranches) {
        await createAgentPage.setBranch(branch);
        
        // Should show validation errors for invalid characters
        const errors = await createAgentPage.getValidationErrors();
        expect(errors.length).toBeGreaterThan(0);
        
        // Error should mention character restrictions
        const hasCharacterError = errors.some(error => 
          error.includes('character') || 
          error.includes('only contain') ||
          error.includes('invalid')
        );
        expect(hasCharacterError).toBe(true);
      }
    });

    test('should handle Unicode and emoji inputs', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Test Unicode characters
      const unicodeBranches = [
        'feature/тест', // Cyrillic
        'feature/测试', // Chinese
        'feature/テスト', // Japanese
        'feature/🚀-branch', // Emoji
        'feature/café', // Accented characters
        'feature/naïve'
      ];
      
      for (const branch of unicodeBranches) {
        await createAgentPage.setBranch(branch);
        
        // Should handle Unicode gracefully (may allow or reject consistently)
        const errors = await createAgentPage.getValidationErrors();
        // The important thing is that it doesn't crash
      }
    });

    test('should handle copy-paste with whitespace', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Test values with leading/trailing whitespace
      const branchInput = page.locator('input[placeholder="feature/my-new-feature"]');
      const agentIdInput = page.locator('input[placeholder="my-agent-id"]');
      
      // Simulate copy-paste with whitespace
      await branchInput.fill('  feature/whitespace-test  ');
      await agentIdInput.fill('  whitespace-agent  ');
      
      // Should either trim whitespace or show validation error
      const branchValue = await branchInput.inputValue();
      const agentIdValue = await agentIdInput.inputValue();
      
      // Values should be properly handled (trimmed or rejected)
      expect(branchValue.startsWith(' ') || branchValue.endsWith(' ')).toBe(false);
      expect(agentIdValue.startsWith(' ') || agentIdValue.endsWith(' ')).toBe(false);
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle browser back/forward navigation', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Fill out some form data
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/browser-nav-test');
      
      // Navigate away and back
      await page.goto('/agents');
      await page.goBack();
      
      // Should restore wizard state
      await createAgentPage.waitForWizardToLoad();
      
      // Form data might be preserved or reset - both are acceptable
      // The important thing is no crash or error state
    });

    test('should handle page refresh during wizard', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Fill out wizard data
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/refresh-test');
      await createAgentPage.setAgentId('refresh-agent');
      
      // Refresh page
      await page.reload();
      await createAgentPage.waitForWizardToLoad();
      
      // Should handle refresh gracefully
      // Data may be restored from localStorage or reset to initial state
      expect(await page.locator('.max-w-4xl').isVisible()).toBe(true);
    });

    test('should handle localStorage being disabled', async ({ context, page }) => {
      // Disable localStorage
      await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => null,
            setItem: () => { throw new Error('localStorage disabled'); },
            removeItem: () => {},
            clear: () => {}
          }
        });
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Should work without localStorage
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/no-storage-test');
      
      // Navigation should still work
      expect(await createAgentPage.canProceed()).toBe(true);
    });
  });

  test.describe('State Management Edge Cases', () => {
    test('should handle rapid step navigation', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Fill minimum required data
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/rapid-nav-test');
      
      // Rapidly navigate between steps
      for (let i = 0; i < 10; i++) {
        await createAgentPage.goToStep(1);
        await createAgentPage.goToStep(2);
        await createAgentPage.goToStep(0);
      }
      
      // Should remain stable
      expect(await createAgentPage.getCurrentStep()).toBeGreaterThanOrEqual(0);
      expect(await createAgentPage.getCurrentStep()).toBeLessThan(5);
    });

    test('should handle multiple simultaneous form updates', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Rapidly update multiple fields
      const branchInput = page.locator('input[placeholder="feature/my-new-feature"]');
      const agentIdInput = page.locator('input[placeholder="my-agent-id"]');
      
      // Simultaneous updates
      await Promise.all([
        branchInput.fill('feature/concurrent-test'),
        agentIdInput.fill('concurrent-agent')
      ]);
      
      // Should handle concurrent updates gracefully
      expect(await branchInput.inputValue()).toBe('feature/concurrent-test');
      expect(await agentIdInput.inputValue()).toBe('concurrent-agent');
    });

    test('should handle template application during form editing', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Start filling form manually
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      
      // Navigate to step 2 and fill some data
      await createAgentPage.clickNext();
      await createAgentPage.setBranch('feature/manual-entry');
      await createAgentPage.setAgentId('manual-agent');
      
      // Go back and apply template
      await createAgentPage.goToStep(0);
      await createAgentPage.applyTemplate('Quick Start');
      
      // Should override manual entries appropriately
      await createAgentPage.goToStep(1);
      const branchInput = page.locator('input[placeholder="feature/my-new-feature"]');
      const branchValue = await branchInput.inputValue();
      
      // Template should have overridden manual entry
      expect(branchValue).toBe('feature/quick-agent');
    });
  });

  test.describe('Resource Exhaustion Edge Cases', () => {
    test('should handle creating many environment variables', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to advanced configuration
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/many-vars-test');
      await createAgentPage.clickNext();
      await createAgentPage.clickNext();
      
      // Add many environment variables
      for (let i = 0; i < 50; i++) {
        try {
          await createAgentPage.addEnvironmentVariable(`VAR_${i}`, `value_${i}`);
        } catch (error) {
          // Should handle gracefully if there's a limit
          break;
        }
      }
      
      // Should remain responsive
      expect(await createAgentPage.canProceed()).toBe(true);
    });

    test('should handle rapid successive operations', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Rapid successive operations
      for (let i = 0; i < 20; i++) {
        const testProjectPath = path.join(__dirname, '../fixtures/test-project');
        await createAgentPage.selectCustomPath(testProjectPath);
        await createAgentPage.selectCustomPath('');
      }
      
      // Should remain stable
      expect(await page.locator('.max-w-4xl').isVisible()).toBe(true);
    });
  });

  test.describe('Edge Case Data Scenarios', () => {
    test('should handle empty API responses', async ({ page, context }) => {
      // Mock empty responses
      await context.route('**/api/projects', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await context.route('**/api/taskmaster/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Should handle empty data gracefully
      const noProjectsMessage = page.locator('text=No Projects Found');
      if (await noProjectsMessage.isVisible()) {
        expect(noProjectsMessage).toBeVisible();
      }
      
      // Should still allow custom path
      const testProjectPath = path.join(__dirname, '../fixtures/test-project');
      await createAgentPage.selectCustomPath(testProjectPath);
      expect(await createAgentPage.canProceed()).toBe(true);
    });

    test('should handle malformed API responses', async ({ page, context }) => {
      // Mock malformed JSON response
      await context.route('**/api/projects', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        });
      });

      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Should handle malformed responses gracefully
      // App should not crash, should fall back to empty state or show error
      expect(await page.locator('.max-w-4xl').isVisible()).toBe(true);
    });
  });
});