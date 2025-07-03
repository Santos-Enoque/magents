import { test, expect } from '@playwright/test';

test.describe('Magents Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the correct port where the dashboard is running
    await page.goto('http://localhost:3001');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the unified dashboard', async ({ page }) => {
    // Check if the main dashboard title is visible
    await expect(page.locator('h1', { hasText: 'Development Dashboard' })).toBeVisible();
    
    // Check if the subtitle is visible
    await expect(page.locator('text=Manage your multi-agent development workflow')).toBeVisible();
  });

  test('should have connection status indicator', async ({ page }) => {
    // Look for connection status
    await expect(page.locator('text=Connected').or(page.locator('text=Disconnected'))).toBeVisible();
  });

  test('should have view mode toggle buttons', async ({ page }) => {
    // Check for grid/list view toggle
    const gridButton = page.locator('button[title*="Grid view"]');
    const listButton = page.locator('button[title*="List view"]');
    
    await expect(gridButton).toBeVisible();
    await expect(listButton).toBeVisible();
  });

  test('should have keyboard shortcuts help button', async ({ page }) => {
    // Check for help button
    const helpButton = page.locator('button[title="Keyboard shortcuts (Ctrl+?)"]');
    await expect(helpButton).toBeVisible();
  });

  test('should show collapsible sections', async ({ page }) => {
    // Check for main sections
    await expect(page.locator('text=System Overview')).toBeVisible();
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=Active Agents')).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    // Check for quick action buttons
    await expect(page.locator('text=Create Agent')).toBeVisible();
    await expect(page.locator('text=Assign Tasks')).toBeVisible();
    await expect(page.locator('text=Terminal')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should show keyboard shortcuts when help button is clicked', async ({ page }) => {
    // Click the help button
    const helpButton = page.locator('button[title="Keyboard shortcuts (Ctrl+?)"]');
    await helpButton.click();
    
    // Check if shortcuts modal appears
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
    await expect(page.locator('text=Create Agent')).toBeVisible();
    await expect(page.locator('text=Ctrl+N')).toBeVisible();
    
    // Close the modal
    const closeButton = page.locator('button').filter({ hasText: /×/ }).first();
    await closeButton.click();
    
    // Modal should be gone
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible();
  });

  test('should toggle view modes', async ({ page }) => {
    // Click list view button
    const listButton = page.locator('button[title*="List view"]');
    await listButton.click();
    
    // The button should be selected (you may need to adjust this selector based on your styling)
    // await expect(listButton).toHaveClass(/active|selected/);
    
    // Click grid view button
    const gridButton = page.locator('button[title*="Grid view"]');
    await gridButton.click();
    
    // The button should be selected
    // await expect(gridButton).toHaveClass(/active|selected/);
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+? to open help
    await page.keyboard.press('Control+Shift+?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
    
    // Test Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible();
  });

  test('should display live metrics section', async ({ page }) => {
    // Check for live metrics
    await expect(page.locator('text=Live System Metrics')).toBeVisible();
    
    // Look for metric cards (they should exist even if showing mock data)
    const metricCards = page.locator('.bg-background-card').filter({ hasText: /CPU|Memory|Network|Uptime/ });
    await expect(metricCards).toHaveCount(4);
  });

  test('should show agent status if no agents exist', async ({ page }) => {
    // Look for the "no agents" state
    await expect(page.locator('text=No agents found').or(page.locator('text=Create Your First Agent'))).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if the dashboard is still visible and functional
    await expect(page.locator('h1', { hasText: 'Development Dashboard' })).toBeVisible();
    
    // Quick actions should still be accessible
    await expect(page.locator('text=Create Agent')).toBeVisible();
  });
});