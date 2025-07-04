const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function testAgentsSync() {
  console.log('🔍 Testing agents sync between CLI and Web UI...\n');
  
  // 1. Get CLI agents
  console.log('📋 Getting agents from CLI...');
  try {
    const cliOutput = execSync('node packages/cli/dist/bin/magents.js list', {
      encoding: 'utf-8',
      cwd: '/Users/santossafrao/Development/personal/magents'
    });
    console.log('CLI Output:');
    console.log(cliOutput);
  } catch (error) {
    console.error('Failed to get CLI agents:', error.message);
  }
  
  // 2. Check API directly
  console.log('\n🔌 Checking API directly...');
  try {
    const apiResponse = await fetch('http://localhost:3001/api/agents');
    const apiData = await apiResponse.json();
    console.log('API Response:', JSON.stringify(apiData, null, 2));
  } catch (error) {
    console.error('Failed to fetch from API:', error.message);
  }
  
  // 3. Launch browser and check web UI
  console.log('\n🌐 Launching browser to check Web UI...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('Browser console:', msg.text());
    }
  });
  
  // Navigate to dashboard
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:4000');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of dashboard
  await page.screenshot({ path: 'dashboard-state.png', fullPage: true });
  console.log('📸 Dashboard screenshot saved as dashboard-state.png');
  
  // Check if demo mode is enabled
  const demoModeText = await page.evaluate(() => {
    const logs = [];
    // Check localStorage
    logs.push(`localStorage: ${JSON.stringify(localStorage)}`);
    // Check if there's any demo mode indicator
    const demoIndicators = document.querySelectorAll('[data-demo-mode]');
    logs.push(`Demo mode indicators found: ${demoIndicators.length}`);
    return logs;
  });
  console.log('\nBrowser state:', demoModeText);
  
  // Navigate to agents page
  console.log('\nNavigating to Agents page...');
  await page.click('text=Agents');
  await page.waitForLoadState('networkidle');
  
  // Wait a bit for React Query to potentially make requests
  await page.waitForTimeout(2000);
  
  // Check for API calls in network
  const apiCalls = await page.evaluate(() => {
    return window.performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('/api/'))
      .map(entry => ({
        url: entry.name,
        status: entry.responseStatus || 'unknown'
      }));
  });
  console.log('\nAPI calls made:', apiCalls);
  
  // Get agent count from UI
  const agentInfo = await page.evaluate(() => {
    const info = {};
    
    // Check sidebar count
    const sidebarAgents = document.querySelector('[href="/agents"]')?.textContent;
    info.sidebarText = sidebarAgents;
    
    // Check main content
    const noAgentsText = document.querySelector('text=No agents yet');
    info.hasNoAgentsMessage = !!noAgentsText;
    
    // Check for agent cards
    const agentCards = document.querySelectorAll('[data-testid="agent-card"], [class*="agent-card"], [class*="AgentCard"]');
    info.agentCardsCount = agentCards.length;
    
    // Check for any agent-related elements
    const agentElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent?.includes('agent-') || 
      el.textContent?.includes('feature/') ||
      el.className?.toString().toLowerCase().includes('agent')
    );
    info.agentRelatedElements = agentElements.length;
    
    // Get all text content to see what's displayed
    const mainContent = document.querySelector('main') || document.body;
    info.visibleText = mainContent.innerText?.substring(0, 500);
    
    return info;
  });
  
  console.log('\nAgent info from UI:', agentInfo);
  
  // Take screenshot of agents page
  await page.screenshot({ path: 'agents-page-state.png', fullPage: true });
  console.log('📸 Agents page screenshot saved as agents-page-state.png');
  
  // Check React Query cache
  const reactQueryState = await page.evaluate(() => {
    // Try to access React Query devtools or internal state
    const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_CLIENT__;
    if (queryClient) {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      return queries.map(q => ({
        queryKey: q.queryKey,
        state: q.state.status,
        dataLength: Array.isArray(q.state.data) ? q.state.data.length : 'not-array'
      }));
    }
    return 'React Query state not accessible';
  });
  console.log('\nReact Query state:', reactQueryState);
  
  await browser.close();
  console.log('\n✅ Test completed. Check the screenshots and logs above.');
}

// Run the test
testAgentsSync().catch(console.error);