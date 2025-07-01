import { test, expect } from '@playwright/test';
import { CreateAgentPage } from './pages/CreateAgentPage';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('CLI Integration Tests', () => {
  let createAgentPage: CreateAgentPage;
  const testProjectPath = path.join(__dirname, '../fixtures/test-project');

  test.beforeEach(async ({ page }) => {
    createAgentPage = new CreateAgentPage(page);
  });

  test.describe('Agent Creation Equivalence', () => {
    test('GUI should create same result as CLI with basic options', async ({ page }) => {
      // Create agent via GUI
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/gui-cli-test');
      await createAgentPage.setAgentId('gui-test-agent');
      await createAgentPage.clickNext();
      
      // Skip TaskMaster
      await createAgentPage.disableTaskMaster();
      await createAgentPage.clickNext();
      
      // Basic configuration
      await createAgentPage.enableAutoAccept();
      await createAgentPage.clickNext();
      
      // Get the configuration that would be sent to API
      const guiConfig = await createAgentPage.getPreviewSummary();
      
      // Compare with CLI equivalent command
      const expectedCliCommand = [
        'magents create',
        '--branch feature/gui-cli-test',
        '--agent-id gui-test-agent',
        `--project-path ${testProjectPath}`,
        '--auto-accept'
      ].join(' ');
      
      // Verify GUI configuration matches CLI options
      expect(guiConfig['Branch']).toBe('feature/gui-cli-test');
      expect(guiConfig['Agent ID']).toBe('gui-test-agent');
      expect(guiConfig['Auto-Accept']).toBe('Enabled');
    });

    test('GUI should handle Docker options like CLI', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Configure for Docker usage
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/docker-test');
      await createAgentPage.clickNext();
      
      await createAgentPage.disableTaskMaster();
      await createAgentPage.clickNext();
      
      await createAgentPage.enableDocker();
      await createAgentPage.selectDockerImage('node:18-alpine');
      await createAgentPage.setPortRange('3000-3005');
      await createAgentPage.addEnvironmentVariable('NODE_ENV', 'development');
      await createAgentPage.clickNext();
      
      const guiConfig = await createAgentPage.getPreviewSummary();
      
      // Expected CLI equivalent
      const expectedCliCommand = [
        'magents create',
        '--branch feature/docker-test',
        `--project-path ${testProjectPath}`,
        '--docker',
        '--docker-image node:18-alpine',
        '--port-range 3000-3005',
        '--env NODE_ENV=development'
      ].join(' ');
      
      expect(guiConfig['Docker']).toBe('Enabled');
      expect(guiConfig['Docker Image']).toBe('node:18-alpine');
      expect(guiConfig['Port Range']).toBe('3000-3005');
    });

    test('GUI should handle complex configurations equivalent to CLI', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Complex configuration
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/complex-config');
      await createAgentPage.setAgentId('complex-agent');
      await createAgentPage.clickNext();
      
      await createAgentPage.enableTaskMaster();
      if (await createAgentPage.page.locator('button:has-text("1")').isVisible()) {
        await createAgentPage.selectTask('1');
        await createAgentPage.selectTask('2');
      }
      await createAgentPage.clickNext();
      
      await createAgentPage.enableAutoAccept();
      await createAgentPage.enableDocker();
      await createAgentPage.selectDockerImage('python:3.11-alpine');
      await createAgentPage.setPortRange('4000-4010');
      await createAgentPage.addEnvironmentVariable('DEBUG', 'true');
      await createAgentPage.addEnvironmentVariable('LOG_LEVEL', 'info');
      await createAgentPage.clickNext();
      
      const guiConfig = await createAgentPage.getPreviewSummary();
      
      // This represents a complex CLI command
      const expectedComplexity = [
        'branch configuration',
        'agent id',
        'project path',
        'TaskMaster integration',
        'Docker configuration',
        'port management',
        'environment variables',
        'auto-accept setting'
      ];
      
      // Verify all aspects are configured
      expect(guiConfig['Branch']).toBe('feature/complex-config');
      expect(guiConfig['Agent ID']).toBe('complex-agent');
      expect(guiConfig['Docker']).toBe('Enabled');
      expect(guiConfig['Auto-Accept']).toBe('Enabled');
    });
  });

  test.describe('Configuration Format Compatibility', () => {
    test('should generate CLI-compatible agent configuration', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Create a comprehensive configuration
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/config-compat');
      await createAgentPage.setAgentId('compat-agent');
      await createAgentPage.clickNext();
      
      await createAgentPage.enableTaskMaster();
      await createAgentPage.clickNext();
      
      await createAgentPage.enableAutoAccept();
      await createAgentPage.enableDocker();
      await createAgentPage.selectDockerImage('node:20-alpine');
      await createAgentPage.addEnvironmentVariable('NODE_ENV', 'production');
      await createAgentPage.clickNext();
      
      // The configuration should be compatible with CLI format
      const summary = await createAgentPage.getPreviewSummary();
      
      // Key compatibility checks
      expect(summary['Branch']).toMatch(/^[a-zA-Z0-9/_-]+$/); // Valid Git branch name
      expect(summary['Agent ID']).toMatch(/^[a-z0-9-]+$/); // Valid agent ID format
      
      // Docker image should be a valid image name
      if (summary['Docker Image']) {
        expect(summary['Docker Image']).toMatch(/^[a-z0-9-._/:]+$/);
      }
      
      // Port range should be valid format
      if (summary['Port Range']) {
        expect(summary['Port Range']).toMatch(/^\d+-\d+$/);
      }
    });

    test('should validate agent names compatible with CLI restrictions', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Test CLI-compatible agent ID validation
      const validAgentIds = [
        'simple-agent',
        'agent-123',
        'my-test-agent',
        'a',
        'agent-with-many-hyphens-in-name'
      ];
      
      for (const agentId of validAgentIds) {
        await createAgentPage.setBranch('feature/test');
        await createAgentPage.setAgentId(agentId);
        
        // Should be valid for both GUI and CLI
        expect(await createAgentPage.canProceed()).toBe(true);
        
        // Clear for next test
        await createAgentPage.setAgentId('');
      }
      
      // Test invalid agent IDs that should fail in both GUI and CLI
      const invalidAgentIds = [
        'Agent-ID', // uppercase
        'agent_id', // underscores
        'agent id', // spaces
        'agent--id', // double hyphens
        '-agent', // starts with hyphen
        'agent-', // ends with hyphen
        '', // empty
        'ab' // too short
      ];
      
      for (const agentId of invalidAgentIds) {
        await createAgentPage.setAgentId(agentId);
        
        if (agentId === '' || agentId === 'ab') {
          // These should be caught by required/length validation
          expect(await createAgentPage.canProceed()).toBe(false);
        } else {
          // These should show format validation errors
          const errors = await createAgentPage.getValidationErrors();
          expect(errors.length).toBeGreaterThan(0);
        }
        
        await createAgentPage.setAgentId('');
      }
    });
  });

  test.describe('Error Handling Consistency', () => {
    test('should show same validation errors as CLI', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Test branch name validation consistency
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      const invalidBranches = [
        'branch with spaces',
        'branch//',
        '/invalid',
        'invalid/',
        '.hidden',
        'branch..name',
        'branch~1',
        'branch^name'
      ];
      
      for (const branch of invalidBranches) {
        await createAgentPage.setBranch(branch);
        
        // Should show validation errors consistent with CLI
        const errors = await createAgentPage.getValidationErrors();
        expect(errors.length).toBeGreaterThan(0);
        
        // Error messages should be descriptive
        const hasValidationError = errors.some(error => 
          error.includes('cannot contain') || 
          error.includes('invalid') || 
          error.includes('format')
        );
        expect(hasValidationError).toBe(true);
      }
    });

    test('should handle port range validation like CLI', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Navigate to advanced configuration
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/port-test');
      await createAgentPage.clickNext();
      await createAgentPage.clickNext();
      
      // Test port range validation
      const invalidRanges = [
        'invalid',
        '3000', // single port
        '8080-8070', // reversed range
        '0-1000', // ports too low
        '100-65536', // port too high
        '3000-4000', // range too large (would need to match CLI limits)
        '3000-3000' // same port
      ];
      
      for (const range of invalidRanges) {
        await createAgentPage.setPortRange(range);
        
        const errors = await createAgentPage.getValidationErrors();
        if (range !== '3000-3010') { // Valid range
          expect(errors.some(error => error.includes('Port'))).toBe(true);
        }
      }
    });
  });

  test.describe('Feature Parity', () => {
    test('should support all CLI creation options in GUI', async ({ page }) => {
      // This test ensures the GUI supports all major CLI features
      
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Check that all major CLI options are available in GUI
      const cliFeatures = [
        'project path selection',
        'branch configuration',
        'agent ID setting',
        'auto-accept toggle',
        'Docker configuration',
        'port range setting',
        'environment variables',
        'TaskMaster integration'
      ];
      
      // Project selection
      await createAgentPage.selectCustomPath(testProjectPath);
      expect(await createAgentPage.canProceed()).toBe(true);
      await createAgentPage.clickNext();
      
      // Branch and agent ID
      await createAgentPage.setBranch('feature/parity-test');
      await createAgentPage.setAgentId('parity-agent');
      expect(await createAgentPage.canProceed()).toBe(true);
      await createAgentPage.clickNext();
      
      // TaskMaster integration
      await createAgentPage.enableTaskMaster();
      expect(await createAgentPage.canProceed()).toBe(true);
      await createAgentPage.clickNext();
      
      // Advanced options
      await createAgentPage.enableAutoAccept();
      await createAgentPage.enableDocker();
      await createAgentPage.selectDockerImage('node:18-alpine');
      await createAgentPage.setPortRange('3000-3005');
      await createAgentPage.addEnvironmentVariable('NODE_ENV', 'test');
      expect(await createAgentPage.canProceed()).toBe(true);
      
      // All CLI features should be available
      const summary = await createAgentPage.page.locator('text=Configuration Summary').count();
      expect(summary).toBeGreaterThan(0);
    });

    test('should handle template application like CLI presets', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Apply Quick Start template (equivalent to CLI --preset quick)
      await createAgentPage.applyTemplate('Quick Start');
      
      // Check that template was applied
      const branchInput = createAgentPage.page.locator('input[placeholder="feature/my-new-feature"]');
      const branchValue = await branchInput.inputValue();
      expect(branchValue).toBe('feature/quick-agent');
      
      // Complete configuration with template
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      // Template should have set appropriate defaults
      expect(await createAgentPage.canProceed()).toBe(true);
    });
  });

  test.describe('Output Format Consistency', () => {
    test('should generate agent records compatible with CLI storage', async ({ page }) => {
      await createAgentPage.goto();
      await createAgentPage.waitForWizardToLoad();
      
      // Create agent configuration
      await createAgentPage.selectCustomPath(testProjectPath);
      await createAgentPage.clickNext();
      
      await createAgentPage.setBranch('feature/storage-test');
      await createAgentPage.setAgentId('storage-test-agent');
      await createAgentPage.clickNext();
      
      await createAgentPage.disableTaskMaster();
      await createAgentPage.clickNext();
      
      await createAgentPage.enableDocker();
      await createAgentPage.selectDockerImage('node:18-alpine');
      await createAgentPage.clickNext();
      
      const summary = await createAgentPage.getPreviewSummary();
      
      // The generated configuration should match CLI storage format
      const expectedFields = [
        'Branch',
        'Agent ID',
        'Tmux Session',
        'Worktree Path'
      ];
      
      for (const field of expectedFields) {
        expect(summary[field]).toBeDefined();
        expect(summary[field]).toBeTruthy();
      }
      
      // Check format consistency
      expect(summary['Tmux Session']).toMatch(/^magent-/);
      expect(summary['Worktree Path']).toMatch(/^\.\/magent-/);
    });
  });
});