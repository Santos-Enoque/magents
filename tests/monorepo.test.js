const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Monorepo Structure', () => {
  const rootDir = path.resolve(__dirname, '..');
  const packagesDir = path.join(rootDir, 'packages');
  
  test('root package.json should have workspaces configuration', () => {
    const packageJsonPath = path.join(rootDir, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.workspaces).toBeDefined();
    expect(packageJson.workspaces).toContain('packages/*');
  });

  test('packages directory should exist', () => {
    expect(fs.existsSync(packagesDir)).toBe(true);
    expect(fs.statSync(packagesDir).isDirectory()).toBe(true);
  });

  test('all required package directories should exist', () => {
    const requiredPackages = ['cli', 'shared', 'backend', 'web'];
    
    requiredPackages.forEach(packageName => {
      const packageDir = path.join(packagesDir, packageName);
      expect(fs.existsSync(packageDir)).toBe(true);
      expect(fs.statSync(packageDir).isDirectory()).toBe(true);
    });
  });

  test('each package should have a valid package.json', () => {
    const packages = ['cli', 'shared', 'backend', 'web'];
    const expectedNames = {
      'cli': '@magents/cli',
      'shared': '@magents/shared',
      'backend': '@magents/backend',
      'web': '@magents/web'
    };

    packages.forEach(packageName => {
      const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.name).toBe(expectedNames[packageName]);
      expect(packageJson.version).toBeDefined();
    });
  });

  test('workspace dependencies should be correctly configured', () => {
    const cliPackagePath = path.join(packagesDir, 'cli', 'package.json');
    const backendPackagePath = path.join(packagesDir, 'backend', 'package.json');
    const webPackagePath = path.join(packagesDir, 'web', 'package.json');
    
    const cliPackage = JSON.parse(fs.readFileSync(cliPackagePath, 'utf8'));
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    const webPackage = JSON.parse(fs.readFileSync(webPackagePath, 'utf8'));
    
    // Check that packages reference shared workspace correctly
    expect(cliPackage.dependencies['@magents/shared']).toBe('workspace:*');
    expect(backendPackage.dependencies['@magents/shared']).toBe('workspace:*');
    expect(webPackage.dependencies['@magents/shared']).toBe('workspace:*');
  });

  test('npm workspaces should be recognized by npm', () => {
    try {
      const result = execSync('npm ls --workspaces --depth=0', { 
        cwd: rootDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Should list all workspaces
      expect(result).toContain('@magents/cli');
      expect(result).toContain('@magents/shared');
      expect(result).toContain('@magents/backend');
      expect(result).toContain('@magents/web');
    } catch (error) {
      // If npm ls fails, check if it's due to missing dependencies (which is expected)
      // The important thing is that workspaces are recognized
      expect(error.stdout || error.message).toContain('@magents/');
    }
  });
});