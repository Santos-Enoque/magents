#!/usr/bin/env node

console.log('🧹 Cleaning up diagnostic files...');

const fs = require('fs');
const path = require('path');

// Remove the diagnostic component file
const diagnosticFile = path.join(__dirname, '../web/src/components/ConnectionDiagnostics.tsx');
if (fs.existsSync(diagnosticFile)) {
  fs.unlinkSync(diagnosticFile);
  console.log('✅ Removed ConnectionDiagnostics.tsx');
}

// Remove the check connections script
const checkFile = path.join(__dirname, 'check-connections.js');
if (fs.existsSync(checkFile)) {
  fs.unlinkSync(checkFile);
  console.log('✅ Removed check-connections.js');
}

// Remove this cleanup script itself
const cleanupFile = path.join(__dirname, 'cleanup-diagnostics.js');
setTimeout(() => {
  if (fs.existsSync(cleanupFile)) {
    fs.unlinkSync(cleanupFile);
    console.log('✅ Removed cleanup-diagnostics.js');
  }
}, 100);

console.log('\n📝 To remove the diagnostic component from UnifiedDashboard.tsx:');
console.log('   1. Remove the ConnectionDiagnostics import');
console.log('   2. Remove the Connection Diagnostics section');
console.log('\n✨ Cleanup complete!');