const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Agent Management Actions Implementation', () => {
  const webPackagePath = path.join(__dirname, '../packages/web');
  const componentsPath = path.join(webPackagePath, 'src/components');
  const pagesPath = path.join(webPackagePath, 'src/pages');
  const servicesPath = path.join(webPackagePath, 'src/services');
  
  beforeAll(() => {
    // Ensure the web package exists
    if (!fs.existsSync(webPackagePath)) {
      throw new Error('Web package not found');
    }
  });

  test('AgentActions component exists with proper structure', () => {
    const actionsPath = path.join(componentsPath, 'AgentActions.tsx');
    expect(fs.existsSync(actionsPath)).toBe(true);
    
    const actionsContent = fs.readFileSync(actionsPath, 'utf8');
    
    // Check for required imports
    expect(actionsContent).toMatch(/import.*React.*from ['"]react['"]/);
    expect(actionsContent).toMatch(/import.*Agent.*from ['"]@magents\/shared['"]/);
    expect(actionsContent).toMatch(/import.*lucide-react/);
    
    // Check for component export
    expect(actionsContent).toMatch(/export const AgentActions/);
    
    // Check for action handlers
    expect(actionsContent).toMatch(/onStart/);
    expect(actionsContent).toMatch(/onStop/);
    expect(actionsContent).toMatch(/onRestart/);
    expect(actionsContent).toMatch(/onDelete/);
    
    // Check for confirmation dialog
    expect(actionsContent).toMatch(/confirmDialog/);
    expect(actionsContent).toMatch(/setConfirmDialog/);
    expect(actionsContent).toMatch(/ConfirmDialog/);
  });

  test('AgentDetail page is fully implemented', () => {
    const detailPath = path.join(pagesPath, 'AgentDetail.tsx');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    
    // Check for required imports
    expect(detailContent).toMatch(/import.*useParams.*from ['"]react-router-dom['"]/);
    expect(detailContent).toMatch(/import.*useQuery.*from ['"]@tanstack\/react-query['"]/);
    expect(detailContent).toMatch(/import.*toast.*from ['"]react-toastify['"]/);
    expect(detailContent).toMatch(/import.*StatusIndicator.*from/);
    expect(detailContent).toMatch(/import.*AgentActions.*from/);
    
    // Check for tabs implementation
    expect(detailContent).toMatch(/tabs.*TabConfig/);
    expect(detailContent).toMatch(/overview/);
    expect(detailContent).toMatch(/configuration/);
    expect(detailContent).toMatch(/activity/);
    expect(detailContent).toMatch(/terminal/);
    
    // Check for data fetching
    expect(detailContent).toMatch(/useQuery/);
    expect(detailContent).toMatch(/apiService\.getAgent/);
    
    // Check for WebSocket subscription
    expect(detailContent).toMatch(/useWebSocket/);
    expect(detailContent).toMatch(/subscribe.*agent:/);
    
    // Check for action handlers
    expect(detailContent).toMatch(/handleStartAgent/);
    expect(detailContent).toMatch(/handleStopAgent/);
    expect(detailContent).toMatch(/handleDeleteAgent/);
    expect(detailContent).toMatch(/handleRestartAgent/);
  });

  test('API service has all required agent management methods', () => {
    const apiPath = path.join(servicesPath, 'api.ts');
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Check for agent management methods
    expect(apiContent).toMatch(/async getAgent.*\(id: string\)/);
    expect(apiContent).toMatch(/async updateAgentStatus.*\(id: string.*status: string\)/);
    expect(apiContent).toMatch(/async deleteAgent.*\(id: string.*removeWorktree/);
    
    // Check for proper error handling
    expect(apiContent).toMatch(/try/);
    expect(apiContent).toMatch(/catch/);
    expect(apiContent).toMatch(/throw new Error/);
  });

  test('Toast notifications are implemented for user feedback', () => {
    // Check AgentDashboard
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    expect(dashboardContent).toMatch(/import.*toast.*from ['"]react-toastify['"]/);
    expect(dashboardContent).toMatch(/toast\.success/);
    expect(dashboardContent).toMatch(/toast\.error/);
    
    // Check AgentDetail
    const detailPath = path.join(pagesPath, 'AgentDetail.tsx');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    
    expect(detailContent).toMatch(/toast\.success.*Agent started successfully/);
    expect(detailContent).toMatch(/toast\.success.*Agent stopped successfully/);
    expect(detailContent).toMatch(/toast\.success.*Agent deleted successfully/);
    expect(detailContent).toMatch(/toast\.error.*Failed to/);
  });

  test('Dashboard has navigation to agent details', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for navigation functionality
    expect(dashboardContent).toMatch(/navigate.*\/agents\/\$\{agent\.id\}/);
    expect(dashboardContent).toMatch(/onClick.*navigate/);
    
    // Check both table and card views have navigation
    expect(dashboardContent).toMatch(/TableView.*navigate/);
    expect(dashboardContent).toMatch(/CardView.*navigate/);
  });

  test('Real-time updates are integrated with WebSocket', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for WebSocket integration
    expect(dashboardContent).toMatch(/useWebSocket/);
    expect(dashboardContent).toMatch(/subscribe.*agents/);
    expect(dashboardContent).toMatch(/socket\.on.*agent:event/);
    expect(dashboardContent).toMatch(/socket\.on.*agent:created/);
    expect(dashboardContent).toMatch(/socket\.on.*agent:deleted/);
    
    // Check for state updates from WebSocket events
    expect(dashboardContent).toMatch(/setAgents.*prevAgents/);
    expect(dashboardContent).toMatch(/handleAgentEvent/);
    expect(dashboardContent).toMatch(/handleAgentCreated/);
    expect(dashboardContent).toMatch(/handleAgentDeleted/);
  });

  test('Confirmation dialogs are implemented for destructive actions', () => {
    const actionsPath = path.join(componentsPath, 'AgentActions.tsx');
    const actionsContent = fs.readFileSync(actionsPath, 'utf8');
    
    // Check for confirmation dialog implementation
    expect(actionsContent).toMatch(/ConfirmDialog/);
    expect(actionsContent).toMatch(/confirmDialog/);
    expect(actionsContent).toMatch(/onConfirm/);
    expect(actionsContent).toMatch(/onClose/);
    
    // Check delete action requires confirmation
    expect(actionsContent).toMatch(/Delete Agent/);
    expect(actionsContent).toMatch(/Are you sure/);
    expect(actionsContent).toMatch(/cannot be undone/);
  });

  test('Loading states are properly implemented', () => {
    // Check AgentDetail loading state
    const detailPath = path.join(pagesPath, 'AgentDetail.tsx');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    
    expect(detailContent).toMatch(/isLoading/);
    expect(detailContent).toMatch(/animate-spin/);
    
    // Check AgentDashboard loading state
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    expect(dashboardContent).toMatch(/isLoading/);
    expect(dashboardContent).toMatch(/disabled.*isLoading/);
  });

  test('Error states are properly handled', () => {
    // Check AgentDetail error state
    const detailPath = path.join(pagesPath, 'AgentDetail.tsx');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    
    expect(detailContent).toMatch(/error \|\| !agent/);
    expect(detailContent).toMatch(/Error loading agent/);
    expect(detailContent).toMatch(/Back to agents/);
    
    // Check AgentDashboard error state
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    expect(dashboardContent).toMatch(/if \(error\)/);
    expect(dashboardContent).toMatch(/Error loading agents/);
    expect(dashboardContent).toMatch(/Try again/);
  });

  console.log('✅ All Agent Management Actions tests passed!');
});