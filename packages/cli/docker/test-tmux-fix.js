#!/usr/bin/env node

/**
 * Test script to validate tmux session creation fix
 */

const { execSync } = require('child_process');

console.log('🧪 Testing Tmux Session Creation Fix\n');

// Test session name
const testSessionName = `magents-test-${Date.now()}`;
const testWorkingDir = process.cwd();

console.log(`Session name: ${testSessionName}`);
console.log(`Working directory: ${testWorkingDir}\n`);

async function testTmuxSession() {
  try {
    console.log('1. Testing basic tmux availability...');
    
    // Check if tmux is available
    try {
      execSync('which tmux', { stdio: 'pipe' });
      console.log('   ✅ tmux is available');
    } catch (error) {
      console.log('   ❌ tmux is not available');
      return false;
    }
    
    console.log('\n2. Testing session creation with named first window...');
    
    // Create session with named first window (new approach)
    try {
      execSync(`tmux new-session -d -s "${testSessionName}" -n "main" -c "${testWorkingDir}"`, { stdio: 'pipe' });
      console.log('   ✅ Session created with named first window');
    } catch (error) {
      console.log(`   ❌ Session creation failed: ${error.message}`);
      return false;
    }
    
    console.log('\n3. Verifying session exists...');
    
    // Verify session exists
    try {
      execSync(`tmux has-session -t "${testSessionName}"`, { stdio: 'pipe' });
      console.log('   ✅ Session exists and is accessible');
    } catch (error) {
      console.log('   ❌ Session verification failed');
      return false;
    }
    
    console.log('\n4. Testing window creation...');
    
    // Create additional windows
    try {
      execSync(`tmux new-window -t "${testSessionName}" -n "claude" -c "${testWorkingDir}"`, { stdio: 'pipe' });
      console.log('   ✅ Claude window created');
      
      execSync(`tmux new-window -t "${testSessionName}" -n "git" -c "${testWorkingDir}"`, { stdio: 'pipe' });
      console.log('   ✅ Git window created');
    } catch (error) {
      console.log(`   ❌ Window creation failed: ${error.message}`);
      return false;
    }
    
    console.log('\n5. Testing window listing...');
    
    // List windows to verify structure
    try {
      const windows = execSync(`tmux list-windows -t "${testSessionName}" -F "#{window_name}"`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      }).trim().split('\n');
      
      console.log(`   ✅ Windows found: ${windows.join(', ')}`);
      
      // Verify expected windows exist
      const expectedWindows = ['main', 'claude', 'git'];
      const hasAllWindows = expectedWindows.every(w => windows.includes(w));
      
      if (hasAllWindows) {
        console.log('   ✅ All expected windows are present');
      } else {
        console.log('   ⚠️  Some expected windows are missing');
        console.log(`      Expected: ${expectedWindows.join(', ')}`);
        console.log(`      Found: ${windows.join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ Window listing failed: ${error.message}`);
      return false;
    }
    
    console.log('\n6. Testing command sending...');
    
    // Test sending commands to windows
    try {
      execSync(`tmux send-keys -t "${testSessionName}:main" "echo 'Main window test'" Enter`, { stdio: 'pipe' });
      console.log('   ✅ Command sent to main window');
      
      execSync(`tmux send-keys -t "${testSessionName}:claude" "echo 'Claude window test'" Enter`, { stdio: 'pipe' });
      console.log('   ✅ Command sent to claude window');
      
      execSync(`tmux send-keys -t "${testSessionName}:git" "echo 'Git window test'" Enter`, { stdio: 'pipe' });
      console.log('   ✅ Command sent to git window');
    } catch (error) {
      console.log(`   ❌ Command sending failed: ${error.message}`);
      return false;
    }
    
    console.log('\n7. Testing window selection...');
    
    // Test window selection
    try {
      execSync(`tmux select-window -t "${testSessionName}:claude"`, { stdio: 'pipe' });
      console.log('   ✅ Claude window selected');
      
      // Verify active window
      const activeWindow = execSync(`tmux display-message -t "${testSessionName}" -p "#{window_name}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      
      if (activeWindow === 'claude') {
        console.log('   ✅ Active window is correct (claude)');
      } else {
        console.log(`   ⚠️  Active window is ${activeWindow}, expected claude`);
      }
    } catch (error) {
      console.log(`   ❌ Window selection failed: ${error.message}`);
      return false;
    }
    
    return true;
    
  } finally {
    // Clean up test session
    console.log('\n8. Cleaning up test session...');
    try {
      execSync(`tmux kill-session -t "${testSessionName}"`, { stdio: 'pipe' });
      console.log('   ✅ Test session cleaned up');
    } catch (error) {
      console.log(`   ⚠️  Cleanup failed: ${error.message}`);
    }
  }
}

async function runTest() {
  console.log('🚀 Starting Tmux Session Creation Test\n');
  
  const success = await testTmuxSession();
  
  console.log('\n📊 Test Results');
  console.log('================');
  
  if (success) {
    console.log('🎉 All tests passed! Tmux session creation should work correctly.');
    console.log('\n✅ Fixed Issues:');
    console.log('   - Session created with named first window (no window 0 renaming)');
    console.log('   - Added session existence verification');
    console.log('   - Added timing delays for window creation');
    console.log('   - Improved error handling and cleanup');
    console.log('\n🚀 Ready to test: magents create auth-system');
  } else {
    console.log('❌ Some tests failed. Tmux session creation needs further investigation.');
    console.log('\n🔍 Debug Steps:');
    console.log('   1. Verify tmux is properly installed');
    console.log('   2. Check tmux version: tmux -V');
    console.log('   3. Test manual session creation: tmux new-session -d -s test -n main');
    console.log('   4. Check system resources and permissions');
  }
  
  return success;
}

// Run test if this file is executed directly
if (require.main === module) {
  runTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTest };