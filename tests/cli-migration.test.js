const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('CLI Migration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const cliPackageDir = path.join(rootDir, 'packages', 'cli');
  
  test('CLI package should exist with correct structure', () => {
    expect(fs.existsSync(cliPackageDir)).toBe(true);
    expect(fs.statSync(cliPackageDir).isDirectory()).toBe(true);
    
    // Check essential files exist
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/bin/magents.ts',
      'src/index.ts'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(cliPackageDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('CLI package.json should have correct configuration', () => {
    const packageJsonPath = path.join(cliPackageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('@magents/cli');
    expect(packageJson.main).toBe('dist/index.js');
    expect(packageJson.types).toBe('dist/index.d.ts');
    expect(packageJson.bin.magents).toBe('dist/bin/magents.js');
    expect(packageJson.dependencies['@magents/shared']).toBe('workspace:*');
  });

  test('CLI should have all required source files', () => {
    const srcDir = path.join(cliPackageDir, 'src');
    const requiredDirs = ['bin', 'config', 'services', 'types', 'ui', 'scripts'];
    
    requiredDirs.forEach(dir => {
      const dirPath = path.join(srcDir, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });
    
    // Check key files
    const keyFiles = [
      'bin/magents.ts',
      'config/ConfigManager.ts',
      'services/AgentManager.ts',
      'services/GitService.ts',
      'services/TmuxService.ts',
      'types/index.ts',
      'ui/UIService.ts',
      'ui/ascii-art.ts',
      'scripts/postinstall.js'
    ];
    
    keyFiles.forEach(file => {
      const filePath = path.join(srcDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('CLI should build successfully', () => {
    expect(() => {
      execSync('npm run build', { 
        cwd: cliPackageDir, 
        stdio: 'pipe' 
      });
    }).not.toThrow();
    
    // Check that dist directory was created
    const distDir = path.join(cliPackageDir, 'dist');
    expect(fs.existsSync(distDir)).toBe(true);
    
    // Check that key output files exist
    const outputFiles = [
      'index.js',
      'index.d.ts',
      'bin/magents.js',
      'scripts/postinstall.js'
    ];
    
    outputFiles.forEach(file => {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('CLI binary should be executable and show help', () => {
    const magentsPath = path.join(cliPackageDir, 'dist', 'bin', 'magents.js');
    
    // Ensure the CLI was built
    if (!fs.existsSync(magentsPath)) {
      execSync('npm run build', { cwd: cliPackageDir, stdio: 'pipe' });
    }
    
    expect(fs.existsSync(magentsPath)).toBe(true);
    
    // Test that CLI runs and shows help
    const helpOutput = execSync(`node ${magentsPath} --help`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    expect(helpOutput).toContain('Multi-Agent Claude Code Workflow Manager');
    expect(helpOutput).toContain('create');
    expect(helpOutput).toContain('list');
    expect(helpOutput).toContain('attach');
  });

  test('CLI should export main modules correctly', () => {
    const indexPath = path.join(cliPackageDir, 'dist', 'index.js');
    
    // Ensure the CLI was built
    if (!fs.existsSync(indexPath)) {
      execSync('npm run build', { cwd: cliPackageDir, stdio: 'pipe' });
    }
    
    expect(fs.existsSync(indexPath)).toBe(true);
    
    // Test that the compiled index.js contains the expected exports
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('AgentManager');
    expect(indexContent).toContain('ConfigManager');
    expect(indexContent).toContain('TmuxService');
    expect(indexContent).toContain('GitService');
  });

  test('original src directory should still exist for comparison', () => {
    const originalSrcDir = path.join(rootDir, 'src');
    expect(fs.existsSync(originalSrcDir)).toBe(true);
    
    // The original should have the same structure as the migrated version
    const expectedDirs = ['bin', 'config', 'services', 'types', 'ui', 'scripts'];
    expectedDirs.forEach(dir => {
      const originalDir = path.join(originalSrcDir, dir);
      const migratedDir = path.join(cliPackageDir, 'src', dir);
      
      expect(fs.existsSync(originalDir)).toBe(true);
      expect(fs.existsSync(migratedDir)).toBe(true);
    });
  });

  test('tsconfig.json should be properly configured', () => {
    const tsconfigPath = path.join(cliPackageDir, 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    expect(tsconfig.compilerOptions.module).toBe('commonjs');
    expect(tsconfig.include).toContain('src/**/*');
  });
});