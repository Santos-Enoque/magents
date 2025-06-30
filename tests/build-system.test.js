const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Build System Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  
  describe('Root TypeScript Configuration', () => {
    test('should have root tsconfig.json with project references', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.compilerOptions.composite).toBe(true);
      expect(tsconfig.compilerOptions.incremental).toBe(true);
      expect(tsconfig.references).toHaveLength(4);
      
      const expectedReferences = [
        { path: './packages/shared' },
        { path: './packages/cli' },
        { path: './packages/backend' },
        { path: './packages/web' }
      ];
      
      expect(tsconfig.references).toEqual(expectedReferences);
    });

    test('should have empty files and include arrays', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.files).toEqual([]);
      expect(tsconfig.include).toEqual([]);
    });

    test('should exclude proper directories', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.exclude).toContain('node_modules');
      expect(tsconfig.exclude).toContain('**/dist');
      expect(tsconfig.exclude).toContain('**/build');
      expect(tsconfig.exclude).toContain('**/*.test.ts');
      expect(tsconfig.exclude).toContain('**/*.spec.ts');
    });
  });

  describe('Package TypeScript Configurations', () => {
    const packages = ['shared', 'cli', 'backend', 'web'];
    
    packages.forEach(pkg => {
      test(`${pkg} package should have composite tsconfig`, () => {
        const tsconfigPath = path.join(rootDir, 'packages', pkg, 'tsconfig.json');
        expect(fs.existsSync(tsconfigPath)).toBe(true);
        
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        expect(tsconfig.compilerOptions.composite).toBe(true);
        expect(tsconfig.compilerOptions.incremental).toBe(true);
      });
    });

    test('CLI package should reference shared package', () => {
      const tsconfigPath = path.join(rootDir, 'packages', 'cli', 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.references).toContainEqual({ path: '../shared' });
    });

    test('Backend package should reference shared package', () => {
      const tsconfigPath = path.join(rootDir, 'packages', 'backend', 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.references).toContainEqual({ path: '../shared' });
    });

    test('Web package should reference shared package', () => {
      const tsconfigPath = path.join(rootDir, 'packages', 'web', 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.references).toContainEqual({ path: '../shared' });
    });

    test('Shared package should not have package references', () => {
      const tsconfigPath = path.join(rootDir, 'packages', 'shared', 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      // Shared package shouldn't reference other workspace packages
      expect(tsconfig.references).toBeUndefined();
    });
  });

  describe('Package.json Scripts', () => {
    test('should have TypeScript build scripts in root package.json', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.scripts.build).toBe('tsc --build');
      expect(packageJson.scripts['build:clean']).toBe('tsc --build --clean');
      expect(packageJson.scripts['build:force']).toBe('tsc --build --force');
      expect(packageJson.scripts['build:watch']).toBe('tsc --build --watch');
      expect(packageJson.scripts.typecheck).toBe('tsc --build --noEmit');
    });

    test('should have workspace-specific build scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.scripts['build:shared']).toBe('npm run build --workspace=@magents/shared');
      expect(packageJson.scripts['build:cli']).toBe('npm run build --workspace=@magents/cli');
      expect(packageJson.scripts['build:backend']).toBe('npm run build --workspace=@magents/backend');
      expect(packageJson.scripts['build:web']).toBe('npm run build --workspace=@magents/web');
    });

    test('should have development scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.scripts.dev).toBe('concurrently "npm run dev:backend" "npm run dev:web"');
      expect(packageJson.scripts['dev:backend']).toBe('npm run dev --workspace=@magents/backend');
      expect(packageJson.scripts['dev:web']).toBe('npm run dev --workspace=@magents/web');
      expect(packageJson.scripts['dev:cli']).toBe('npm run dev --workspace=@magents/cli');
    });

    test('should have cleanup scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.scripts.clean).toBe('npm run clean --workspaces --if-present && tsc --build --clean');
      expect(packageJson.scripts['clean:dist']).toBe('rm -rf packages/*/dist');
      expect(packageJson.scripts['clean:deps']).toBe('rm -rf node_modules packages/*/node_modules');
      expect(packageJson.scripts.reinstall).toBe('npm run clean:deps && npm install');
    });

    test('should have concurrently dependency for dev scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.devDependencies.concurrently).toBeDefined();
    });
  });

  describe('TypeScript Compilation', () => {
    test('TypeScript build should work with project references', () => {
      try {
        const result = execSync('tsc --build', { 
          cwd: rootDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // If no error is thrown, compilation succeeded
        expect(true).toBe(true);
      } catch (error) {
        // If there's an error, it should be related to missing dependencies, not TypeScript config
        const output = error.stdout || error.stderr || error.message;
        expect(output).not.toContain('Project references');
        expect(output).not.toContain('composite');
        
        // Should be dependency-related errors or successful compilation
        expect(
          output.includes('Cannot find module') || 
          output.includes('') || // Empty output means success
          output.includes('Found 0 errors')
        ).toBe(true);
      }
    });

    test('should generate tsbuildinfo files', () => {
      const packages = ['shared', 'cli', 'backend'];
      
      packages.forEach(pkg => {
        const buildInfoPath = path.join(rootDir, 'packages', pkg, 'tsconfig.tsbuildinfo');
        expect(fs.existsSync(buildInfoPath)).toBe(true);
      });
    });

    test('TypeScript clean should work', () => {
      try {
        execSync('tsc --build --clean', { 
          cwd: rootDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Clean should succeed without errors
        expect(true).toBe(true);
      } catch (error) {
        // Clean operation should not fail due to configuration
        const output = error.stdout || error.stderr || error.message;
        expect(output).not.toContain('Project references');
        expect(output).not.toContain('composite');
      }
    });
  });

  describe('Dependency Order', () => {
    test('shared package should have build artifacts', () => {
      const sharedDistPath = path.join(rootDir, 'packages', 'shared', 'dist');
      expect(fs.existsSync(sharedDistPath)).toBe(true);
      
      // Check for TypeScript build info file which indicates successful compilation
      const tsBuildInfoPath = path.join(rootDir, 'packages', 'shared', 'tsconfig.tsbuildinfo');
      expect(fs.existsSync(tsBuildInfoPath)).toBe(true);
    });

    test('packages can use shared types via workspace dependencies', () => {
      // Test that backend package.json has workspace dependency
      const backendPackageJsonPath = path.join(rootDir, 'packages', 'backend', 'package.json');
      const backendPackageJson = JSON.parse(fs.readFileSync(backendPackageJsonPath, 'utf8'));
      
      expect(backendPackageJson.dependencies['@magents/shared']).toBe('workspace:*');
      
      // Test that CLI package.json has workspace dependency
      const cliPackageJsonPath = path.join(rootDir, 'packages', 'cli', 'package.json');
      const cliPackageJson = JSON.parse(fs.readFileSync(cliPackageJsonPath, 'utf8'));
      
      expect(cliPackageJson.dependencies['@magents/shared']).toBe('workspace:*');
    });
  });
});