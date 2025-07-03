import { test, expect } from '@playwright/test';

test.describe('Terminal Simple Test', () => {
  test('terminal connection', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    
    // Wait for the sidebar to be visible
    await page.waitForSelector('nav');
    
    // Click on Terminal button in sidebar
    await page.click('button:has-text("Terminal")');
    
    // Wait for terminal pane to appear (looks for the terminal header with "zsh")
    await page.waitForSelector('.bg-background-card:has-text("zsh")', { timeout: 5000 });
    
    // Check if XTerm element exists
    const xtermExists = await page.locator('.xterm').count() > 0;
    expect(xtermExists).toBe(true);
    
    // Wait a bit for connection to establish
    await page.waitForTimeout(3000);
    
    // Check terminal content
    const terminalText = await page.locator('.xterm-screen').textContent() || '';
    console.log('Terminal content:', terminalText);
    
    // Should not contain "Connecting to system terminal" after connection
    expect(terminalText).not.toContain('Connecting to system terminal');
    
    // Should contain "System terminal connected" or shell prompt
    const hasConnected = terminalText.includes('System terminal connected') || 
                        terminalText.includes('$') || 
                        terminalText.includes('~');
    expect(hasConnected).toBe(true);
  });
});