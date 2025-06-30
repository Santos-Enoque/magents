const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Shared Package', () => {
  const rootDir = path.resolve(__dirname, '..');
  const sharedPackageDir = path.join(rootDir, 'packages', 'shared');
  
  test('shared package should exist with correct structure', () => {
    expect(fs.existsSync(sharedPackageDir)).toBe(true);
    expect(fs.statSync(sharedPackageDir).isDirectory()).toBe(true);
    
    // Check essential files exist
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/types/index.ts',
      'src/utils/index.ts',
      'src/constants.ts'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(sharedPackageDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('shared package.json should have correct configuration', () => {
    const packageJsonPath = path.join(sharedPackageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.name).toBe('@magents/shared');
    expect(packageJson.main).toBe('dist/index.js');
    expect(packageJson.types).toBe('dist/index.d.ts');
    expect(packageJson.version).toBe('1.0.0');
  });

  test('shared package should build successfully', () => {
    expect(() => {
      execSync('npm run build', { 
        cwd: sharedPackageDir, 
        stdio: 'pipe' 
      });
    }).not.toThrow();
    
    // Check that dist directory was created
    const distDir = path.join(sharedPackageDir, 'dist');
    expect(fs.existsSync(distDir)).toBe(true);
    
    // Check that key output files exist
    const outputFiles = [
      'index.js',
      'index.d.ts',
      'constants.js',
      'constants.d.ts',
      'types/index.js',
      'types/index.d.ts',
      'utils/index.js',
      'utils/index.d.ts'
    ];
    
    outputFiles.forEach(file => {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('shared package should export main modules correctly', () => {
    const indexPath = path.join(sharedPackageDir, 'dist', 'index.js');
    
    // Ensure the package was built
    if (!fs.existsSync(indexPath)) {
      execSync('npm run build', { cwd: sharedPackageDir, stdio: 'pipe' });
    }
    
    expect(fs.existsSync(indexPath)).toBe(true);
    
    // Test that the compiled index.js contains the expected exports
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('generateId');
    expect(indexContent).toContain('generateAgentId');
    expect(indexContent).toContain('DEFAULT_CONFIG');
    expect(indexContent).toContain('AGENT_STATUS');
    expect(indexContent).toContain('VERSION');
  });

  test('types should be comprehensive and well-structured', () => {
    const typesPath = path.join(sharedPackageDir, 'src', 'types', 'index.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    // Check for core interfaces
    expect(typesContent).toContain('interface MagentsConfig');
    expect(typesContent).toContain('interface Agent');
    expect(typesContent).toContain('interface CommandResult');
    expect(typesContent).toContain('interface CreateAgentOptions');
    expect(typesContent).toContain('interface ApiResponse');
    expect(typesContent).toContain('interface TaskMasterTask');
    
    // Check for type definitions
    expect(typesContent).toContain('type AgentStatus');
    expect(typesContent).toContain('type ProjectStatus');
  });

  test('utilities should provide useful common functions', () => {
    const utilsPath = path.join(sharedPackageDir, 'src', 'utils', 'index.ts');
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    
    // Check for key utility functions
    const expectedFunctions = [
      'generateId',
      'generateAgentId',
      'sanitizeBranchName',
      'formatDate',
      'getRelativeTime',
      'deepMerge',
      'createSuccessResult',
      'createErrorResult',
      'delay',
      'retry',
      'isValidEmail',
      'isValidPort',
      'isValidPortRange'
    ];
    
    expectedFunctions.forEach(func => {
      expect(utilsContent).toContain(`function ${func}`);
    });
  });

  test('constants should define useful values', () => {
    const constantsPath = path.join(sharedPackageDir, 'src', 'constants.ts');
    const constantsContent = fs.readFileSync(constantsPath, 'utf8');
    
    // Check for key constants
    const expectedConstants = [
      'DEFAULT_CONFIG',
      'AGENT_STATUS',
      'PROJECT_STATUS',
      'TASK_STATUS',
      'ERROR_CODES',
      'API_ENDPOINTS',
      'WS_EVENTS',
      'COLORS',
      'FEATURES'
    ];
    
    expectedConstants.forEach(constant => {
      expect(constantsContent).toContain(constant);
    });
  });

  test('tsconfig should be properly configured for library', () => {
    const tsconfigPath = path.join(sharedPackageDir, 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    expect(tsconfig.compilerOptions.declaration).toBe(true);
    expect(tsconfig.compilerOptions.declarationMap).toBe(true);
    expect(tsconfig.include).toContain('src/**/*');
  });

  test('main index should export all modules', () => {
    const indexPath = path.join(sharedPackageDir, 'src', 'index.ts');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check that all modules are exported
    expect(indexContent).toContain("export * from './types'");
    expect(indexContent).toContain("export * from './utils'");
    expect(indexContent).toContain("export * from './constants'");
    expect(indexContent).toContain('VERSION');
    expect(indexContent).toContain('PACKAGE_INFO');
  });

  test('package should work with workspace dependencies', () => {
    // Test that the shared package can be imported by other packages
    const cliPackageJson = path.join(rootDir, 'packages', 'cli', 'package.json');
    if (fs.existsSync(cliPackageJson)) {
      const cliPackage = JSON.parse(fs.readFileSync(cliPackageJson, 'utf8'));
      expect(cliPackage.dependencies['@magents/shared']).toBe('workspace:*');
    }
  });
});