import { test, expect } from '@playwright/test';

test.describe('Agent Creation Bug Fixes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully create an agent using the dashboard wizard', async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // 1. Click Create Agent button from dashboard
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // 2. Select Simple mode first (should be default)
    await expect(page.locator('button:has-text("Simple Mode")')).toBeVisible();
    await page.click('button:has-text("Simple Mode")');
    
    // 3. Click Next to go to project selection
    await page.click('button:has-text("Next")');
    
    // 4. Set up custom project path (testing the fix for directory path handling)
    const showCustomPathButton = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPathButton.isVisible()) {
      await showCustomPathButton.click();
    }
    
    // Use the magents root directory as test path
    const projectPath = '/Users/santossafrao/Development/personal/magents';
    const pathInput = page.locator('input[placeholder*="path"]');
    await pathInput.fill(projectPath);
    
    // 5. Wait for path validation (testing the fix for validation API)
    await page.waitForTimeout(2000);
    
    // Verify that validation shows Git repo detected
    await expect(page.locator('text=Git repository detected')).toBeVisible();
    
    // Verify that no alert about file uploads appears (fix for file upload alert)
    const errorAlerts = page.locator('[role="alert"], .toast-error');
    await expect(errorAlerts).toHaveCount(0);
    
    // 6. Continue to next step
    await page.click('button:has-text("Next")');
    
    // 7. Configure agent details
    const agentIdInput = page.locator('input[placeholder*="agent"]');
    if (await agentIdInput.isVisible()) {
      await agentIdInput.fill('test-agent-' + Date.now());
    }
    
    // 8. Proceed through any additional steps
    let attempts = 0;
    while (attempts < 5) {
      const nextButton = page.locator('button:has-text("Next")');
      const createButton = page.locator('button:has-text("Create Agent")');
      
      if (await createButton.isVisible() && await createButton.isEnabled()) {
        // Final step - create the agent
        await createButton.click();
        break;
      } else if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
      attempts++;
    }
    
    // 9. Wait for agent creation to complete
    await page.waitForTimeout(3000);
    
    // 10. Verify successful creation
    // Should either navigate back to dashboard or show success message
    const successIndicators = [
      page.locator('text=Agent created successfully'),
      page.locator('text=Successfully created'),
      page.locator('text=Agent is running'),
      page.locator('h1:has-text("Development Dashboard")') // Back to dashboard
    ];
    
    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible()) {
        successFound = true;
        break;
      }
    }
    
    expect(successFound).toBe(true);
  });

  test('should show full system paths in directory selection', async ({ page }) => {
    // Navigate to agent creation
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // Go to project selection step
    await page.click('button:has-text("Next")');
    
    // Show custom path input
    const showCustomPathButton = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPathButton.isVisible()) {
      await showCustomPathButton.click();
    }
    
    // Check that placeholder shows full system path (fix verification)
    const pathInput = page.locator('input[placeholder*="path"]');
    const placeholder = await pathInput.getAttribute('placeholder');
    
    // Should contain full path, not just relative path
    expect(placeholder).toContain('/Users');
    expect(placeholder).not.toBe('/project_name');
  });

  test('should validate Git and TaskMaster repositories correctly', async ({ page }) => {
    // Navigate to agent creation
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // Go to project selection step
    await page.click('button:has-text("Next")');
    
    // Show custom path input
    const showCustomPathButton = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPathButton.isVisible()) {
      await showCustomPathButton.click();
    }
    
    // Test with the magents directory (known Git repo with TaskMaster)
    const pathInput = page.locator('input[placeholder*="path"]');
    await pathInput.fill('/Users/santossafrao/Development/personal/magents');
    
    // Wait for validation
    await page.waitForTimeout(2000);
    
    // Should show both Git and TaskMaster detected (testing the API fix)
    await expect(page.locator('text=Git repository detected')).toBeVisible();
    await expect(page.locator('text=TaskMaster')).toBeVisible();
    
    // Should not show "not a git or tmux repo" error
    await expect(page.locator('text=Not a Git repository')).not.toBeVisible();
  });

  test('should not show file upload alerts when selecting paths', async ({ page }) => {
    // Navigate to agent creation
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // Go to project selection step  
    await page.click('button:has-text("Next")');
    
    // Show custom path input
    const showCustomPathButton = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPathButton.isVisible()) {
      await showCustomPathButton.click();
    }
    
    // Fill in a path
    const pathInput = page.locator('input[placeholder*="path"]');
    await pathInput.fill('/Users/santossafrao/Development/personal/magents');
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Should not see any upload-related alerts or toasts
    const uploadAlerts = page.locator('text*=upload, text*=file');
    await expect(uploadAlerts).toHaveCount(0);
    
    // Should not see the specific alert mentioned by user
    await expect(page.locator('text=we will upload files')).not.toBeVisible();
  });

  test('should allow all complexity modes without restrictions', async ({ page }) => {
    // Navigate to agent creation
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // Verify all three modes are available (testing the free mode requirement)
    await expect(page.locator('button:has-text("Simple Mode")')).toBeVisible();
    await expect(page.locator('button:has-text("Standard Mode")')).toBeVisible(); 
    await expect(page.locator('button:has-text("Advanced Mode")')).toBeVisible();
    
    // Try clicking each mode to ensure they're all enabled
    await page.click('button:has-text("Standard Mode")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Advanced Mode")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Simple Mode")');
    
    // Should not see any "Premium" or "Paid" labels
    await expect(page.locator('text*=Premium, text*=Paid, text*=Upgrade')).toHaveCount(0);
    
    // All modes should be selectable
    const modeButtons = page.locator('button').filter({ hasText: /Simple Mode|Standard Mode|Advanced Mode/ });
    for (let i = 0; i < await modeButtons.count(); i++) {
      await expect(modeButtons.nth(i)).toBeEnabled();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to agent creation
    await page.click('button:has-text("Create Agent")');
    await page.waitForURL('**/agents/new');
    
    // Intercept validation API call and simulate network error
    await page.route('**/api/projects/validate*', route => {
      route.abort('failed');
    });
    
    // Go to project selection step
    await page.click('button:has-text("Next")');
    
    // Show custom path input
    const showCustomPathButton = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPathButton.isVisible()) {
      await showCustomPathButton.click();
    }
    
    // Fill in a path - should trigger validation
    const pathInput = page.locator('input[placeholder*="path"]');
    await pathInput.fill('/some/test/path');
    
    // Wait for validation attempt
    await page.waitForTimeout(2000);
    
    // Should show appropriate error message, not crash
    await expect(page.locator('text=Failed to connect to server')).toBeVisible();
  });
});