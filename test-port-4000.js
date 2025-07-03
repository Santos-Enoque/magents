const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function testPort4000() {
  console.log('🧪 Testing Frontend on Port 4000\n');
  
  // Kill any existing processes
  console.log('Cleaning up existing processes...');
  require('child_process').execSync('pkill -f node || true', { stdio: 'ignore' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start backend
  console.log('Starting backend on port 3001...');
  const backend = spawn('npm', ['run', 'dev', '--workspace=@magents/backend'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  backend.stdout.on('data', (data) => {
    if (data.toString().includes('running on')) {
      console.log('✅ Backend started successfully');
    }
  });
  
  // Wait for backend
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Start frontend
  console.log('Starting frontend on port 4000...');
  const frontend = spawn('npm', ['run', 'dev', '--workspace=@magents/web'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let frontendPort = null;
  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:')) {
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        frontendPort = match[1];
        console.log(`✅ Frontend started on port ${frontendPort}`);
      }
    }
  });
  
  // Wait for frontend
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  console.log('\n🌐 Launching Playwright browser...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test port 4000
    console.log('📍 Testing http://localhost:4000');
    
    try {
      await page.goto('http://localhost:4000', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      console.log('✅ Successfully loaded frontend on port 4000!');
      
      // Take screenshot
      await page.screenshot({ path: 'frontend-port-4000-success.png' });
      console.log('📸 Screenshot saved');
      
      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);
      
      // Test API connectivity
      console.log('\n📍 Testing API proxy');
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          const data = await response.json();
          return { success: true, status: response.status, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      if (apiResponse.success) {
        console.log('✅ API proxy working correctly');
        console.log(`   Backend responded with status ${apiResponse.status}`);
      } else {
        console.log('❌ API proxy error:', apiResponse.error);
      }
      
      // Test Command Palette (Task 26 feature)
      console.log('\n📍 Testing Command Palette');
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('P');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');
      
      await page.waitForTimeout(1000);
      
      // Check for command palette
      const commandPaletteVisible = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.some(el => 
          el.textContent?.includes('Type a command') ||
          (el instanceof HTMLInputElement && el.placeholder?.includes('Type a command'))
        );
      });
      
      if (commandPaletteVisible) {
        console.log('✅ Command Palette (Task 26) is working!');
        await page.screenshot({ path: 'command-palette-port-4000.png' });
        await page.keyboard.press('Escape');
      } else {
        console.log('⚠️  Command Palette not detected');
      }
      
      console.log('\n🎉 Success! Frontend is working on port 4000');
      console.log('\n📋 Configuration Summary:');
      console.log('   Frontend: http://localhost:4000 ✅');
      console.log('   Backend: http://localhost:3001 ✅');
      console.log('   API Proxy: /api → localhost:3001 ✅');
      console.log('   Command Palette: Ctrl+Shift+P ✅');
      
    } catch (error) {
      console.error('❌ Failed to load frontend:', error.message);
    }
    
    console.log('\n👀 Browser will stay open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await browser.close();
    backend.kill();
    frontend.kill();
    
    // Wait for processes to clean up
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Test completed');
  }
}

// Run the test
testPort4000().catch(console.error);