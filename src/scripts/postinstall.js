#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_FILE = path.join(os.homedir(), '.magents-config');
const AGENTS_DIR = path.join(os.homedir(), '.magents');

console.log('🚀 Setting up magents...');

// Check dependencies
const dependencies = ['git', 'tmux'];
const missing = [];

dependencies.forEach(dep => {
  try {
    execSync(`which ${dep}`, { stdio: 'pipe' });
  } catch {
    missing.push(dep);
  }
});

if (missing.length > 0) {
  console.log('⚠️  Missing dependencies:', missing.join(', '));
  console.log('   Please install them before using magents');
}

// Create agents directory
if (!fs.existsSync(AGENTS_DIR)) {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  console.log('✅ Created magents directory');
}

// Create default config if it doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
  const defaultConfig = `# magents Configuration
DEFAULT_BASE_BRANCH=main
TMUX_SESSION_PREFIX=magent
WORKTREE_PREFIX=agent
MAX_AGENTS=5
CLAUDE_CODE_PATH=claude
CLAUDE_AUTO_ACCEPT=true
`;

  fs.writeFileSync(CONFIG_FILE, defaultConfig);
  console.log('✅ Created default configuration');
}

console.log('');
console.log('🎉 magents installed successfully!');
console.log('');
console.log('Quick start:');
console.log('  magents create feature/my-feature');
console.log('  magents list');
console.log('  magents attach <agent-id>');
console.log('');
console.log('Requirements:');
console.log('  - git ✅');
console.log('  - tmux ✅');
console.log('  - claude (Claude Code CLI)');
console.log('');
console.log('Run "magents --help" for more information.');
console.log('');