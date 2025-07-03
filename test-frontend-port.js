const { chromium } = require('playwright');

async function testFrontendPort() {
  console.log('🧪 Testing Frontend on Port 5000\n');
  
  console.log('⚠️  Please start the servers manually in separate terminals:');
  console.log('Terminal 1: npm run dev --workspace=@magents/backend');
  console.log('Terminal 2: npm run dev --workspace=@magents/web');
  console.log('\nPress Enter when both servers are running...');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🌐 Launching browser to test the application...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });

    // Test 1: Check what port Vite is actually using
    console.log('📍 Test 1: Checking available ports');
    
    // Try port 5000 first
    try {
      console.log('   Trying http://localhost:5000...');
      const response = await page.goto('http://localhost:5000', { 
        waitUntil: 'domcontentloaded',
        timeout: 5000 
      });
      
      if (response && response.ok()) {
        console.log('   ✅ Frontend is running on port 5000!');
        await page.screenshot({ path: 'frontend-port-5000.png' });
      }
    } catch (e) {
      console.log('   ❌ Port 5000 not accessible:', e.message);
      
      // Try port 3000 as fallback
      try {
        console.log('   Trying http://localhost:3000...');
        const response = await page.goto('http://localhost:3000', { 
          waitUntil: 'domcontentloaded',
          timeout: 5000 
        });
        
        if (response && response.ok()) {
          console.log('   ⚠️  Frontend is still running on port 3000');
          console.log('   ℹ️  You may need to restart the dev server for port change to take effect');
        }
      } catch (e2) {
        console.log('   ❌ Port 3000 also not accessible');
      }
    }

    // Get current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);

    // Test 2: Check page content
    console.log('\n📍 Test 2: Checking page content');
    
    const title = await page.title();
    console.log(`   Page title: "${title}"`);

    // Check for main elements
    const hasContent = await page.evaluate(() => {
      return {
        hasBody: !!document.body,
        bodyText: document.body?.innerText?.substring(0, 100) || '',
        hasReactRoot: !!document.getElementById('root'),
        documentReady: document.readyState
      };
    });

    console.log('   Page state:', hasContent);

    // Test 3: Check API connectivity
    console.log('\n📍 Test 3: Testing API connectivity');
    
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          data: data
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    if (apiTest.success) {
      console.log('   ✅ API connection successful:', apiTest.data);
    } else {
      console.log('   ❌ API connection failed:', apiTest.error);
    }

    // Test 4: Check for Task 26 Command Palette
    console.log('\n📍 Test 4: Testing Command Palette (Task 26 feature)');
    
    // Try to open command palette
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('P');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(1000);
    
    // Check if command palette is visible
    const commandPaletteExists = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => 
        el.textContent?.includes('Type a command') ||
        el.placeholder?.includes('Type a command')
      );
    });

    if (commandPaletteExists) {
      console.log('   ✅ Command Palette is working!');
      await page.screenshot({ path: 'command-palette-test.png' });
      await page.keyboard.press('Escape');
    } else {
      console.log('   ⚠️  Command Palette not found');
    }

    // Test 5: Network monitoring
    console.log('\n📍 Test 5: Monitoring network activity');
    
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    await page.reload();
    await page.waitForTimeout(2000);

    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    const assetRequests = requests.filter(r => r.resourceType === 'script' || r.resourceType === 'stylesheet');

    console.log(`   Total requests: ${requests.length}`);
    console.log(`   API requests: ${apiRequests.length}`);
    console.log(`   Asset requests: ${assetRequests.length}`);

    if (apiRequests.length > 0) {
      console.log('   API endpoints called:');
      apiRequests.forEach(req => {
        console.log(`     - ${req.method} ${req.url}`);
      });
    }

    console.log('\n✅ Test completed!');
    console.log('\n👀 Browser will remain open for manual inspection...');
    console.log('Press Ctrl+C to exit');
    
    // Keep browser open
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testFrontendPort().catch(console.error);