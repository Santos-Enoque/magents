#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const packages = ['shared', 'cli', 'backend', 'web'];
const results = [];

console.log('🔍 Validating build system...\n');

// Check TypeScript project references
console.log('📋 Checking TypeScript project references...');
try {
  const rootTsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  console.log('✅ Root tsconfig.json has references:', rootTsConfig.references.map(r => r.path).join(', '));
} catch (error) {
  console.error('❌ Failed to read root tsconfig.json:', error.message);
}

console.log('\n📦 Building packages in dependency order...\n');

// Build shared package first (no dependencies)
console.log('1️⃣ Building @magents/shared...');
try {
  execSync('npm run build --workspace=@magents/shared', { stdio: 'inherit' });
  results.push({ package: 'shared', status: '✅ Success' });
} catch (error) {
  results.push({ package: 'shared', status: '❌ Failed' });
}

// Build CLI package (depends on shared)
console.log('\n2️⃣ Building @magents/cli...');
try {
  execSync('npm run build --workspace=@magents/cli', { stdio: 'inherit' });
  results.push({ package: 'cli', status: '✅ Success' });
} catch (error) {
  results.push({ package: 'cli', status: '❌ Failed' });
}

// Build backend package (depends on shared and cli)
console.log('\n3️⃣ Building @magents/backend...');
try {
  // First check if dependencies are installed
  const backendPath = path.join('packages', 'backend');
  if (!fs.existsSync(path.join(backendPath, 'node_modules'))) {
    console.log('   Installing backend dependencies...');
    execSync('npm install', { cwd: backendPath, stdio: 'inherit' });
  }
  execSync('npm run build --workspace=@magents/backend', { stdio: 'inherit' });
  results.push({ package: 'backend', status: '✅ Success' });
} catch (error) {
  results.push({ package: 'backend', status: '❌ Failed' });
}

// Build web package (depends on shared)
console.log('\n4️⃣ Building @magents/web...');
try {
  // Web package uses vite, which has different build process
  const webPath = path.join('packages', 'web');
  if (!fs.existsSync(path.join(webPath, 'node_modules'))) {
    console.log('   Installing web dependencies...');
    execSync('npm install', { cwd: webPath, stdio: 'inherit' });
  }
  execSync('npm run build --workspace=@magents/web', { stdio: 'inherit' });
  results.push({ package: 'web', status: '✅ Success' });
} catch (error) {
  results.push({ package: 'web', status: '❌ Failed (Note: Web uses Vite for builds)' });
}

// Try TypeScript project build
console.log('\n🔨 Attempting TypeScript project build...');
try {
  execSync('npx tsc --build --dry', { stdio: 'inherit' });
  console.log('✅ TypeScript project references are correctly configured');
} catch (error) {
  console.log('⚠️  TypeScript project build has issues (this is expected if packages have missing dependencies)');
}

// Summary
console.log('\n📊 Build Validation Summary:');
console.log('═══════════════════════════════');
results.forEach(result => {
  console.log(`${result.package.padEnd(10)} ${result.status}`);
});

// Check for cross-package imports
console.log('\n🔗 Checking cross-package imports...');
packages.forEach(pkg => {
  const pkgPath = path.join('packages', pkg, 'tsconfig.json');
  try {
    const tsConfig = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (tsConfig.compilerOptions?.paths) {
      console.log(`✅ ${pkg}: Has path mappings for`, Object.keys(tsConfig.compilerOptions.paths).join(', '));
    }
    if (tsConfig.references) {
      console.log(`✅ ${pkg}: References`, tsConfig.references.map(r => r.path).join(', '));
    }
  } catch (error) {
    console.log(`⚠️  ${pkg}: Could not read tsconfig.json`);
  }
});

console.log('\n✨ Build validation complete!');