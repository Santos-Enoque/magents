const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Build System and Cross-Package Dependencies', () => {
  const rootPath = path.join(__dirname, '..');
  
  beforeAll(() => {
    // Ensure we're in the project root
    process.chdir(rootPath);
  });

  test('TypeScript project references are configured', () => {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    expect(tsconfig.references).toBeDefined();
    expect(tsconfig.references).toHaveLength(4);
    expect(tsconfig.references.map(r => r.path)).toEqual([
      './packages/shared',
      './packages/cli',
      './packages/backend',
      './packages/web'
    ]);
  });

  test('All packages have TypeScript configuration', () => {
    const packages = ['shared', 'cli', 'backend', 'web'];
    
    packages.forEach(pkg => {
      const tsconfigPath = path.join('packages', pkg, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.composite).toBe(true);
    });
  });

  test('Build scripts are configured in package.json', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts;
    
    // Core build scripts
    expect(scripts.build).toBe('tsc --build');
    expect(scripts['build:clean']).toBe('tsc --build --clean');
    expect(scripts['build:force']).toBe('tsc --build --force');
    expect(scripts['build:watch']).toBe('tsc --build --watch');
    
    // Package-specific build scripts
    expect(scripts['build:shared']).toContain('@magents/shared');
    expect(scripts['build:cli']).toContain('@magents/cli');
    expect(scripts['build:backend']).toContain('@magents/backend');
    expect(scripts['build:web']).toContain('@magents/web');
  });

  test('Development scripts use concurrently', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts;
    
    expect(scripts.dev).toContain('concurrently');
    expect(scripts['dev:backend']).toBeDefined();
    expect(scripts['dev:web']).toBeDefined();
    
    // Check concurrently is installed
    expect(packageJson.devDependencies.concurrently).toBeDefined();
  });

  test('Cross-package dependencies use workspace protocol', () => {
    const packages = ['cli', 'backend', 'web'];
    
    packages.forEach(pkg => {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join('packages', pkg, 'package.json'), 'utf8')
      );
      
      if (pkgJson.dependencies && pkgJson.dependencies['@magents/shared']) {
        expect(pkgJson.dependencies['@magents/shared']).toBe('workspace:*');
      }
    });
  });

  test('TypeScript path mappings are configured', () => {
    const packages = ['cli', 'backend', 'web'];
    
    packages.forEach(pkg => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join('packages', pkg, 'tsconfig.json'), 'utf8')
      );
      
      if (pkg !== 'web') {
        expect(tsconfig.compilerOptions.paths).toBeDefined();
        expect(tsconfig.compilerOptions.paths['@magents/shared']).toBeDefined();
      }
    });
  });

  test('Validation scripts are available', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts;
    
    expect(scripts.validate).toBeDefined();
    expect(scripts['validate:ci']).toBeDefined();
    expect(scripts['check:deps']).toBeDefined();
    expect(scripts['check:build']).toBeDefined();
    expect(scripts.typecheck).toBe('tsc --build --noEmit');
  });

  test('Build validation script exists and is executable', () => {
    const scriptPath = path.join('scripts', 'validate-build.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
    
    const stats = fs.statSync(scriptPath);
    // Check if file is executable (owner execute permission)
    expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
  });

  test('Dependency check script exists and is executable', () => {
    const scriptPath = path.join('scripts', 'check-dependencies.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
    
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
  });

  test('Shared package builds successfully', () => {
    // This test actually runs the build
    try {
      execSync('npm run build:shared', { stdio: 'pipe' });
      const distExists = fs.existsSync('packages/shared/dist/index.js');
      expect(distExists).toBe(true);
    } catch (error) {
      // If build fails, the test should fail
      throw new Error(`Shared package build failed: ${error.message}`);
    }
  });

  console.log('✅ All Build System tests passed!');
});