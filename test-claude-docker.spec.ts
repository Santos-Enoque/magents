import { test, expect } from '@playwright/test';

test.describe('Claude in Docker', () => {
  test('verify Claude works in Docker container', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    
    // Wait for agents to load
    await page.waitForTimeout(3000);
    
    // Find the new test agent
    const attachButton = page.locator('button:has-text("Attach")').first();
    await attachButton.click();
    
    // Wait for terminal to connect
    await page.waitForTimeout(3000);
    
    // Check terminal exists
    const terminalExists = await page.locator('.xterm').count() > 0;
    expect(terminalExists).toBe(true);
    
    // Type claude --version command
    await page.keyboard.type('claude --version');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check terminal content
    const terminalContent = await page.locator('.xterm-screen').innerText();
    console.log('Terminal content:', terminalContent);
    
    // Should contain Claude version
    expect(terminalContent).toContain('Claude Code');
    
    // Take screenshot
    await page.screenshot({ path: 'claude-docker-test.png', fullPage: true });
    
    console.log('✅ Claude is working properly in Docker container!');
  });
});