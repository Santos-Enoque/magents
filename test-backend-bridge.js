/**
 * Test Backend Bridge Endpoints for Task 26
 */

const http = require('http');

// Test data
const testCommand = {
  commandName: 'list-agents',
  params: {},
  sessionId: 'test-backend-session',
  userId: 'test-user'
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/bridge${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testBridgeEndpoints() {
  console.log('🧪 Testing Backend Bridge Endpoints (Task 26)\n');

  try {
    // Test 1: Get available commands
    console.log('1. Testing GET /api/bridge/commands');
    try {
      const result = await makeRequest('/commands');
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Found ${result.data.data.totalCommands} commands`);
        console.log(`   Categories: ${Object.keys(result.data.data.commandsByCategory).join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Execute command
    console.log('\n2. Testing POST /api/bridge/execute');
    try {
      const result = await makeRequest('/execute', 'POST', testCommand);
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Command executed successfully`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Get activity logs
    console.log('\n3. Testing GET /api/bridge/activity');
    try {
      const result = await makeRequest('/activity?limit=5');
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Retrieved ${result.data.data.totalEntries} activity logs`);
        console.log(`   GUI operations: ${result.data.data.stats.bySource.GUI}`);
        console.log(`   CLI operations: ${result.data.data.stats.bySource.CLI}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Get sync conflicts
    console.log('\n4. Testing GET /api/bridge/conflicts');
    try {
      const result = await makeRequest('/conflicts?resolved=false');
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Found ${result.data.data.totalConflicts} conflicts`);
        console.log(`   Unresolved: ${result.data.data.unresolvedCount}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Get bridge status
    console.log('\n5. Testing GET /api/bridge/status');
    try {
      const result = await makeRequest('/status');
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Bridge is operational`);
        console.log(`   Active connections: SSE=${result.data.data.activeConnections.sse}, WS=${result.data.data.activeConnections.websocket}`);
        console.log(`   Uptime: ${Math.round(result.data.data.uptime)}s`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n📝 Bridge Endpoint Test Summary:');
    console.log('   If backend is not running, start it with: npm run dev --workspace=@magents/backend');
    console.log('   The bridge routes should be registered at /api/bridge/*');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3000');
  }
}

// Run the test
if (require.main === module) {
  testBridgeEndpoints();
}

module.exports = { testBridgeEndpoints };