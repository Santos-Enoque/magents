const fs = require('fs');
const path = require('path');

describe('Backend and Web Scaffolds', () => {
  const rootDir = path.resolve(__dirname, '..');
  const backendDir = path.join(rootDir, 'packages', 'backend');
  const webDir = path.join(rootDir, 'packages', 'web');
  
  describe('Backend Package', () => {
    test('should have correct directory structure', () => {
      expect(fs.existsSync(backendDir)).toBe(true);
      
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'src/server.ts',
        'src/routes/health.ts',
        'src/routes/agents.ts',
        'src/routes/projects.ts',
        'src/routes/config.ts',
        'src/controllers/agentController.ts',
        'src/controllers/projectController.ts',
        'src/controllers/configController.ts',
        'src/middleware/errorHandler.ts',
        'src/middleware/logger.ts',
        'src/services/websocket.ts'
      ];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(backendDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('package.json should have correct configuration', () => {
      const packageJsonPath = path.join(backendDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.name).toBe('@magents/backend');
      expect(packageJson.main).toBe('dist/server.js');
      expect(packageJson.dependencies['@magents/shared']).toBe('workspace:*');
      expect(packageJson.dependencies.express).toBeDefined();
      expect(packageJson.dependencies.cors).toBeDefined();
      expect(packageJson.dependencies['socket.io']).toBeDefined();
    });

    test('server.ts should import shared package correctly', () => {
      const serverPath = path.join(backendDir, 'src', 'server.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      expect(serverContent).toContain("from '@magents/shared'");
      expect(serverContent).toContain('API_ENDPOINTS');
      expect(serverContent).toContain('WS_EVENTS');
      expect(serverContent).toContain('PORT_RANGES');
    });

    test('routes should define proper API endpoints', () => {
      const routeFiles = ['health.ts', 'agents.ts', 'projects.ts', 'config.ts'];
      
      routeFiles.forEach(file => {
        const routePath = path.join(backendDir, 'src', 'routes', file);
        const routeContent = fs.readFileSync(routePath, 'utf8');
        
        expect(routeContent).toContain('Router');
        expect(routeContent).toContain('export');
        expect(routeContent).toContain('router.get');
      });
    });

    test('controllers should use shared types', () => {
      const controllerFiles = ['agentController.ts', 'projectController.ts', 'configController.ts'];
      
      controllerFiles.forEach(file => {
        const controllerPath = path.join(backendDir, 'src', 'controllers', file);
        const controllerContent = fs.readFileSync(controllerPath, 'utf8');
        
        expect(controllerContent).toContain("from '@magents/shared'");
        expect(controllerContent).toContain('export const');
      });
    });

    test('middleware should handle errors and logging', () => {
      const errorHandlerPath = path.join(backendDir, 'src', 'middleware', 'errorHandler.ts');
      const loggerPath = path.join(backendDir, 'src', 'middleware', 'logger.ts');
      
      const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf8');
      const loggerContent = fs.readFileSync(loggerPath, 'utf8');
      
      expect(errorHandlerContent).toContain('errorHandler');
      expect(errorHandlerContent).toContain('ApiResponse');
      expect(loggerContent).toContain('logger');
      expect(loggerContent).toContain('formatLogMessage');
    });

    test('websocket service should be properly configured', () => {
      const wsPath = path.join(backendDir, 'src', 'services', 'websocket.ts');
      const wsContent = fs.readFileSync(wsPath, 'utf8');
      
      expect(wsContent).toContain('setupWebSocket');
      expect(wsContent).toContain('WebSocketMessage');
      expect(wsContent).toContain('WS_EVENTS');
    });
  });

  describe('Web Package', () => {
    test('should have correct directory structure', () => {
      expect(fs.existsSync(webDir)).toBe(true);
      
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'src/App.tsx',
        'src/index.tsx',
        'src/components/Layout.tsx',
        'src/components/Sidebar.tsx',
        'src/components/Header.tsx',
        'src/pages/Dashboard.tsx',
        'src/services/api.ts',
        'src/hooks/useWebSocket.tsx'
      ];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(webDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('package.json should have correct configuration', () => {
      const packageJsonPath = path.join(webDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.name).toBe('@magents/web');
      expect(packageJson.dependencies['@magents/shared']).toBe('workspace:*');
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();
      expect(packageJson.dependencies['react-router-dom']).toBeDefined();
    });

    test('App.tsx should use React Router and shared types', () => {
      const appPath = path.join(webDir, 'src', 'App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      expect(appContent).toContain('BrowserRouter');
      expect(appContent).toContain('Routes');
      expect(appContent).toContain('Route');
      expect(appContent).toContain('QueryClient');
      expect(appContent).toContain('WebSocketProvider');
    });

    test('API service should use shared types', () => {
      const apiPath = path.join(webDir, 'src', 'services', 'api.ts');
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      expect(apiContent).toContain("from '@magents/shared'");
      expect(apiContent).toContain('Agent');
      expect(apiContent).toContain('Project');
      expect(apiContent).toContain('ApiResponse');
      expect(apiContent).toContain('class ApiService');
    });

    test('WebSocket hook should handle connections', () => {
      const wsHookPath = path.join(webDir, 'src', 'hooks', 'useWebSocket.tsx');
      const wsHookContent = fs.readFileSync(wsHookPath, 'utf8');
      
      expect(wsHookContent).toContain('WebSocketProvider');
      expect(wsHookContent).toContain('useWebSocket');
      expect(wsHookContent).toContain('io');
      expect(wsHookContent).toContain('WebSocketMessage');
      expect(wsHookContent).toContain('AgentEvent');
    });

    test('components should be properly structured', () => {
      const componentFiles = ['Layout.tsx', 'Sidebar.tsx', 'Header.tsx'];
      
      componentFiles.forEach(file => {
        const componentPath = path.join(webDir, 'src', 'components', file);
        const componentContent = fs.readFileSync(componentPath, 'utf8');
        
        expect(componentContent).toContain('React');
        expect(componentContent).toContain('export const');
        expect(componentContent).toContain('React.FC');
      });
    });

    test('pages should be properly structured', () => {
      const pageFiles = ['Dashboard.tsx', 'Agents.tsx', 'Projects.tsx', 'Settings.tsx'];
      
      pageFiles.forEach(file => {
        const pagePath = path.join(webDir, 'src', 'pages', file);
        const pageContent = fs.readFileSync(pagePath, 'utf8');
        
        expect(pageContent).toContain('React');
        expect(pageContent).toContain('export const');
        expect(pageContent).toContain('React.FC');
      });
    });

    test('Vite config should be properly configured', () => {
      const vitePath = path.join(webDir, 'vite.config.ts');
      const viteContent = fs.readFileSync(vitePath, 'utf8');
      
      expect(viteContent).toContain('defineConfig');
      expect(viteContent).toContain('react');
      expect(viteContent).toContain('proxy');
      expect(viteContent).toContain('/api');
    });
  });

  describe('Integration', () => {
    test('both packages should reference shared package correctly', () => {
      const backendPackageJson = JSON.parse(
        fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8')
      );
      const webPackageJson = JSON.parse(
        fs.readFileSync(path.join(webDir, 'package.json'), 'utf8')
      );
      
      expect(backendPackageJson.dependencies['@magents/shared']).toBe('workspace:*');
      expect(webPackageJson.dependencies['@magents/shared']).toBe('workspace:*');
    });

    test('TypeScript configs should be properly set up', () => {
      const backendTsConfig = JSON.parse(
        fs.readFileSync(path.join(backendDir, 'tsconfig.json'), 'utf8')
      );
      const webTsConfig = JSON.parse(
        fs.readFileSync(path.join(webDir, 'tsconfig.json'), 'utf8')
      );
      
      expect(backendTsConfig.compilerOptions.outDir).toBe('./dist');
      expect(backendTsConfig.compilerOptions.strict).toBe(true);
      expect(webTsConfig.compilerOptions.jsx).toBe('react-jsx');
      expect(webTsConfig.compilerOptions.strict).toBe(true);
    });

    test('shared package should be available to both packages', () => {
      const sharedDir = path.join(rootDir, 'packages', 'shared');
      const sharedDistDir = path.join(sharedDir, 'dist');
      
      expect(fs.existsSync(sharedDistDir)).toBe(true);
      expect(fs.existsSync(path.join(sharedDistDir, 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(sharedDistDir, 'index.d.ts'))).toBe(true);
    });
  });
});