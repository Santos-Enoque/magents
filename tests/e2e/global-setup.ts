import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Ensure test database is clean
  const testDataDir = path.join(__dirname, '../fixtures');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDataDir, { recursive: true });

  // Create test project structure
  const testProjectPath = path.join(testDataDir, 'test-project');
  fs.mkdirSync(testProjectPath, { recursive: true });
  
  // Initialize git repository for test project
  try {
    execSync('git init', { cwd: testProjectPath, stdio: 'pipe' });
    execSync('git config user.email "test@magents.dev"', { cwd: testProjectPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testProjectPath, stdio: 'pipe' });
    
    // Create initial commit
    fs.writeFileSync(path.join(testProjectPath, 'README.md'), '# Test Project\n\nThis is a test project for E2E testing.');
    execSync('git add .', { cwd: testProjectPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testProjectPath, stdio: 'pipe' });
    
    console.log('✅ Test git repository created');
  } catch (error) {
    console.warn('⚠️ Could not set up git repository:', error);
  }

  // Create TaskMaster configuration for testing
  const taskMasterDir = path.join(testProjectPath, '.taskmaster');
  fs.mkdirSync(taskMasterDir, { recursive: true });
  
  const testTasks = {
    '1': {
      id: '1',
      title: 'Test Task 1',
      description: 'A test task for E2E testing',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      details: 'This is a test task used for E2E testing of the agent creation wizard.',
      testStrategy: 'Verify task assignment works correctly'
    },
    '2': {
      id: '2', 
      title: 'Test Task 2',
      description: 'Another test task',
      status: 'in-progress',
      priority: 'medium',
      dependencies: ['1'],
      details: 'Another test task with dependencies.',
      testStrategy: 'Test dependency handling'
    }
  };
  
  fs.writeFileSync(
    path.join(taskMasterDir, 'tasks.json'),
    JSON.stringify({ tasks: testTasks }, null, 2)
  );
  
  const testConfig = {
    models: {
      main: 'claude-3-5-sonnet-20241022',
      research: 'perplexity-llama-3.1-sonar-large-128k-online',
      fallback: 'gpt-4o-mini'
    }
  };
  
  fs.writeFileSync(
    path.join(taskMasterDir, 'config.json'),
    JSON.stringify(testConfig, null, 2)
  );

  console.log('✅ TaskMaster test configuration created');

  // Wait for services to be ready
  console.log('⏳ Waiting for services to start...');
  
  // Check if services are running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for frontend to be ready
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for backend to be ready
    await page.goto('http://localhost:3001/api/health', {
      timeout: 30000
    });
    
    console.log('✅ Services are ready');
  } catch (error) {
    console.error('❌ Services failed to start:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('🎯 E2E test environment setup complete');
}

export default globalSetup;