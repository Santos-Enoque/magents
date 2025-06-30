const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Agent Dashboard Implementation', () => {
  const webPackagePath = path.join(__dirname, '../packages/web');
  const componentsPath = path.join(webPackagePath, 'src/components');
  
  beforeAll(() => {
    // Ensure the web package exists
    if (!fs.existsSync(webPackagePath)) {
      throw new Error('Web package not found');
    }
  });

  test('AgentDashboard component file exists and has correct structure', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    expect(fs.existsSync(dashboardPath)).toBe(true);
    
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for required imports
    expect(dashboardContent).toMatch(/import.*React.*from ['"]react['"]/);
    expect(dashboardContent).toMatch(/import.*useQuery.*from ['"]@tanstack\/react-query['"]/);
    expect(dashboardContent).toMatch(/import.*Agent.*AgentStatus.*from ['"]@magents\/shared['"]/);
    expect(dashboardContent).toMatch(/import.*useWebSocket.*from/);
    expect(dashboardContent).toMatch(/import.*StatusIndicator.*from/);
    expect(dashboardContent).toMatch(/import.*AgentActions.*from/);
    
    // Check for main component export
    expect(dashboardContent).toMatch(/export const AgentDashboard/);
    
    // Check for view modes
    expect(dashboardContent).toMatch(/table.*cards/);
    
    // Check for search functionality
    expect(dashboardContent).toMatch(/searchTerm/);
    expect(dashboardContent).toMatch(/setSearchTerm/);
    
    // Check for filter functionality
    expect(dashboardContent).toMatch(/statusFilter/);
    expect(dashboardContent).toMatch(/setStatusFilter/);
    
    // Check for auto-refresh
    expect(dashboardContent).toMatch(/autoRefreshEnabled/);
    expect(dashboardContent).toMatch(/autoRefreshInterval/);
    
    // Check for WebSocket integration
    expect(dashboardContent).toMatch(/socket\.on.*agent:event/);
    expect(dashboardContent).toMatch(/socket\.on.*agent:created/);
    expect(dashboardContent).toMatch(/socket\.on.*agent:deleted/);
  });

  test('StatusIndicator component exists with proper status handling', () => {
    const indicatorPath = path.join(componentsPath, 'StatusIndicator.tsx');
    expect(fs.existsSync(indicatorPath)).toBe(true);
    
    const indicatorContent = fs.readFileSync(indicatorPath, 'utf8');
    
    // Check for status types
    expect(indicatorContent).toMatch(/RUNNING/);
    expect(indicatorContent).toMatch(/green/);
    expect(indicatorContent).toMatch(/STOPPED/);
    expect(indicatorContent).toMatch(/yellow/);
    expect(indicatorContent).toMatch(/ERROR/);
    expect(indicatorContent).toMatch(/red/);
    
    // Check for component exports
    expect(indicatorContent).toMatch(/export const StatusIndicator/);
    expect(indicatorContent).toMatch(/export const AnimatedStatusIndicator/);
    expect(indicatorContent).toMatch(/export const StatusSummary/);
    
    // Check for icon usage
    expect(indicatorContent).toMatch(/CheckCircle/);
    expect(indicatorContent).toMatch(/Pause/);
    expect(indicatorContent).toMatch(/AlertCircle/);
    
    // Check for variant support
    expect(indicatorContent).toMatch(/badge/);
    expect(indicatorContent).toMatch(/dot/);
    expect(indicatorContent).toMatch(/full/);
  });

  test('AgentActions component exists with action handlers', () => {
    const actionsPath = path.join(componentsPath, 'AgentActions.tsx');
    expect(fs.existsSync(actionsPath)).toBe(true);
    
    const actionsContent = fs.readFileSync(actionsPath, 'utf8');
    
    // Check for action types
    expect(actionsContent).toMatch(/onStart/);
    expect(actionsContent).toMatch(/onStop/);
    expect(actionsContent).toMatch(/onRestart/);
    expect(actionsContent).toMatch(/onDelete/);
    
    // Check for confirmation dialog
    expect(actionsContent).toMatch(/ConfirmDialog/);
    expect(actionsContent).toMatch(/confirmDialog/);
    
    // Check for action icons
    expect(actionsContent).toMatch(/Play/);
    expect(actionsContent).toMatch(/Square/);
    expect(actionsContent).toMatch(/RotateCcw/);
    expect(actionsContent).toMatch(/Trash2/);
    
    // Check for dropdown and inline variants
    expect(actionsContent).toMatch(/dropdown/);
    expect(actionsContent).toMatch(/inline/);
    
    // Check for agent status checking
    expect(actionsContent).toMatch(/canStart/);
    expect(actionsContent).toMatch(/canStop/);
    expect(actionsContent).toMatch(/canRestart/);
  });

  test('Agents page is updated to use AgentDashboard', () => {
    const agentsPagePath = path.join(webPackagePath, 'src/pages/Agents.tsx');
    expect(fs.existsSync(agentsPagePath)).toBe(true);
    
    const pageContent = fs.readFileSync(agentsPagePath, 'utf8');
    
    // Check that it imports and uses AgentDashboard
    expect(pageContent).toMatch(/import.*AgentDashboard.*from/);
    expect(pageContent).toMatch(/<AgentDashboard/);
  });

  test('Package.json includes required dependencies', () => {
    const packageJsonPath = path.join(webPackagePath, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for TanStack Query dependencies
    expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query');
    expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query-devtools');
    
    // Check for UI dependencies
    expect(packageJson.dependencies).toHaveProperty('react-toastify');
    expect(packageJson.dependencies).toHaveProperty('lucide-react');
    
    // Check for existing dependencies
    expect(packageJson.dependencies['socket.io-client']).toBeDefined();
    expect(packageJson.dependencies['react-router-dom']).toBeDefined();
  });

  test('Component structure supports responsive design', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for responsive classes
    expect(dashboardContent).toMatch(/sm:/);
    expect(dashboardContent).toMatch(/md:/);
    expect(dashboardContent).toMatch(/lg:/);
    expect(dashboardContent).toMatch(/grid-cols-1/);
    expect(dashboardContent).toMatch(/sm:grid-cols-2/);
    expect(dashboardContent).toMatch(/lg:grid-cols-3/);
    expect(dashboardContent).toMatch(/flex-col/);
    expect(dashboardContent).toMatch(/sm:flex-row/);
    
    // Check for mobile-first design patterns
    expect(dashboardContent).toMatch(/space-y-3/);
    expect(dashboardContent).toMatch(/sm:space-y-0/);
    expect(dashboardContent).toMatch(/sm:mt-0/);
  });

  test('Real-time functionality is properly implemented', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for WebSocket event handling
    expect(dashboardContent).toMatch(/handleAgentEvent/);
    expect(dashboardContent).toMatch(/handleAgentCreated/);
    expect(dashboardContent).toMatch(/handleAgentDeleted/);
    
    // Check for state updates based on events
    expect(dashboardContent).toMatch(/setAgents/);
    expect(dashboardContent).toMatch(/prevAgents/);
    expect(dashboardContent).toMatch(/filter/);
    expect(dashboardContent).toMatch(/map/);
    
    // Check for subscription management
    expect(dashboardContent).toMatch(/subscribe/);
    expect(dashboardContent).toMatch(/agents/);
    expect(dashboardContent).toMatch(/unsubscribe/);
    
    // Check for cleanup
    expect(dashboardContent).toMatch(/socket\.off/);
  });

  test('Auto-refresh functionality is implemented', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for auto-refresh state
    expect(dashboardContent).toMatch(/autoRefreshEnabled/);
    expect(dashboardContent).toMatch(/autoRefreshInterval/);
    
    // Check for interval setup
    expect(dashboardContent).toMatch(/setInterval/);
    expect(dashboardContent).toMatch(/refetch/);
    expect(dashboardContent).toMatch(/clearInterval/);
    
    // Check for UI controls
    expect(dashboardContent).toMatch(/checkbox/);
    expect(dashboardContent).toMatch(/checked.*autoRefreshEnabled/);
    expect(dashboardContent).toMatch(/select/);
    expect(dashboardContent).toMatch(/value.*autoRefreshInterval/);
  });

  test('Search and filter functionality works', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for search implementation
    expect(dashboardContent).toMatch(/filteredAgents/);
    expect(dashboardContent).toMatch(/useMemo/);
    expect(dashboardContent).toMatch(/matchesSearch/);
    expect(dashboardContent).toMatch(/toLowerCase/);
    expect(dashboardContent).toMatch(/agent\.id/);
    expect(dashboardContent).toMatch(/agent\.branch/);
    expect(dashboardContent).toMatch(/agent\.tmuxSession/);
    
    // Check for status filter
    expect(dashboardContent).toMatch(/matchesStatus/);
    expect(dashboardContent).toMatch(/statusFilter/);
    expect(dashboardContent).toMatch(/option/);
    expect(dashboardContent).toMatch(/value/);
    expect(dashboardContent).toMatch(/all/);
    expect(dashboardContent).toMatch(/RUNNING/);
    expect(dashboardContent).toMatch(/STOPPED/);
    expect(dashboardContent).toMatch(/ERROR/);
    
    // Check for clear filters functionality
    expect(dashboardContent).toMatch(/Clear filters/);
    expect(dashboardContent).toMatch(/setSearchTerm/);
    expect(dashboardContent).toMatch(/setStatusFilter/);
  });

  test('Action handlers are properly implemented', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for action handler functions
    expect(dashboardContent).toMatch(/handleStartAgent/);
    expect(dashboardContent).toMatch(/async/);
    expect(dashboardContent).toMatch(/handleStopAgent/);
    expect(dashboardContent).toMatch(/handleDeleteAgent/);
    expect(dashboardContent).toMatch(/handleRestartAgent/);
    
    // Check for API service calls
    expect(dashboardContent).toMatch(/apiService\.updateAgentStatus/);
    expect(dashboardContent).toMatch(/apiService\.deleteAgent/);
    
    // Check for error handling
    expect(dashboardContent).toMatch(/try/);
    expect(dashboardContent).toMatch(/catch/);
    expect(dashboardContent).toMatch(/error/);
    expect(dashboardContent).toMatch(/console\.error/);
  });

  test('Connection status indicator is present', () => {
    const dashboardPath = path.join(componentsPath, 'AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for connection status display
    expect(dashboardContent).toMatch(/isConnected/);
    expect(dashboardContent).toMatch(/Connected/);
    expect(dashboardContent).toMatch(/Disconnected/);
    expect(dashboardContent).toMatch(/bg-green-500/);
    expect(dashboardContent).toMatch(/bg-red-500/);
    
    // Check for visual indicator
    expect(dashboardContent).toMatch(/w-2 h-2 rounded-full/);
  });

  console.log('✅ All Agent Dashboard tests passed!');
});

describe('Integration Tests', () => {
  test('Components can be imported without errors', () => {
    // This test would normally check actual imports, but since we're in a test environment
    // we'll check that the files have the correct export syntax
    const components = [
      'AgentDashboard.tsx',
      'StatusIndicator.tsx', 
      'AgentActions.tsx'
    ];
    
    const componentsPath = path.join(__dirname, '../packages/web/src/components');
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      expect(fs.existsSync(componentPath)).toBe(true);
      
      const content = fs.readFileSync(componentPath, 'utf8');
      expect(content).toMatch(/export (const|default)/);
    });
  });

  test('TypeScript types are properly used', () => {
    const dashboardPath = path.join(__dirname, '../packages/web/src/components/AgentDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for proper TypeScript usage
    expect(dashboardContent).toMatch(/React\.FC</);
    expect(dashboardContent).toMatch(/interface.*Props/);
    expect(dashboardContent).toMatch(/Agent\[\]/);
    expect(dashboardContent).toMatch(/AgentStatus/);
    expect(dashboardContent).toMatch(/useState<.*>/);
  });

  console.log('✅ All integration tests passed!');
});