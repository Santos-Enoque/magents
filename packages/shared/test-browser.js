#!/usr/bin/env node

/**
 * Browser Test Runner using Playwright
 * 
 * This script runs the browser-based tests using Playwright automation
 * to ensure all browser functionality works correctly.
 */

const { chromium } = require('playwright');
const path = require('path');

async function runBrowserTests() {
  console.log('🌐 Starting Browser Tests with Playwright...\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`🔴 Browser Error: ${text}`);
      } else if (text.includes('✅') || text.includes('❌')) {
        console.log(`📊 ${text}`);
      }
    });
    
    // Navigate to test page
    const testPagePath = path.resolve('/Users/santossafrao/Development/personal/magents/packages/shared/test-browser.html');
    await page.goto(`file://${testPagePath}`);
    
    console.log('📄 Browser test page loaded');
    
    // Wait for page to be ready
    await page.waitForSelector('button');
    
    // Run schema validation test
    console.log('\n🧪 Running Schema Validation Test...');
    await page.click('button[onclick="testSchemaValidation()"]');
    await page.waitForTimeout(1000);
    
    // Check for test results
    let output = await page.textContent('#output');
    if (output.includes('Schema validation tests completed')) {
      console.log('✅ Schema validation test completed');
    } else {
      console.log('❌ Schema validation test may have issues');
    }
    
    // Clear output
    await page.click('button[onclick="clearOutput()"]');
    
    // Run data transformation test
    console.log('\n🔄 Running Data Transformation Test...');
    await page.click('button[onclick="testDataTransformation()"]');
    await page.waitForTimeout(1000);
    
    output = await page.textContent('#output');
    if (output.includes('Data transformation tests completed')) {
      console.log('✅ Data transformation test completed');
    } else {
      console.log('❌ Data transformation test may have issues');
    }
    
    // Clear output
    await page.click('button[onclick="clearOutput()"]');
    
    // Run config migration test
    console.log('\n⚙️ Running Config Migration Test...');
    await page.click('button[onclick="testConfigMigration()"]');
    await page.waitForTimeout(1000);
    
    output = await page.textContent('#output');
    if (output.includes('Config migration tests completed')) {
      console.log('✅ Config migration test completed');
    } else {
      console.log('❌ Config migration test may have issues');
    }
    
    // Clear output
    await page.click('button[onclick="clearOutput()"]');
    
    // Run sync events test
    console.log('\n📡 Running Sync Events Test...');
    await page.click('button[onclick="testSyncEvents()"]');
    await page.waitForTimeout(1000);
    
    output = await page.textContent('#output');
    if (output.includes('Sync events tests completed')) {
      console.log('✅ Sync events test completed');
    } else {
      console.log('❌ Sync events test may have issues');
    }
    
    // Run all tests together
    console.log('\n🚀 Running All Tests Together...');
    await page.click('button[onclick="runAllTests()"]');
    await page.waitForTimeout(3000); // Wait longer for all tests
    
    // Get final output and analyze results
    output = await page.textContent('#output');
    
    // Count success and error indicators
    const successCount = (output.match(/✅/g) || []).length;
    const errorCount = (output.match(/❌/g) || []).length;
    
    console.log('\n📊 Browser Test Results:');
    console.log(`  ✅ Successful operations: ${successCount}`);
    console.log(`  ❌ Failed operations: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All browser tests passed successfully!');
    } else {
      console.log('\n⚠️ Some browser tests had issues. Check the detailed output.');
      console.log('\nDetailed output:');
      console.log(output);
    }
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: '/Users/santossafrao/Development/personal/magents/packages/shared/test-results-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as test-results-screenshot.png');
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run browser tests if this file is executed directly
if (require.main === module) {
  runBrowserTests().catch((error) => {
    console.error('❌ Browser tests failed:', error);
    process.exit(1);
  });
}

module.exports = { runBrowserTests };