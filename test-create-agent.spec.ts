import { test, expect } from '@playwright/test';

test.describe('Create Agent Debug', () => {
  test('debug agent creation flow', async ({ page }) => {
    // Enable all console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[${type}] ${text}`);
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error);
    });

    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click Create Agent button
    console.log('\n=== Clicking Create Agent button ===');
    await page.click('button:has-text("Create Agent")');
    
    // Wait for navigation
    await page.waitForURL('**/agents/new');
    console.log('Navigated to:', page.url());
    
    // First, let's set up a project path since it's required
    console.log('\n=== Setting up project path ===');
    
    // Click "Show Custom Path" if needed
    const showCustomPath = page.locator('button:has-text("Show Custom Path")');
    if (await showCustomPath.isVisible()) {
      await showCustomPath.click();
      await page.waitForTimeout(500);
    }
    
    // Fill in the custom path
    const pathInput = page.locator('input[placeholder*="path"]');
    await pathInput.fill('/Users/santossafrao/Development/personal/magents');
    
    // Wait a moment for validation
    await page.waitForTimeout(1000);
    
    // Now click Quick Start template
    console.log('\n=== Selecting Quick Start template ===');
    await page.click('text=Quick Start');
    
    // Wait for the template to apply
    await page.waitForTimeout(1000);
    
    // Now try to click Next
    const nextButton = page.locator('button:has-text("Next")');
    console.log('Next button enabled?', await nextButton.isEnabled());
    
    if (await nextButton.isEnabled()) {
      console.log('Clicking Next...');
      await nextButton.click();
      
      // Continue through the wizard steps
      await page.waitForTimeout(1000);
      
      // Keep clicking Next until we reach Create
      while (true) {
        const createButton = page.locator('button:has-text("Create Agent")');
        if (await createButton.isVisible()) {
          console.log('\n=== Found Create Agent button, clicking... ===');
          await createButton.click();
          break;
        }
        
        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
          console.log('Clicking Next...');
          await nextBtn.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
    }
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check final URL
    console.log('\n=== Final URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'agent-creation-debug.png', fullPage: true });
    
    // Check for error messages
    const errorElement = await page.locator('.text-red-600, .text-status-error, [role="alert"]').first();
    if (await errorElement.count() > 0) {
      const errorText = await errorElement.textContent();
      console.log('Error found:', errorText);
    }
    
    // Keep browser open for manual inspection
    await page.pause();
  });
});