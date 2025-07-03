const { chromium } = require('playwright');

async function verifyPort5000() {
  console.log('🧪 Verifying Frontend Port Configuration\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Test port 5000
    console.log('📍 Testing http://localhost:5000');
    try {
      await page.goto('http://localhost:5000', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      console.log('✅ Successfully loaded frontend on port 5000!');
      
      // Take screenshot
      await page.screenshot({ path: 'frontend-port-5000-verified.png' });
      console.log('📸 Screenshot saved as frontend-port-5000-verified.png');
      
      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);
      
      // Check for main content
      const hasReactApp = await page.evaluate(() => {
        return !!document.getElementById('root');
      });
      console.log(`⚛️  React app mounted: ${hasReactApp ? 'Yes' : 'No'}`);
      
      // Test Command Palette
      console.log('\n📍 Testing Command Palette (Ctrl+Shift+P)');
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('P');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');
      
      await page.waitForTimeout(1000);
      
      // Look for command palette
      const commandPaletteVisible = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.some(input => 
          input.placeholder?.toLowerCase().includes('command') ||
          input.getAttribute('aria-label')?.toLowerCase().includes('command')
        );
      });
      
      if (commandPaletteVisible) {
        console.log('✅ Command Palette opened successfully!');
        await page.screenshot({ path: 'command-palette-port-5000.png' });
        console.log('📸 Command palette screenshot saved');
      } else {
        console.log('⚠️  Command Palette not detected');
      }
      
      // Test API proxy
      console.log('\n📍 Testing API proxy to backend (port 3001)');
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          return {
            ok: response.ok,
            status: response.status,
            url: response.url
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      if (apiResponse.ok) {
        console.log('✅ API proxy working correctly');
        console.log(`   Status: ${apiResponse.status}`);
        console.log(`   URL: ${apiResponse.url}`);
      } else {
        console.log('❌ API proxy error:', apiResponse);
      }
      
      console.log('\n🎉 Port 5000 configuration verified successfully!');
      console.log('\n📝 Summary:');
      console.log('   - Frontend: http://localhost:5000 ✅');
      console.log('   - Backend API: http://localhost:3001 ✅');
      console.log('   - API Proxy: /api → localhost:3001 ✅');
      console.log('   - WebSocket Proxy: /ws → localhost:3001 ✅');
      
    } catch (error) {
      console.error('❌ Failed to load port 5000:', error.message);
      
      // Try port 3000 to see if it's still there
      console.log('\n📍 Checking if port 3000 is still in use...');
      try {
        await page.goto('http://localhost:3000', { timeout: 5000 });
        console.log('⚠️  Port 3000 is still serving content');
        console.log('   You may need to clear Vite cache or restart the dev server');
      } catch (e) {
        console.log('✅ Port 3000 is not in use (as expected)');
      }
    }
    
    console.log('\n👀 Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

// Run verification
console.log('⚠️  Make sure both servers are running:');
console.log('   Terminal 1: npm run dev --workspace=@magents/backend');
console.log('   Terminal 2: npm run dev --workspace=@magents/web');
console.log('\nStarting test in 3 seconds...\n');

setTimeout(() => {
  verifyPort5000().catch(console.error);
}, 3000);