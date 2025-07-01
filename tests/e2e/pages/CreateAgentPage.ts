import { Page, Locator, expect } from '@playwright/test';

export class CreateAgentPage {
  readonly page: Page;
  readonly wizardContainer: Locator;
  readonly stepIndicators: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly progressTracker: Locator;

  constructor(page: Page) {
    this.page = page;
    this.wizardContainer = page.locator('.max-w-4xl');
    this.stepIndicators = page.locator('[role="button"]').filter({ hasText: /Step \d/ });
    this.backButton = page.locator('button', { hasText: /Previous|Cancel/ });
    this.nextButton = page.locator('button', { hasText: /Next|Create Agent/ });
    this.createButton = page.locator('button', { hasText: 'Create Agent' });
    this.cancelButton = page.locator('button', { hasText: 'Cancel' });
    this.progressTracker = page.locator('[data-testid="agent-progress"]');
  }

  async goto() {
    await this.page.goto('/agents/new');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForWizardToLoad() {
    await expect(this.wizardContainer).toBeVisible();
    await expect(this.stepIndicators.first()).toBeVisible();
  }

  async getCurrentStep(): Promise<number> {
    const activeStep = this.page.locator('.bg-blue-600').first();
    const stepText = await activeStep.textContent();
    const match = stepText?.match(/Step (\d+)/);
    return match ? parseInt(match[1]) - 1 : 0;
  }

  async goToStep(stepIndex: number) {
    const stepButton = this.stepIndicators.nth(stepIndex);
    await stepButton.click();
    await this.page.waitForTimeout(500); // Allow animation to complete
  }

  async clickNext() {
    await this.nextButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickBack() {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async createAgent() {
    await this.createButton.click();
  }

  async waitForProgressTracker() {
    await expect(this.progressTracker).toBeVisible({ timeout: 10000 });
  }

  async waitForCreationComplete() {
    // Wait for progress to reach 100%
    await this.page.waitForFunction(() => {
      const progressElement = document.querySelector('[data-testid="progress-percentage"]');
      return progressElement?.textContent?.includes('100%');
    }, { timeout: 60000 });
  }

  async getValidationErrors(): Promise<string[]> {
    const errorElements = this.page.locator('.text-red-600');
    const errors = await errorElements.allTextContents();
    return errors.filter(error => error.trim().length > 0);
  }

  async isStepValid(stepIndex: number): Promise<boolean> {
    const stepIndicator = this.stepIndicators.nth(stepIndex);
    const classes = await stepIndicator.getAttribute('class');
    return classes?.includes('bg-green-600') || classes?.includes('bg-blue-600') || false;
  }

  async canProceed(): Promise<boolean> {
    const nextButton = this.nextButton;
    return !(await nextButton.getAttribute('disabled'));
  }

  async getStepTitle(): Promise<string> {
    const title = this.page.locator('h2').first();
    return await title.textContent() || '';
  }

  async getStepDescription(): Promise<string> {
    const description = this.page.locator('p').first();
    return await description.textContent() || '';
  }

  // Step-specific methods
  async selectProject(projectName: string) {
    const projectButton = this.page.locator('button', { hasText: projectName });
    await projectButton.click();
  }

  async selectCustomPath(path: string) {
    const customPathButton = this.page.locator('button', { hasText: 'New Project Path' });
    await customPathButton.click();
    
    const pathInput = this.page.locator('input[placeholder="/path/to/your/project"]');
    await pathInput.fill(path);
  }

  async setBranch(branchName: string) {
    const branchInput = this.page.locator('input[placeholder="feature/my-new-feature"]');
    await branchInput.fill(branchName);
  }

  async setAgentId(agentId: string) {
    const agentIdInput = this.page.locator('input[placeholder="my-agent-id"]');
    await agentIdInput.fill(agentId);
  }

  async generateAgentIdFromBranch() {
    const generateButton = this.page.locator('button', { hasText: 'Generate from branch' });
    await generateButton.click();
  }

  async enableTaskMaster() {
    const toggleButton = this.page.locator('[role="switch"]').first();
    const isEnabled = await toggleButton.getAttribute('aria-checked');
    if (isEnabled !== 'true') {
      await toggleButton.click();
    }
  }

  async disableTaskMaster() {
    const toggleButton = this.page.locator('[role="switch"]').first();
    const isEnabled = await toggleButton.getAttribute('aria-checked');
    if (isEnabled === 'true') {
      await toggleButton.click();
    }
  }

  async selectTask(taskId: string) {
    const taskButton = this.page.locator(`button:has-text("${taskId}")`);
    await taskButton.click();
  }

  async selectAllTasks() {
    const selectAllButton = this.page.locator('button', { hasText: 'Select All' });
    await selectAllButton.click();
  }

  async enableAutoAccept() {
    const autoAcceptToggle = this.page.locator('[role="switch"]').first();
    const isEnabled = await autoAcceptToggle.getAttribute('aria-checked');
    if (isEnabled !== 'true') {
      await autoAcceptToggle.click();
    }
  }

  async enableDocker() {
    const dockerToggle = this.page.locator('[role="switch"]').nth(1);
    const isEnabled = await dockerToggle.getAttribute('aria-checked');
    if (isEnabled !== 'true') {
      await dockerToggle.click();
    }
  }

  async selectDockerImage(imageName: string) {
    const dockerSelect = this.page.locator('select').first();
    await dockerSelect.selectOption(imageName);
  }

  async setPortRange(range: string) {
    const portInput = this.page.locator('input[placeholder="3000-3010"]');
    await portInput.fill(range);
  }

  async addEnvironmentVariable(key: string, value: string) {
    const keyInput = this.page.locator('input[placeholder="Variable name"]');
    const valueInput = this.page.locator('input[placeholder="Variable value"]');
    const addButton = this.page.locator('button', { hasText: 'Add Variable' });
    
    await keyInput.fill(key);
    await valueInput.fill(value);
    await addButton.click();
  }

  async getPreviewSummary(): Promise<Record<string, string>> {
    const summary: Record<string, string> = {};
    
    // Extract configuration details from preview step
    const configItems = this.page.locator('.flex.justify-between');
    const count = await configItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = configItems.nth(i);
      const spans = item.locator('span');
      const key = await spans.first().textContent();
      const value = await spans.last().textContent();
      
      if (key && value) {
        summary[key.replace(':', '')] = value;
      }
    }
    
    return summary;
  }

  async applyTemplate(templateName: string) {
    const templateButton = this.page.locator('button', { hasText: templateName });
    await templateButton.click();
  }
}