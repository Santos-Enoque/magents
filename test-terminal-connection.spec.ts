import { test } from '@playwright/test';

test.describe('Terminal Connection Debug', () => {
  test('debug connection issue', async ({ page }) => {
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
    
    // Click on Terminal button in sidebar
    console.log('\n=== Clicking Terminal button ===');
    await page.click('button:has-text("Terminal")');
    
    // Wait for any console messages
    await page.waitForTimeout(5000);
    
    // Check current state
    const terminalPaneVisible = await page.locator('.bg-background-card:has-text("zsh")').isVisible();
    console.log('\nTerminal pane visible:', terminalPaneVisible);
    
    // Check for terminal content
    const xtermExists = await page.locator('.xterm').count() > 0;
    console.log('XTerm exists:', xtermExists);
    
    if (xtermExists) {
      const terminalContent = await page.locator('.xterm-screen').innerText();
      console.log('Terminal content:', terminalContent.substring(0, 200));
    }
    
    // Take screenshot
    await page.screenshot({ path: 'terminal-connection-debug.png', fullPage: true });
    
    // Keep browser open for manual inspection
    await page.pause();
  });
});