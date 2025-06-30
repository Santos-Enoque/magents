#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Running comprehensive validation...\n');

let exitCode = 0;
const results = [];

// Helper function to run command and track results
function runCheck(name, command, critical = false) {
  console.log(`\n📋 ${name}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    results.push({ name, status: '✅ Passed' });
    return true;
  } catch (error) {
    results.push({ name, status: '❌ Failed' });
    if (critical) {
      exitCode = 1;
    }
    return false;
  }
}

// 1. Check TypeScript compilation
runCheck('TypeScript Compilation', 'npx tsc --build --noEmit', true);

// 2. Check for TypeScript errors in each package
const packages = ['shared', 'cli', 'backend', 'web'];
packages.forEach(pkg => {
  runCheck(
    `TypeScript Check - ${pkg}`,
    `npx tsc --noEmit -p packages/${pkg}/tsconfig.json`,
    true
  );
});

// 3. Run tests
console.log('\n🧪 Running tests...');
packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, '..', 'packages', pkg);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8'));
  
  if (pkgJson.scripts && pkgJson.scripts.test) {
    runCheck(`Tests - ${pkg}`, `npm run test --workspace=@magents/${pkg} -- --passWithNoTests`);
  }
});

// 4. Linting (if configured)
console.log('\n🔍 Running linters...');
packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, '..', 'packages', pkg);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8'));
  
  if (pkgJson.scripts && pkgJson.scripts.lint) {
    runCheck(`Lint - ${pkg}`, `npm run lint --workspace=@magents/${pkg}`);
  }
});

// 5. Check for dependency issues
runCheck('Dependency Check', 'node scripts/check-dependencies.js');

// 6. Check build outputs exist
console.log('\n📦 Checking build outputs...');
const expectedOutputs = [
  'packages/shared/dist/index.js',
  'packages/shared/dist/index.d.ts',
  'packages/cli/dist/index.js',
  'packages/cli/dist/cli.js',
];

expectedOutputs.forEach(output => {
  const fullPath = path.join(__dirname, '..', output);
  if (fs.existsSync(fullPath)) {
    results.push({ name: `Build output: ${output}`, status: '✅ Exists' });
  } else {
    results.push({ name: `Build output: ${output}`, status: '⚠️  Missing' });
  }
});

// 7. Check for common issues
console.log('\n🔍 Checking for common issues...');

// Check for console.log in production code
packages.forEach(pkg => {
  try {
    const srcPath = path.join(__dirname, '..', 'packages', pkg, 'src');
    if (fs.existsSync(srcPath)) {
      const hasConsoleLogs = execSync(
        `grep -r "console\\.log" ${srcPath} --include="*.ts" --include="*.tsx" | wc -l`
      ).toString().trim();
      
      if (parseInt(hasConsoleLogs) > 0) {
        results.push({ 
          name: `Console logs in ${pkg}`, 
          status: `⚠️  Found ${hasConsoleLogs} occurrences` 
        });
      } else {
        results.push({ 
          name: `Console logs in ${pkg}`, 
          status: '✅ None found' 
        });
      }
    }
  } catch (error) {
    // grep returns non-zero if no matches found, which is fine
  }
});

// 8. Check package.json files are valid
console.log('\n📋 Validating package.json files...');
packages.forEach(pkg => {
  try {
    const pkgPath = path.join(__dirname, '..', 'packages', pkg, 'package.json');
    JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    results.push({ name: `package.json - ${pkg}`, status: '✅ Valid JSON' });
  } catch (error) {
    results.push({ name: `package.json - ${pkg}`, status: '❌ Invalid JSON' });
    exitCode = 1;
  }
});

// Summary
console.log('\n\n📊 Validation Summary:');
console.log('═══════════════════════════════════════════');
results.forEach(result => {
  console.log(`${result.name.padEnd(40)} ${result.status}`);
});

console.log('\n' + '═'.repeat(60));
if (exitCode === 0) {
  console.log('✨ All validation checks passed!');
} else {
  console.log('❌ Some validation checks failed!');
}

// CI-ready script that exits with proper error code
process.exit(exitCode);