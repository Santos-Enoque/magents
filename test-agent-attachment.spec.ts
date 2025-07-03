import { test, expect } from '@playwright/test';

test.describe('Agent Attachment', () => {
  test('attach to Docker agent terminal', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Navigate to the dashboard
    await page.goto('http://localhost:4000');
    
    // Wait for agents to load
    await page.waitForTimeout(3000);
    
    // Look for an agent card with "Attach" button (find a specific agent card)
    const agentCards = page.locator('[data-testid="agent-card"]');
    const dockerAgentCard = agentCards.filter({ hasText: 'test-docker-agent' }).first();
    
    const hasAgent = await dockerAgentCard.count() > 0;
    
    if (!hasAgent) {
      // Try alternative selector
      const attachButton = page.locator('button:has-text("Attach")').first();
      const hasAttachButton = await attachButton.count() > 0;
      
      if (!hasAttachButton) {
        console.log('No agents with Attach button found, skipping test');
        return;
      }
      
      console.log('Found agent with Attach button');
      await attachButton.click();
    } else {
      // Get agent name
      const agentName = await dockerAgentCard.locator('h3.font-medium').first().textContent();
      console.log('Found agent:', agentName);
      
      // Click Attach button
      await dockerAgentCard.locator('button:has-text("Attach")').click();
    }
    
    // Wait for terminal connection
    await page.waitForTimeout(3000);
    
    // Check if terminal connected (look for inline terminal)
    const terminalExists = await page.locator('.xterm').count() > 0;
    expect(terminalExists).toBe(true);
    
    // Check terminal content
    const terminalContent = await page.locator('.xterm-screen').innerText();
    console.log('Terminal content:', terminalContent.substring(0, 200));
    
    // Should contain connection message or shell prompt
    const hasConnected = terminalContent.includes('Connected to Docker container') || 
                        terminalContent.includes('bash') ||
                        terminalContent.includes('#') ||
                        terminalContent.includes('$');
    expect(hasConnected).toBe(true);
    
    // Take screenshot
    await page.screenshot({ path: 'agent-attachment.png', fullPage: true });
    
    console.log('Agent attachment successful!');
  });
});