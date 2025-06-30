#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up development environment...\n');

// Check for .env files
console.log('📋 Checking environment configuration...');
const envExample = path.join(__dirname, '..', '.env.example');
const envFile = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
  console.log('⚠️  No .env file found. Creating from .env.example...');
  fs.copyFileSync(envExample, envFile);
  console.log('✅ Created .env file. Please update with your API keys.');
} else if (fs.existsSync(envFile)) {
  console.log('✅ .env file exists');
}

// Create development .env files for packages if needed
const packages = ['backend', 'web'];
packages.forEach(pkg => {
  const pkgEnvExample = path.join(__dirname, '..', 'packages', pkg, '.env.example');
  const pkgEnvFile = path.join(__dirname, '..', 'packages', pkg, '.env');
  
  if (!fs.existsSync(pkgEnvFile) && fs.existsSync(pkgEnvExample)) {
    console.log(`⚠️  No .env file found for ${pkg}. Creating from .env.example...`);
    fs.copyFileSync(pkgEnvExample, pkgEnvFile);
  }
});

// Install dependencies if needed
console.log('\n📦 Checking dependencies...');
if (!fs.existsSync('node_modules')) {
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
}

// Build shared package first (required by others)
console.log('\n🔨 Building shared package...');
try {
  execSync('npm run build:shared', { stdio: 'inherit' });
  console.log('✅ Shared package built successfully');
} catch (error) {
  console.error('❌ Failed to build shared package');
  process.exit(1);
}

// Create dev environment info
console.log('\n📝 Development Environment Info:');
console.log('═══════════════════════════════════');
console.log('Backend URL: http://localhost:3001');
console.log('Frontend URL: http://localhost:5173');
console.log('WebSocket URL: ws://localhost:3001');
console.log('\n🎯 Available dev commands:');
console.log('  npm run dev           - Start backend and frontend concurrently');
console.log('  npm run dev:backend   - Start backend server only');
console.log('  npm run dev:web       - Start frontend dev server only');
console.log('  npm run dev:cli       - Watch CLI package changes');
console.log('  npm run build:watch   - Watch all TypeScript files');

// Create or update VS Code settings for the workspace
console.log('\n🔧 Configuring VS Code workspace...');
const vscodeDir = path.join(__dirname, '..', '.vscode');
if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir);
}

const vscodeSettings = {
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": [
    { "directory": "packages/cli", "changeProcessCWD": true },
    { "directory": "packages/backend", "changeProcessCWD": true },
    { "directory": "packages/web", "changeProcessCWD": true },
    { "directory": "packages/shared", "changeProcessCWD": true }
  ]
};

fs.writeFileSync(
  path.join(vscodeDir, 'settings.json'),
  JSON.stringify(vscodeSettings, null, 2)
);
console.log('✅ VS Code workspace settings configured');

console.log('\n✨ Development environment setup complete!');
console.log('🚀 Run "npm run dev" to start development servers');