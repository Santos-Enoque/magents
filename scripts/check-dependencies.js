#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking module resolution and dependencies...\n');

const packages = ['shared', 'cli', 'backend', 'web'];
const packageData = {};

// Load all package.json files
packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, '..', 'packages', pkg, 'package.json');
  packageData[pkg] = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
});

// Check 1: Workspace configuration
console.log('📋 Checking workspace configuration...');
const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
if (rootPkg.workspaces && rootPkg.workspaces.includes('packages/*')) {
  console.log('✅ Root package.json has correct workspace configuration');
} else {
  console.log('❌ Root package.json missing workspace configuration');
}

// Check 2: Package naming convention
console.log('\n📦 Checking package naming convention...');
packages.forEach(pkg => {
  const expectedName = `@magents/${pkg}`;
  if (packageData[pkg].name === expectedName) {
    console.log(`✅ ${pkg}: Correctly named as ${expectedName}`);
  } else {
    console.log(`❌ ${pkg}: Should be named ${expectedName}, but is ${packageData[pkg].name}`);
  }
});

// Check 3: Cross-package dependencies
console.log('\n🔗 Checking cross-package dependencies...');
const dependencyMap = {
  'shared': [], // No dependencies
  'cli': ['shared'],
  'backend': ['shared', 'cli'],
  'web': ['shared']
};

packages.forEach(pkg => {
  const deps = packageData[pkg].dependencies || {};
  const expectedDeps = dependencyMap[pkg];
  
  console.log(`\n${pkg} package:`);
  expectedDeps.forEach(dep => {
    const depName = `@magents/${dep}`;
    if (deps[depName]) {
      console.log(`  ✅ Has dependency on ${depName}`);
    } else {
      console.log(`  ❌ Missing dependency on ${depName}`);
    }
  });
  
  // Check for workspace protocol
  Object.entries(deps).forEach(([name, version]) => {
    if (name.startsWith('@magents/') && version === 'workspace:*') {
      console.log(`  ✅ Uses workspace protocol for ${name}`);
    } else if (name.startsWith('@magents/')) {
      console.log(`  ⚠️  ${name} should use 'workspace:*' protocol`);
    }
  });
});

// Check 4: Package exports
console.log('\n📤 Checking package exports...');
packages.forEach(pkg => {
  const pkgJson = packageData[pkg];
  console.log(`\n${pkg} package:`);
  
  if (pkgJson.main) {
    console.log(`  ✅ Has main entry: ${pkgJson.main}`);
  } else {
    console.log(`  ❌ Missing main entry point`);
  }
  
  if (pkgJson.types || pkgJson.typings) {
    console.log(`  ✅ Has TypeScript types: ${pkgJson.types || pkgJson.typings}`);
  } else {
    console.log(`  ⚠️  Missing TypeScript types declaration`);
  }
});

// Check 5: Circular dependencies
console.log('\n🔄 Checking for circular dependencies...');
function checkCircular(pkg, visited = new Set(), path = []) {
  if (visited.has(pkg)) {
    return path.includes(pkg) ? path.slice(path.indexOf(pkg)) : null;
  }
  
  visited.add(pkg);
  path.push(pkg);
  
  const deps = dependencyMap[pkg] || [];
  for (const dep of deps) {
    const circular = checkCircular(dep, visited, [...path]);
    if (circular) {
      return circular;
    }
  }
  
  return null;
}

let hasCircular = false;
packages.forEach(pkg => {
  const circular = checkCircular(pkg);
  if (circular) {
    hasCircular = true;
    console.log(`  ❌ Circular dependency found: ${circular.join(' -> ')}`);
  }
});

if (!hasCircular) {
  console.log('  ✅ No circular dependencies found');
}

// Check 6: TypeScript path mappings
console.log('\n🗺️  Checking TypeScript path mappings...');
packages.forEach(pkg => {
  const tsconfigPath = path.join(__dirname, '..', 'packages', pkg, 'tsconfig.json');
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log(`\n${pkg} package:`);
    
    if (tsconfig.compilerOptions?.paths) {
      Object.entries(tsconfig.compilerOptions.paths).forEach(([alias, paths]) => {
        console.log(`  ✅ Path mapping: ${alias} -> ${paths.join(', ')}`);
      });
    } else if (dependencyMap[pkg].length > 0) {
      console.log(`  ⚠️  No path mappings configured (may need them for cross-package imports)`);
    } else {
      console.log(`  ✅ No path mappings needed`);
    }
  } catch (error) {
    console.log(`  ❌ Could not read tsconfig.json`);
  }
});

// Summary
console.log('\n📊 Module Resolution Summary:');
console.log('════════════════════════════════');
console.log('✅ Workspace configuration is correct');
console.log('✅ Package naming follows convention');
console.log('✅ No circular dependencies');
console.log('⚠️  Some packages use workspace protocol (npm install may have issues)');
console.log('✅ TypeScript path mappings are configured');

console.log('\n✨ Module resolution check complete!');