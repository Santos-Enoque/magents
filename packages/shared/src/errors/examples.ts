/**
 * Enhanced Error Handling Examples
 * 
 * This file demonstrates how to use the enhanced error handling system
 * in different scenarios across the Magents application.
 */

import { 
  createMagentsError, 
  createMagentsErrorFromGeneric, 
  MagentsError, 
  attemptAutoFix 
} from './index';
import { ERROR_CODES } from '../constants';

/**
 * Example 1: Agent Creation Error with Auto-fix
 */
export async function exampleAgentCreationError() {
  console.log('=== Example 1: Agent Creation Error ===');
  
  try {
    // Simulate agent creation failure
    throw createMagentsError(ERROR_CODES.AGENT_ALREADY_EXISTS, {
      agentName: 'my-agent',
      requestedBy: 'user@example.com',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof MagentsError) {
      console.log('Error Code:', error.code);
      console.log('User Message:', error.userMessage);
      console.log('Suggestions:');
      error.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
      
      // Attempt auto-fix
      const fixed = await attemptAutoFix(error);
      if (fixed) {
        console.log('Auto-fix available!');
        console.log('Suggested name:', error.context?.suggestedName);
      }
    }
  }
}

/**
 * Example 2: Docker Error with Recovery Steps
 */
export function exampleDockerError() {
  console.log('\n=== Example 2: Docker Error ===');
  
  try {
    // Simulate Docker daemon error
    throw createMagentsError(ERROR_CODES.DOCKER_ERROR, {
      operation: 'container-start',
      containerName: 'magents-agent-1',
      dockerVersion: '20.10.0'
    });
  } catch (error) {
    if (error instanceof MagentsError) {
      console.log(`🚨 ${error.userMessage}`);
      console.log(`Severity: ${error.severity} | Category: ${error.category}`);
      console.log(`Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
      
      if (error.learnMoreUrl) {
        console.log(`Learn more: ${error.learnMoreUrl}`);
      }
      
      console.log('\nRecommended actions:');
      error.suggestions.forEach((suggestion, index) => {
        console.log(`  📋 ${suggestion}`);
      });
    }
  }
}

/**
 * Example 3: Converting Generic Errors
 */
export function exampleGenericErrorConversion() {
  console.log('\n=== Example 3: Generic Error Conversion ===');
  
  try {
    // Simulate various generic errors
    const errors = [
      new Error('Agent "test-agent" not found in database'),
      new Error('Port 3000 is already in use by another process'),
      new Error('Git repository not found at path /invalid/path'),
      new Error('Connection timeout after 30 seconds')
    ];
    
    errors.forEach((genericError, index) => {
      const magentsError = createMagentsErrorFromGeneric(genericError, undefined, {
        errorIndex: index,
        component: 'example-system'
      });
      
      console.log(`\nGeneric Error ${index + 1}:`);
      console.log(`Original: "${genericError.message}"`);
      console.log(`Detected Code: ${magentsError.code}`);
      console.log(`User-Friendly: "${magentsError.userMessage}"`);
      console.log(`Primary Suggestion: ${magentsError.suggestions[0]}`);
    });
  } catch (error) {
    console.error('Unexpected error in example:', error);
  }
}

/**
 * Example 4: Port Conflict with Auto-fix
 */
export async function examplePortConflictWithAutoFix() {
  console.log('\n=== Example 4: Port Conflict with Auto-fix ===');
  
  try {
    throw createMagentsError(ERROR_CODES.PORT_UNAVAILABLE, {
      requestedPort: 3000,
      service: 'magents-dashboard',
      conflictingProcess: 'react-dev-server'
    });
  } catch (error) {
    if (error instanceof MagentsError) {
      console.log(`⚠️  ${error.userMessage}`);
      
      // Show original suggestions
      console.log('\nManual solutions:');
      error.suggestions.slice(0, 2).forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
      
      // Attempt auto-fix
      console.log('\n🔧 Attempting auto-fix...');
      const fixed = await attemptAutoFix(error);
      
      if (fixed && error.context?.suggestedPort) {
        console.log(`✅ Auto-fix successful!`);
        console.log(`Try using port: ${error.context.suggestedPort}`);
        console.log(`Command: magents start --port ${error.context.suggestedPort}`);
      }
    }
  }
}

/**
 * Example 5: Multiple Errors Summary
 */
export function exampleMultipleErrorsSummary() {
  console.log('\n=== Example 5: Multiple Errors Summary ===');
  
  const errors = [
    createMagentsError(ERROR_CODES.DOCKER_ERROR),
    createMagentsError(ERROR_CODES.AGENT_NOT_FOUND, { agentId: 'agent-1' }),
    createMagentsError(ERROR_CODES.PORT_UNAVAILABLE, { requestedPort: 3000 }),
    createMagentsError(ERROR_CODES.INVALID_CONFIG, { configFile: '.magents/config.json' })
  ];
  
  console.log(`Found ${errors.length} errors:`);
  
  // Group by severity
  const bySeverity = errors.reduce((acc, error) => {
    if (!acc[error.severity]) acc[error.severity] = [];
    acc[error.severity].push(error);
    return acc;
  }, {} as Record<string, MagentsError[]>);
  
  Object.entries(bySeverity).forEach(([severity, errorList]) => {
    console.log(`\n${severity.toUpperCase()} (${errorList.length}):`);
    errorList.forEach((error, index) => {
      const icon = severity === 'critical' ? '🚨' : severity === 'high' ? '❌' : '⚠️';
      console.log(`  ${icon} ${error.userMessage}`);
      if (error.autoFixAvailable) {
        console.log(`     🔧 Auto-fix available`);
      }
    });
  });
  
  // Recovery summary
  const recoverableCount = errors.filter(e => e.recoverable).length;
  const autoFixCount = errors.filter(e => e.autoFixAvailable).length;
  
  console.log(`\n📊 Recovery Summary:`);
  console.log(`   ${recoverableCount}/${errors.length} errors are recoverable`);
  console.log(`   ${autoFixCount}/${errors.length} errors have auto-fix available`);
}

/**
 * Example 6: CLI Error Display Format
 */
export function exampleCLIErrorDisplay() {
  console.log('\n=== Example 6: CLI Error Display Format ===');
  
  const error = createMagentsError(ERROR_CODES.PROJECT_NOT_FOUND, {
    projectPath: '/Users/john/my-project',
    operation: 'agent-creation',
    timestamp: new Date().toISOString()
  });
  
  // Simulate CLI-style error display
  console.log('\n❌ Project Directory Error');
  console.log(`   ${error.userMessage}`);
  console.log(`   Technical: ${error.technicalMessage}`);
  console.log(`   Code: ${error.code} | Category: ${error.category} | Severity: ${error.severity}`);
  
  console.log('\n💡 Suggested solutions:');
  error.suggestions.forEach((suggestion, index) => {
    console.log(`   ${index + 1}. ${suggestion}`);
  });
  
  if (error.learnMoreUrl) {
    console.log(`\n📖 Learn more: ${error.learnMoreUrl}`);
  }
  
  console.log(`\n${error.recoverable ? '✅' : '⚠️'} ${
    error.recoverable 
      ? 'This error can be resolved. Try the suggestions above.' 
      : 'This may require manual intervention or system changes.'
  }`);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Enhanced Error Handling System Examples\n');
  
  await exampleAgentCreationError();
  exampleDockerError();
  exampleGenericErrorConversion();
  await examplePortConflictWithAutoFix();
  exampleMultipleErrorsSummary();
  exampleCLIErrorDisplay();
  
  console.log('\n✅ All examples completed!');
  console.log('\nThis demonstrates:');
  console.log('• Structured error creation with context');
  console.log('• User-friendly error messages');
  console.log('• Actionable recovery suggestions');
  console.log('• Automatic error detection from generic errors');
  console.log('• Auto-fix capabilities where possible');
  console.log('• Comprehensive error metadata and logging');
}

// Execute examples if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}