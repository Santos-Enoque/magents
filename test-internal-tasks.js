#!/usr/bin/env node

// Test script for internal task integration
const path = require('path');
const os = require('os');
const fs = require('fs');

// Test basic database operations
async function testDatabase() {
  console.log('🧪 Testing Internal Task System...\n');
  
  try {
    // Check if database exists
    const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database file not found at:', dbPath);
      console.log('   Run "magents database init" first');
      return;
    }
    
    console.log('✅ Database found at:', dbPath);
    
    // Import better-sqlite3
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    
    // Check if tasks table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='tasks'
    `).get();
    
    if (!tableExists) {
      console.log('❌ Tasks table not found in database');
      db.close();
      return;
    }
    
    console.log('✅ Tasks table exists');
    
    // Get table schema
    const schema = db.prepare('PRAGMA table_info(tasks)').all();
    console.log('\n📋 Tasks table schema:');
    schema.forEach(col => {
      console.log(`   - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });
    
    // Count tasks
    const count = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    console.log(`\n📊 Total tasks in database: ${count.count}`);
    
    // Get sample tasks
    const tasks = db.prepare('SELECT * FROM tasks LIMIT 5').all();
    if (tasks.length > 0) {
      console.log('\n📝 Sample tasks:');
      tasks.forEach((task, i) => {
        console.log(`\n   Task ${i + 1}:`);
        console.log(`   - ID: ${task.id}`);
        console.log(`   - Title: ${task.title}`);
        console.log(`   - Status: ${task.status}`);
        console.log(`   - Priority: ${task.priority}`);
        console.log(`   - Project: ${task.project_id}`);
      });
    }
    
    db.close();
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  }
}

// Test API endpoints
async function testAPI() {
  console.log('\n🧪 Testing Task API endpoints...\n');
  
  try {
    // Check if backend is running
    const response = await fetch('http://localhost:5002/api/health');
    
    if (!response.ok) {
      console.log('❌ Backend server not running on port 5002');
      console.log('   Start it with: cd packages/backend && npm run dev');
      return;
    }
    
    console.log('✅ Backend server is running');
    
    // Test task integration endpoint
    const integrationsResponse = await fetch('http://localhost:5002/api/taskmaster/integrations');
    if (integrationsResponse.ok) {
      const integrations = await integrationsResponse.json();
      console.log('\n📋 Available task integrations:');
      integrations.forEach(int => {
        console.log(`   - ${int.name} (${int.type}): ${int.status}`);
      });
    }
    
    // Test getting tasks from internal integration
    const tasksResponse = await fetch('http://localhost:5002/api/taskmaster/tasks?integration=internal');
    if (tasksResponse.ok) {
      const data = await tasksResponse.json();
      console.log(`\n📊 Tasks from internal integration: ${data.total || 0}`);
    }
    
    console.log('\n✅ API test completed!');
    
  } catch (error) {
    console.log('❌ Could not connect to backend server');
    console.log('   Error:', error.message);
  }
}

// Run tests
async function main() {
  await testDatabase();
  await testAPI();
  
  console.log('\n🏁 All tests completed!');
}

main().catch(console.error);