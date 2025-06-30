const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Agent Creation Form Implementation', () => {
  const webPackagePath = path.join(__dirname, '../packages/web');
  const componentsPath = path.join(webPackagePath, 'src/components');
  const pagesPath = path.join(webPackagePath, 'src/pages');
  
  beforeAll(() => {
    // Ensure the web package exists
    if (!fs.existsSync(webPackagePath)) {
      throw new Error('Web package not found');
    }
  });

  test('AgentCreateForm component exists with proper structure', () => {
    const formPath = path.join(componentsPath, 'AgentCreateForm.tsx');
    expect(fs.existsSync(formPath)).toBe(true);
    
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for required imports
    expect(formContent).toMatch(/import.*React.*useState.*from ['"]react['"]/);
    expect(formContent).toMatch(/import.*CreateAgentOptions.*from ['"]@magents\/shared['"]/);
    expect(formContent).toMatch(/import.*lucide-react/);
    
    // Check for component export
    expect(formContent).toMatch(/export const AgentCreateForm/);
    
    // Check for form fields
    expect(formContent).toMatch(/agentId/);
    expect(formContent).toMatch(/branch/);
    expect(formContent).toMatch(/autoAccept/);
    expect(formContent).toMatch(/useDocker/);
    expect(formContent).toMatch(/projectId/);
    
    // Check for TypeScript interfaces
    expect(formContent).toMatch(/interface AgentFormData/);
    expect(formContent).toMatch(/interface FormErrors/);
    expect(formContent).toMatch(/interface AgentCreateFormProps/);
  });

  test('Form validation logic is implemented', () => {
    const formPath = path.join(componentsPath, 'AgentCreateForm.tsx');
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for validation rules
    expect(formContent).toMatch(/VALIDATION_RULES/);
    expect(formContent).toMatch(/required.*true/);
    expect(formContent).toMatch(/minLength/);
    expect(formContent).toMatch(/maxLength/);
    expect(formContent).toMatch(/pattern/);
    
    // Check for validation functions
    expect(formContent).toMatch(/validateAgentId/);
    expect(formContent).toMatch(/validateBranch/);
    expect(formContent).toMatch(/validateForm/);
    
    // Check for regex patterns
    expect(formContent).toMatch(/\/\^.*\$\//); // Regex pattern
    
    // Check for Git branch validation
    expect(formContent).toMatch(/cannot contain spaces/);
    expect(formContent).toMatch(/reserved Git names/);
    expect(formContent).toMatch(/consecutive dots or slashes/);
  });

  test('Form has proper state management', () => {
    const formPath = path.join(componentsPath, 'AgentCreateForm.tsx');
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for state hooks
    expect(formContent).toMatch(/useState/);
    expect(formContent).toMatch(/AgentFormData/);
    expect(formContent).toMatch(/FormErrors/);
    expect(formContent).toMatch(/isSubmitting/);
    
    // Check for controlled components
    expect(formContent).toMatch(/value.*formData\.agentId/);
    expect(formContent).toMatch(/value.*formData\.branch/);
    expect(formContent).toMatch(/checked.*formData\.autoAccept/);
    expect(formContent).toMatch(/checked.*formData\.useDocker/);
    
    // Check for onChange handlers
    expect(formContent).toMatch(/onChange.*handleInputChange/);
    expect(formContent).toMatch(/onSubmit.*handleSubmit/);
  });

  test('CreateAgent page exists and uses the form', () => {
    const pagePath = path.join(pagesPath, 'CreateAgent.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
    
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    
    // Check for imports
    expect(pageContent).toMatch(/import.*AgentCreateForm.*from/);
    expect(pageContent).toMatch(/import.*apiService.*from/);
    expect(pageContent).toMatch(/import.*toast.*from.*react-toastify/);
    expect(pageContent).toMatch(/import.*useNavigate.*from.*react-router-dom/);
    expect(pageContent).toMatch(/import.*useQueryClient.*from.*@tanstack\/react-query/);
    
    // Check for form usage
    expect(pageContent).toMatch(/<AgentCreateForm/);
    expect(pageContent).toMatch(/onSubmit.*handleCreateAgent/);
    expect(pageContent).toMatch(/onCancel.*handleCancel/);
  });

  test('API service has createAgent with proper types', () => {
    const apiPath = path.join(webPackagePath, 'src/services/api.ts');
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Check for CreateAgentOptions import
    expect(apiContent).toMatch(/import.*CreateAgentOptions.*from.*@magents\/shared/);
    
    // Check for createAgent method
    expect(apiContent).toMatch(/async createAgent/);
    expect(apiContent).toMatch(/CreateAgentOptions/);
    expect(apiContent).toMatch(/method.*POST/);
    expect(apiContent).toMatch(/\/api\/agents/);
    
    // Check for error handling
    expect(apiContent).toMatch(/try/);
    expect(apiContent).toMatch(/catch/);
    expect(apiContent).toMatch(/Creating agent/);
    expect(apiContent).toMatch(/Failed to create agent/);
    expect(apiContent).toMatch(/already exists/);
    expect(apiContent).toMatch(/Invalid branch name/);
    expect(apiContent).toMatch(/Network error/);
  });

  test('Form has loading states and user feedback', () => {
    const formPath = path.join(componentsPath, 'AgentCreateForm.tsx');
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for loading states
    expect(formContent).toMatch(/isLoading/);
    expect(formContent).toMatch(/isSubmitting/);
    expect(formContent).toMatch(/isFormDisabled/);
    expect(formContent).toMatch(/disabled.*isFormDisabled/);
    
    // Check for loading indicators
    expect(formContent).toMatch(/Loader2/);
    expect(formContent).toMatch(/animate-spin/);
    expect(formContent).toMatch(/Creating Agent\.\.\./);
    
    // Check for error display
    expect(formContent).toMatch(/errors\.general/);
    expect(formContent).toMatch(/errors\.agentId/);
    expect(formContent).toMatch(/errors\.branch/);
    expect(formContent).toMatch(/bg-red-50.*border-red-200/);
  });

  test('Form has submit button validation', () => {
    const formPath = path.join(componentsPath, 'AgentCreateForm.tsx');
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for canSubmit logic
    expect(formContent).toMatch(/canSubmit/);
    expect(formContent).toMatch(/disabled.*!canSubmit/);
    expect(formContent).toMatch(/hasValidationErrors/);
    
    // Check for form validation on submit
    expect(formContent).toMatch(/handleSubmit.*async/);
    expect(formContent).toMatch(/validateForm.*formData/);
    expect(formContent).toMatch(/Object\.keys.*validationErrors/);
  });

  test('Toast notifications are configured', () => {
    const pagePath = path.join(pagesPath, 'CreateAgent.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    
    // Check for toast usage
    expect(pageContent).toMatch(/toast\.success/);
    expect(pageContent).toMatch(/toast\.error/);
    expect(pageContent).toMatch(/Agent.*created successfully/);
    expect(pageContent).toMatch(/Failed to create agent/);
    
    // Check for toast options
    expect(pageContent).toMatch(/position.*top-right/);
    expect(pageContent).toMatch(/autoClose/);
    expect(pageContent).toMatch(/pauseOnHover/);
  });

  test('Navigation is properly implemented', () => {
    const pagePath = path.join(pagesPath, 'CreateAgent.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    
    // Check for navigation after success
    expect(pageContent).toMatch(/navigate.*\/agents/);
    expect(pageContent).toMatch(/highlightAgentId.*createdAgent\.id/);
    
    // Check for cancel navigation
    expect(pageContent).toMatch(/handleCancel/);
    expect(pageContent).toMatch(/navigate.*['"]\/*agents['"]/); // navigate('/agents')
    
    // Check for back button
    expect(pageContent).toMatch(/ArrowLeft/);
    expect(pageContent).toMatch(/Back to Agents/);
  });

  test('Form includes helpful information', () => {
    const pagePath = path.join(pagesPath, 'CreateAgent.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    
    // Check for information sections
    expect(pageContent).toMatch(/What happens when you create an agent/);
    expect(pageContent).toMatch(/Git worktree is created/);
    expect(pageContent).toMatch(/tmux session is started/);
    expect(pageContent).toMatch(/Claude Code is launched/);
    
    // Check for tips section
    expect(pageContent).toMatch(/Tips for creating agents/);
    expect(pageContent).toMatch(/descriptive agent IDs/);
    expect(pageContent).toMatch(/feature branches/);
  });

  test('App routing includes create agent route', () => {
    const appPath = path.join(webPackagePath, 'src/App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Check for CreateAgent import
    expect(appContent).toMatch(/import.*CreateAgent.*from.*pages\/CreateAgent/);
    
    // Check for route definition
    expect(appContent).toMatch(/Route.*path.*\/agents\/new.*element.*<CreateAgent/);
  });

  test('AgentDashboard links to create agent page', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for navigate import
    expect(dashboardContent).toMatch(/import.*useNavigate.*from.*react-router-dom/);
    
    // Check for navigation to create page
    expect(dashboardContent).toMatch(/navigate.*\/agents\/new/);
    expect(dashboardContent).toMatch(/Create Agent/);
  });

  console.log('✅ All Agent Creation Form tests passed!');
});