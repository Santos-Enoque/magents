const { chromium } = require('playwright');
const path = require('path');
const Database = require('better-sqlite3');

async function testTaskBrowser() {
  console.log('🧪 Testing Task Browser with Playwright\n');

  // First, let's create some test data in the database
  const dbPath = path.join(process.env.HOME, '.magents', 'magents.db');
  const db = new Database(dbPath);
  
  console.log('1️⃣ Creating test data in database...');
  
  // Create test project
  const projectId = 'playwright-test-' + Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO projects (id, name, path, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId, 'Playwright Test Project', '/test/playwright', 'ACTIVE', new Date().toISOString(), new Date().toISOString());
  
  // Create test tasks
  const tasks = [
    { id: 'task-1', title: 'Implement user authentication', status: 'done', priority: 'high' },
    { id: 'task-2', title: 'Create API endpoints', status: 'in-progress', priority: 'high' },
    { id: 'task-3', title: 'Write unit tests', status: 'pending', priority: 'medium' },
    { id: 'task-4', title: 'Update documentation', status: 'pending', priority: 'low' }
  ];
  
  for (const task of tasks) {
    db.prepare(`
      INSERT INTO tasks (
        id, project_id, title, description, status, priority,
        created_at, updated_at, subtask_ids, dependencies, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, projectId, task.title, 'Test description', task.status, task.priority,
      new Date().toISOString(), new Date().toISOString(),
      JSON.stringify([]), JSON.stringify([]), JSON.stringify(['test']), JSON.stringify({})
    );
  }
  
  console.log('✅ Created test project and 4 tasks\n');
  
  // Launch browser
  console.log('2️⃣ Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions so we can see them
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to frontend
    console.log('3️⃣ Navigating to frontend...');
    await page.goto('http://localhost:4000');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the frontend
    const title = await page.title();
    console.log('   Page title:', title);
    
    // Look for projects or task browser
    console.log('\n4️⃣ Looking for UI elements...');
    
    // Try to find projects link
    const projectsLink = await page.locator('text=Projects').first();
    if (await projectsLink.isVisible()) {
      console.log('✅ Found Projects link');
      await projectsLink.click();
      await page.waitForTimeout(1000);
    }
    
    // Try to find task browser
    const taskBrowserLink = await page.locator('text=Task Browser').first();
    if (await taskBrowserLink.isVisible()) {
      console.log('✅ Found Task Browser link');
      await taskBrowserLink.click();
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'task-browser-test.png' });
    console.log('📸 Screenshot saved as task-browser-test.png');
    
    console.log('\n✅ Browser test completed!');
    
  } catch (error) {
    console.error('❌ Error during browser test:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: 'task-browser-error.png' });
    console.log('📸 Error screenshot saved as task-browser-error.png');
  }
  
  // Keep browser open for manual inspection
  console.log('\n👀 Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  db.close();
}

// Alternative: Just verify the database works
async function verifyDatabase() {
  console.log('\n🔍 Verifying Internal Task System Database\n');
  
  const dbPath = path.join(process.env.HOME, '.magents', 'magents.db');
  const db = new Database(dbPath);
  
  // Get task statistics
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
    byStatus: db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all(),
    byPriority: db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all(),
    projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count
  };
  
  console.log('📊 Database Statistics:');
  console.log('   Total tasks:', stats.total);
  console.log('   Total projects:', stats.projects);
  console.log('\n   Tasks by status:');
  stats.byStatus.forEach(s => console.log(`     - ${s.status}: ${s.count}`));
  console.log('\n   Tasks by priority:');
  stats.byPriority.forEach(p => console.log(`     - ${p.priority}: ${p.count}`));
  
  // Show sample tasks
  const sampleTasks = db.prepare('SELECT * FROM tasks LIMIT 5').all();
  if (sampleTasks.length > 0) {
    console.log('\n📝 Sample tasks:');
    sampleTasks.forEach((task, i) => {
      console.log(`\n   Task ${i + 1}:`);
      console.log(`     ID: ${task.id}`);
      console.log(`     Title: ${task.title}`);
      console.log(`     Status: ${task.status}`);
      console.log(`     Priority: ${task.priority}`);
      console.log(`     Project: ${task.project_id}`);
    });
  }
  
  db.close();
  console.log('\n✅ Database verification complete!');
}

// Main function
async function main() {
  // First verify database
  await verifyDatabase();
  
  // Check if frontend is running
  try {
    const response = await fetch('http://localhost:4000');
    if (response.ok) {
      console.log('\n✅ Frontend is running, starting browser test...\n');
      await testTaskBrowser();
    } else {
      console.log('\n⚠️  Frontend not responding properly');
    }
  } catch (error) {
    console.log('\n❌ Frontend is not running on port 4000');
    console.log('   Please start it with: cd packages/frontend && npm run dev');
  }
}

main().catch(console.error);