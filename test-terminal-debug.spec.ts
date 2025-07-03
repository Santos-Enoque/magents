import { test, expect } from '@playwright/test';

test.describe('Terminal Debug', () => {
  test('debug terminal WebSocket connection', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log('Browser console:', msg.type(), msg.text());
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error);
    });
    
    // Monitor WebSocket connections
    let wsConnections = 0;
    page.on('websocket', ws => {
      wsConnections++;
      console.log(`WebSocket ${wsConnections} opened:`, ws.url());
      
      ws.on('framereceived', ({ payload }) => {
        const data = payload.toString();
        console.log(`WS ${wsConnections} received:`, data.substring(0, 200));
      });
      
      ws.on('framesent', ({ payload }) => {
        const data = payload.toString();
        console.log(`WS ${wsConnections} sent:`, data.substring(0, 200));
      });
      
      ws.on('close', () => {
        console.log(`WebSocket ${wsConnections} closed`);
      });
    });
    
    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-1-initial.png' });
    
    // Click on Terminal button in sidebar
    console.log('Clicking Terminal button...');
    await page.click('button:has-text("Terminal")');
    
    // Wait a bit for terminal to initialize
    await page.waitForTimeout(3000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'debug-2-terminal-clicked.png' });
    
    // Check if terminal pane exists
    const terminalPaneExists = await page.locator('.bg-background-card').filter({ hasText: 'zsh' }).count() > 0;
    console.log('Terminal pane exists:', terminalPaneExists);
    
    // Check for XTerm element
    const xtermExists = await page.locator('.xterm').count() > 0;
    console.log('XTerm element exists:', xtermExists);
    
    // Check for connection message
    const terminalText = await page.locator('.xterm-screen').textContent() || '';
    console.log('Terminal text:', terminalText);
    
    // Check WebSocket namespaces in browser
    await page.evaluate(() => {
      console.log('Window location:', window.location.href);
      console.log('Checking for socket.io...');
      // @ts-ignore
      if (window.io) {
        console.log('Socket.io found');
      } else {
        console.log('Socket.io NOT found');
      }
    });
    
    // Wait for potential connection
    await page.waitForTimeout(5000);
    
    // Final screenshot
    await page.screenshot({ path: 'debug-3-final.png', fullPage: true });
    
    // Keep browser open for debugging
    await page.pause();
  });
});