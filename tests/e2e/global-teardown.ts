import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up test fixtures
  const testDataDir = path.join(__dirname, '../fixtures');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    console.log('✅ Test fixtures cleaned up');
  }

  // Clean up any test agents that might have been created
  try {
    // This would normally call the CLI to clean up test agents
    // For now, we'll just log that cleanup should happen
    console.log('🔄 Test agents cleanup would happen here');
  } catch (error) {
    console.warn('⚠️ Could not clean up test agents:', error);
  }

  console.log('✨ E2E test environment cleanup complete');
}

export default globalTeardown;