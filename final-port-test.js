const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function finalPortTest() {
  console.log('🧪 Final Port Configuration Test\n');
  
  // Start backend
  console.log('Starting backend on port 3001...');
  const backend = spawn('npm', ['run', 'dev', '--workspace=@magents/backend'], {
    stdio: 'inherit'
  });
  
  // Wait for backend
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Start frontend  
  console.log('\nStarting frontend (should be on port 5000)...');
  const frontend = spawn('npm', ['run', 'dev', '--workspace=@magents/web'], {
    stdio: 'inherit'
  });
  
  // Wait for frontend
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  console.log('\n🌐 Launching Playwright to test...\n');
  
  const browser = await chromium.launch({ 
    headless: false 
  });
  
  try {
    const page = await browser.newPage();
    
    // Test both ports
    const results = {
      port5000: false,
      port3000: false
    };
    
    // Try port 5000
    try {
      await page.goto('http://localhost:5000', { timeout: 5000 });
      results.port5000 = true;
      console.log('✅ Port 5000 is accessible');
    } catch (e) {
      console.log('❌ Port 5000 not accessible');
    }
    
    // Try port 3000
    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
      results.port3000 = true;
      console.log('✅ Port 3000 is accessible');
    } catch (e) {
      console.log('❌ Port 3000 not accessible');
    }
    
    // Go to whichever port is working
    const workingPort = results.port5000 ? 5000 : (results.port3000 ? 3000 : null);
    
    if (workingPort) {
      await page.goto(`http://localhost:${workingPort}`);
      console.log(`\n📍 Frontend is running on port ${workingPort}`);
      
      // Take screenshot
      await page.screenshot({ path: `frontend-port-${workingPort}.png` });
      console.log(`📸 Screenshot saved as frontend-port-${workingPort}.png`);
      
      // Test Command Palette
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('P');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const hasCommandPalette = await page.evaluate(() => {
        return document.body.innerText.includes('Type a command');
      });
      
      console.log(`\n🎯 Command Palette: ${hasCommandPalette ? '✅ Working' : '❌ Not found'}`);
      
      if (workingPort !== 5000) {
        console.log('\n⚠️  Note: Frontend is not using port 5000 as configured.');
        console.log('   The Vite configuration in vite.config.ts specifies port 5000,');
        console.log('   but Vite appears to be using its default port 3000.');
        console.log('   This might be due to Vite version or configuration caching.');
      }
    }
    
    await page.waitForTimeout(5000);
    
  } finally {
    await browser.close();
    backend.kill();
    frontend.kill();
    console.log('\n✅ Test completed');
  }
}

finalPortTest().catch(console.error);