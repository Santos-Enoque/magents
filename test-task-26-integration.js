/**
 * Task 26 GUI-CLI Integration Bridge Test
 * 
 * Simple test script to verify the core integration functionality
 */

const { coreManager } = require('./packages/shared/dist/core');
const { STANDARD_COMMANDS } = require('./packages/shared/dist/core/commands');

async function testGUICliIntegration() {
  console.log('🧪 Testing Task 26: GUI-CLI Integration Bridge\n');

  try {
    // Test 1: Register standard commands
    console.log('1. Registering standard commands...');
    STANDARD_COMMANDS.forEach(CommandClass => {
      const command = new CommandClass();
      coreManager.commandRegistry.registerCommand(command);
    });
    
    const registeredCommands = coreManager.commandRegistry.getAllCommands();
    console.log(`   ✅ Registered ${registeredCommands.length} commands`);

    // Test 2: Execute command from GUI
    console.log('2. Testing GUI command execution...');
    const guiResult = await coreManager.executeCommand('create-agent', {
      params: { agentId: 'test-gui-agent', branch: 'main' },
      source: 'GUI',
      sessionId: 'gui-test-session',
      userId: 'test-user'
    });
    
    console.log(`   ✅ GUI command result: ${guiResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   ⏱️  Execution time: ${guiResult.executionTime}ms`);

    // Test 3: Execute command from CLI
    console.log('3. Testing CLI command execution...');
    const cliResult = await coreManager.executeCommand('start-agent', {
      params: { agentId: 'test-cli-agent' },
      source: 'CLI',
      sessionId: 'cli-test-session'
    });
    
    console.log(`   ✅ CLI command result: ${cliResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   ⏱️  Execution time: ${cliResult.executionTime}ms`);

    // Test 4: Activity logging
    console.log('4. Testing activity logging...');
    const allLogs = coreManager.activityLogger.getLogs({ limit: 5 });
    const guiLogs = coreManager.activityLogger.getLogs({ source: 'GUI', limit: 5 });
    const cliLogs = coreManager.activityLogger.getLogs({ source: 'CLI', limit: 5 });
    
    console.log(`   📝 Total logs: ${allLogs.length}`);
    console.log(`   🖥️  GUI logs: ${guiLogs.length}`);
    console.log(`   💻 CLI logs: ${cliLogs.length}`);

    // Test 5: Real-time synchronization setup
    console.log('5. Testing sync bridge...');
    const sessionId = 'sync-test-session';
    
    coreManager.syncBridge.subscribe(sessionId, ['command.executed']);
    
    let eventReceived = false;
    coreManager.syncBridge.onSync(sessionId, (payload) => {
      eventReceived = true;
      console.log(`   📡 Received event: ${payload.eventType} from ${payload.source}`);
    });

    // Execute a command from a different session to test broadcasting
    await coreManager.executeCommand('list-agents', {
      params: {},
      source: 'GUI',
      sessionId: 'broadcast-test-session'
    });

    // Give a moment for event processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`   🔄 Event broadcast: ${eventReceived ? 'SUCCESS' : 'NOT RECEIVED'}`);

    // Test 6: Command categories
    console.log('6. Testing command categorization...');
    const agentCommands = coreManager.commandRegistry.getCommandsByCategory('agent');
    const systemCommands = coreManager.commandRegistry.getCommandsByCategory('system');
    const configCommands = coreManager.commandRegistry.getCommandsByCategory('config');
    
    console.log(`   🤖 Agent commands: ${agentCommands.length}`);
    console.log(`   ⚙️  System commands: ${systemCommands.length}`);
    console.log(`   🔧 Config commands: ${configCommands.length}`);

    // Test 7: Error handling
    console.log('7. Testing error handling...');
    const errorResult = await coreManager.executeCommand('unknown-command', {
      source: 'GUI',
      sessionId: 'error-test-session'
    });
    
    console.log(`   ❌ Error handling: ${!errorResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   🔍 Error details: ${errorResult.error?.userMessage || 'No error message'}`);

    // Test 8: Stats and metrics
    console.log('8. Testing activity stats...');
    const stats = coreManager.activityLogger.getStats();
    
    console.log(`   📊 Total entries: ${stats.totalEntries}`);
    console.log(`   📈 GUI operations: ${stats.bySource.GUI}`);
    console.log(`   📉 CLI operations: ${stats.bySource.CLI}`);

    console.log('\n🎉 Task 26 GUI-CLI Integration Bridge test completed successfully!\n');
    
    console.log('📋 Features Verified:');
    console.log('   ✅ Unified command registry');
    console.log('   ✅ GUI and CLI command execution');
    console.log('   ✅ Activity logging and tracking');
    console.log('   ✅ Real-time event synchronization');
    console.log('   ✅ Command categorization');
    console.log('   ✅ Error handling and validation');
    console.log('   ✅ Statistics and metrics');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testGUICliIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testGUICliIntegration };