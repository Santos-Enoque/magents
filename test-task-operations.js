#!/usr/bin/env node

// Test task CRUD operations directly
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
// Simple UUID generator
function generateId() {
  return 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

const dbPath = path.join(os.homedir(), '.magents', 'magents.db');
const db = new Database(dbPath);

console.log('🧪 Testing Task CRUD Operations...\n');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Test data
const testProjectId = 'test-project-' + Date.now();
const testTaskId = generateId();
const testTask = {
  id: testTaskId,
  task_master_id: '1.1',
  project_id: testProjectId,
  title: 'Test Task from Internal System',
  description: 'This is a test task created by the internal task system',
  details: 'Detailed implementation notes go here',
  status: 'pending',
  priority: 'high',
  assigned_to_agent_id: null,
  parent_task_id: null,
  subtask_ids: JSON.stringify([]),
  dependencies: JSON.stringify(['1.2', '1.3']),
  test_strategy: 'Unit tests and integration tests',
  test_results: JSON.stringify({}),
  estimated_effort: 8.5,
  actual_effort: null,
  tags: JSON.stringify(['backend', 'testing', 'internal']),
  metadata: JSON.stringify({ source: 'internal', version: '1.0' }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assigned_at: null,
  started_at: null,
  completed_at: null
};

try {
  // 1. Create test project first (tasks table has foreign key to projects)
  console.log('1️⃣ Creating test project...');
  const projectStmt = db.prepare(`
    INSERT OR IGNORE INTO projects (
      id, name, path, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  projectStmt.run(
    testProjectId,
    'Test Project',
    '/test/project',
    'ACTIVE',
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('   ✅ Project created: ' + testProjectId);

  // 2. Create task
  console.log('\n2️⃣ Creating task...');
  const insertStmt = db.prepare(`
    INSERT INTO tasks (
      id, task_master_id, project_id, title, description, details,
      status, priority, assigned_to_agent_id, parent_task_id,
      subtask_ids, dependencies, test_strategy, test_results,
      estimated_effort, actual_effort, tags, metadata,
      created_at, updated_at, assigned_at, started_at, completed_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertStmt.run(
    testTask.id, testTask.task_master_id, testTask.project_id, testTask.title,
    testTask.description, testTask.details, testTask.status, testTask.priority,
    testTask.assigned_to_agent_id, testTask.parent_task_id, testTask.subtask_ids,
    testTask.dependencies, testTask.test_strategy, testTask.test_results,
    testTask.estimated_effort, testTask.actual_effort, testTask.tags, testTask.metadata,
    testTask.created_at, testTask.updated_at, testTask.assigned_at,
    testTask.started_at, testTask.completed_at
  );
  console.log('   ✅ Task created: ' + testTaskId);

  // 3. Read task
  console.log('\n3️⃣ Reading task...');
  const readStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const readTask = readStmt.get(testTaskId);
  
  if (readTask) {
    console.log('   ✅ Task found:');
    console.log('      - Title:', readTask.title);
    console.log('      - Status:', readTask.status);
    console.log('      - Priority:', readTask.priority);
    console.log('      - Dependencies:', JSON.parse(readTask.dependencies));
    console.log('      - Tags:', JSON.parse(readTask.tags));
  }

  // 4. Update task
  console.log('\n4️⃣ Updating task status...');
  const updateStmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, started_at = ?, updated_at = ?
    WHERE id = ?
  `);
  
  const now = new Date().toISOString();
  updateStmt.run('in-progress', now, now, testTaskId);
  console.log('   ✅ Task updated');

  // 5. Create subtask
  console.log('\n5️⃣ Creating subtask...');
  const subtaskId = generateId();
  const subtaskStmt = db.prepare(`
    INSERT INTO tasks (
      id, project_id, title, description, status, priority,
      parent_task_id, subtask_ids, dependencies, tags, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  subtaskStmt.run(
    subtaskId, testProjectId, 'Test Subtask', 'A subtask of the main task',
    'pending', 'medium', testTaskId, JSON.stringify([]), JSON.stringify([]),
    JSON.stringify(['subtask']), JSON.stringify({}), now, now
  );
  
  // Update parent task's subtask list
  const currentSubtasks = JSON.parse(readTask.subtask_ids || '[]');
  currentSubtasks.push(subtaskId);
  db.prepare('UPDATE tasks SET subtask_ids = ? WHERE id = ?')
    .run(JSON.stringify(currentSubtasks), testTaskId);
  
  console.log('   ✅ Subtask created: ' + subtaskId);

  // 6. Query tasks with filters
  console.log('\n6️⃣ Querying tasks with filters...');
  const queryStmt = db.prepare(`
    SELECT * FROM tasks 
    WHERE project_id = ? AND status = ?
    ORDER BY created_at DESC
  `);
  
  const tasks = queryStmt.all(testProjectId, 'in-progress');
  console.log(`   ✅ Found ${tasks.length} in-progress task(s)`);

  // 7. Get statistics
  console.log('\n7️⃣ Getting task statistics...');
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(testProjectId).count,
    byStatus: db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tasks WHERE project_id = ?
      GROUP BY status
    `).all(testProjectId),
    byPriority: db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM tasks WHERE project_id = ?
      GROUP BY priority
    `).all(testProjectId)
  };
  
  console.log('   ✅ Statistics:');
  console.log('      - Total tasks:', stats.total);
  console.log('      - By status:', stats.byStatus);
  console.log('      - By priority:', stats.byPriority);

  // 8. Test import/export
  console.log('\n8️⃣ Testing export functionality...');
  const exportStmt = db.prepare('SELECT * FROM tasks WHERE project_id = ?');
  const exportedTasks = exportStmt.all(testProjectId);
  const exportJson = JSON.stringify(exportedTasks, null, 2);
  console.log('   ✅ Exported', exportedTasks.length, 'tasks to JSON');

  // 9. Clean up
  console.log('\n9️⃣ Cleaning up test data...');
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(testProjectId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
  console.log('   ✅ Test data cleaned up');

  console.log('\n✅ All task operations tested successfully!');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('Stack:', error.stack);
} finally {
  db.close();
}