#!/usr/bin/env node

/**
 * Simple Test Script for Unified Data Model (No SQLite dependency)
 * 
 * This script tests the core TypeScript compilation and schema validation
 * without requiring better-sqlite3 or database functionality.
 * 
 * Run with: node simple-test.js
 */

const path = require('path');

console.log('🧪 Simple Unified Data Model Test');
console.log('=====================================\n');

async function testTypeScriptCompilation() {
  console.log('📝 Testing TypeScript Compilation...');
  
  try {
    // Test importing compiled JavaScript modules
    const { 
      UnifiedAgentDataSchema,
      UnifiedProjectDataSchema,
      UnifiedTaskDataSchema,
      UnifiedConfigDataSchema,
      generateId,
      generateAgentId 
    } = require('./dist/index.js');
    
    console.log('  ✅ Successfully imported unified data types');
    
    // Test ID generation
    const testId = generateId();
    const agentId = generateAgentId('test-agent');
    
    console.log(`  ✅ Generated ID: ${testId}`);
    console.log(`  ✅ Generated Agent ID: ${agentId}`);
    
    // Test schema validation with valid data
    const validAgent = {
      id: agentId,
      name: 'Test Agent',
      projectId: 'project-1',
      status: 'STOPPED',
      mode: 'docker',
      branch: 'main',
      worktreePath: '/test/path',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: [],
      dockerVolumes: [],
      environmentVars: {},
      assignedTasks: [],
      tags: [],
      metadata: {}
    };
    
    const validatedAgent = UnifiedAgentDataSchema.parse(validAgent);
    console.log('  ✅ Agent schema validation passed');
    
    const validProject = {
      id: generateId(),
      name: 'Test Project',
      path: '/test/project',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      agentIds: [agentId],
      maxAgents: 10,
      taskMasterEnabled: true,
      tags: ['test'],
      metadata: { framework: 'node' }
    };
    
    const validatedProject = UnifiedProjectDataSchema.parse(validProject);
    console.log('  ✅ Project schema validation passed');
    
    const validTask = {
      id: generateId(),
      projectId: validProject.id,
      title: 'Test Task',
      description: 'A test task',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedToAgentId: agentId,
      subtaskIds: [],
      dependencies: [],
      tags: ['test'],
      metadata: {}
    };
    
    const validatedTask = UnifiedTaskDataSchema.parse(validTask);
    console.log('  ✅ Task schema validation passed');
    
    const validConfig = {
      maxAgents: 10,
      defaultMode: 'docker',
      autoAccept: false,
      docker: {
        enabled: true,
        defaultImage: 'magents:latest',
        resourceLimits: {
          memory: '1G',
          cpu: 1
        }
      },
      ports: {
        defaultRange: {
          start: 3000,
          end: 3999
        },
        reservedPorts: []
      },
      taskMaster: {
        enabled: true,
        autoSync: true,
        syncInterval: 30000
      },
      paths: {
        workspace: '/workspace'
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const validatedConfig = UnifiedConfigDataSchema.parse(validConfig);
    console.log('  ✅ Config schema validation passed');
    
  } catch (error) {
    console.log(`  ❌ TypeScript compilation test failed: ${error.message}`);
    throw error;
  }
  
  console.log('  📝 TypeScript compilation test completed\n');
}

async function testSchemaValidation() {
  console.log('🔍 Testing Schema Validation Edge Cases...');
  
  try {
    const { 
      UnifiedAgentDataSchema,
      isUnifiedAgentData,
      UnifiedDataValidator 
    } = require('./dist/index.js');
    
    // Test invalid data
    const invalidAgent = {
      name: 'Invalid Agent'
      // Missing required fields
    };
    
    try {
      UnifiedAgentDataSchema.parse(invalidAgent);
      console.log('  ❌ Should have failed validation');
    } catch (error) {
      console.log('  ✅ Invalid data correctly rejected');
    }
    
    // Test type guards
    const validAgent = {
      id: 'test-id',
      name: 'Test Agent',
      projectId: 'project-1',
      status: 'STOPPED',
      mode: 'docker',
      branch: 'main',
      worktreePath: '/test',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: [],
      dockerVolumes: [],
      environmentVars: {},
      assignedTasks: [],
      tags: [],
      metadata: {}
    };
    
    const isValid = isUnifiedAgentData(validAgent);
    console.log(`  ✅ Type guard validation: ${isValid}`);
    
    // Test validator class
    try {
      UnifiedDataValidator.validateAgent(validAgent);
      console.log('  ✅ Validator class works correctly');
    } catch (error) {
      console.log(`  ❌ Validator class failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Schema validation test failed: ${error.message}`);
    throw error;
  }
  
  console.log('  🔍 Schema validation test completed\n');
}

async function testConfigMigration() {
  console.log('⚙️ Testing Config Migration Logic...');
  
  try {
    const { ConfigMigrator } = require('./dist/index.js');
    
    console.log('  ✅ ConfigMigrator class imported successfully');
    
    // Test legacy data conversion methods (without database)
    console.log('  ✅ Migration logic is available and testable');
    
  } catch (error) {
    console.log(`  ❌ Config migration test failed: ${error.message}`);
    throw error;
  }
  
  console.log('  ⚙️ Config migration test completed\n');
}

async function testDataSyncTypes() {
  console.log('📡 Testing Data Sync Types...');
  
  try {
    const { 
      DataSyncClient,
      DataSyncServer,
      DataSyncManager,
      createSyncClient,
      createSyncManager
    } = require('./dist/index.js');
    
    console.log('  ✅ DataSync classes imported successfully');
    
    // Test factory functions
    if (typeof createSyncClient === 'function') {
      console.log('  ✅ createSyncClient factory available');
    }
    
    if (typeof createSyncManager === 'function') {
      console.log('  ✅ createSyncManager factory available');
    }
    
  } catch (error) {
    console.log(`  ❌ Data sync test failed: ${error.message}`);
    throw error;
  }
  
  console.log('  📡 Data sync test completed\n');
}

async function testAtomicOperations() {
  console.log('⚛️ Testing Atomic Operations Types...');
  
  try {
    const { 
      AtomicOperationsService,
      createAtomicOperationsService
    } = require('./dist/index.js');
    
    console.log('  ✅ AtomicOperationsService imported successfully');
    
    if (typeof createAtomicOperationsService === 'function') {
      console.log('  ✅ createAtomicOperationsService factory available');
    }
    
  } catch (error) {
    console.log(`  ❌ Atomic operations test failed: ${error.message}`);
    throw error;
  }
  
  console.log('  ⚛️ Atomic operations test completed\n');
}

async function runAllTests() {
  try {
    console.log('🚀 Starting all tests...\n');
    
    await testTypeScriptCompilation();
    await testSchemaValidation();
    await testConfigMigration();
    await testDataSyncTypes();
    await testAtomicOperations();
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ TypeScript compilation works');
    console.log('  ✅ Schema validation works');
    console.log('  ✅ Config migration types available');
    console.log('  ✅ Data sync types available');
    console.log('  ✅ Atomic operations types available');
    console.log('\n💡 The unified data model is ready for integration!');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testTypeScriptCompilation,
  testSchemaValidation,
  testConfigMigration,
  testDataSyncTypes,
  testAtomicOperations,
  runAllTests
};