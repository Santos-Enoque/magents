#!/usr/bin/env ts-node

/**
 * Manual test script for MagentsTaskManager
 * Run with: npx ts-node test-magents-task-manager.ts
 */

import { MagentsTaskManager } from './src/services/magentsTaskManager';
import { promises as fs } from 'fs';
import path from 'path';

async function testMagentsTaskManager() {
  console.log('🧪 Testing MagentsTaskManager...\n');
  
  const manager = new MagentsTaskManager();
  const testProjectPath = path.join(process.cwd(), 'test-magents-project');

  try {
    // 1. Create a test project
    console.log('1️⃣ Creating test project...');
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create package.json
    await fs.writeFile(
      path.join(testProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-magents-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
          mongoose: '^7.0.0'
        },
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0'
        }
      }, null, 2)
    );

    // Create some source files
    await fs.mkdir(path.join(testProjectPath, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'server.js'),
      `const express = require('express');
const app = express();
app.listen(3000);`
    );

    // 2. Test quickStart
    console.log('\n2️⃣ Testing quickStart...');
    const quickStartResult = await manager.quickStart({
      projectPath: testProjectPath,
      projectName: 'Test Magents Project',
      autoDetectType: true
    });
    console.log('QuickStart result:', quickStartResult);

    // 3. Test getSimplifiedTasks
    console.log('\n3️⃣ Testing getSimplifiedTasks...');
    const tasks = await manager.getSimplifiedTasks(testProjectPath);
    console.log(`Found ${tasks.length} tasks:`);
    tasks.slice(0, 3).forEach(task => {
      console.log(`  - [${task.id}] ${task.title} (${task.status})`);
    });

    // 4. Test getNextTask
    console.log('\n4️⃣ Testing getNextTask...');
    const nextTask = await manager.getNextTask(testProjectPath);
    if (nextTask) {
      console.log('Next task:', {
        id: nextTask.id,
        title: nextTask.title,
        priority: nextTask.priority
      });
    } else {
      console.log('No pending tasks found');
    }

    // 5. Test createSimpleTask
    console.log('\n5️⃣ Testing createSimpleTask...');
    const newTask = await manager.createSimpleTask(
      testProjectPath,
      'Add user authentication',
      'high'
    );
    if (newTask) {
      console.log('Created task:', newTask);
    }

    // 6. Test autoAnalyze
    console.log('\n6️⃣ Testing autoAnalyze...');
    const analyzeResult = await manager.autoAnalyze(testProjectPath);
    console.log('Analysis result:', analyzeResult);

    // 7. Test caching
    console.log('\n7️⃣ Testing caching...');
    console.time('First call');
    await manager.getSimplifiedTasks(testProjectPath);
    console.timeEnd('First call');
    
    console.time('Second call (cached)');
    await manager.getSimplifiedTasks(testProjectPath);
    console.timeEnd('Second call (cached)');

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test project...');
    await fs.rm(testProjectPath, { recursive: true, force: true }).catch(() => {});
  }
}

// Run the test
testMagentsTaskManager().catch(console.error);