import { test, expect } from '@playwright/test';

test.describe('Terminal Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    
    // Wait for the page to load
    await page.waitForSelector('.bg-background');
  });

  test('should open terminal pane when clicking Terminal in sidebar', async ({ page }) => {
    // Click on Terminal button in sidebar
    await page.click('button:has-text("Terminal")');
    
    // Wait for terminal pane to appear
    await page.waitForSelector('.bg-background-card:has-text("Terminal")', { timeout: 5000 });
    
    // Check if terminal pane is visible (the one with the resize handle)
    const terminalPane = page.locator('.bg-background-card').filter({ hasText: 'zsh' });
    await expect(terminalPane).toBeVisible();
    
    // Check for terminal content area
    const terminalContent = page.locator('.xterm');
    await expect(terminalContent).toBeVisible();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'terminal-opened.png', fullPage: true });
  });

  test('should connect to system terminal and show prompt', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error));
    
    // Check WebSocket connections
    page.on('websocket', ws => {
      console.log('WebSocket opened:', ws.url());
      ws.on('framereceived', ({ payload }) => console.log('WS received:', payload.toString().substring(0, 100)));
      ws.on('framesent', ({ payload }) => console.log('WS sent:', payload.toString().substring(0, 100)));
    });
    
    // Click on Terminal button
    await page.click('button:has-text("Terminal")');
    
    // Wait for terminal to load
    await page.waitForTimeout(2000);
    
    // Check for terminal connection messages
    const terminalOutput = await page.locator('.xterm-screen').textContent();
    console.log('Terminal output:', terminalOutput);
    
    // Take screenshot
    await page.screenshot({ path: 'terminal-connected.png', fullPage: true });
    
    // Try typing a command
    await page.keyboard.type('echo "Hello from Playwright"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'terminal-command.png', fullPage: true });
  });

  test('should resize terminal pane', async ({ page }) => {
    // Open terminal
    await page.click('button:has-text("Terminal")');
    await page.waitForSelector('.bg-background-card:has-text("Terminal")');
    
    // Get initial height
    const terminalPane = page.locator('.bg-background-card').filter({ hasText: 'Terminal' });
    const initialBox = await terminalPane.boundingBox();
    console.log('Initial height:', initialBox?.height);
    
    // Find resize handle
    const resizeHandle = page.locator('.cursor-row-resize').first();
    
    // Drag to resize
    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(0, -100); // Move up to increase height
    await page.mouse.up();
    
    // Check new height
    const newBox = await terminalPane.boundingBox();
    console.log('New height:', newBox?.height);
    
    // Take screenshot
    await page.screenshot({ path: 'terminal-resized.png', fullPage: true });
  });

  test('should minimize and restore terminal', async ({ page }) => {
    // Open terminal
    await page.click('button:has-text("Terminal")');
    await page.waitForSelector('.bg-background-card:has-text("Terminal")');
    
    // Click minimize button
    await page.click('button[title="Minimize"]');
    await page.waitForTimeout(500);
    
    // Check if minimized
    const terminalContent = page.locator('.xterm');
    await expect(terminalContent).not.toBeVisible();
    
    await page.screenshot({ path: 'terminal-minimized.png', fullPage: true });
    
    // Click maximize button
    await page.click('button[title="Maximize"]');
    await page.waitForTimeout(500);
    
    // Check if restored
    await expect(terminalContent).toBeVisible();
    
    await page.screenshot({ path: 'terminal-restored.png', fullPage: true });
  });
});