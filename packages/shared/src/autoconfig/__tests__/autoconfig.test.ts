/**
 * Tests for Auto-Configuration System
 */

import * as fs from 'fs';
import * as path from 'path';
import { autoConfig, AutoConfigService, PROJECT_PATTERNS, ProjectDetectionResult } from '../index';

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  },
  constants: {
    F_OK: 0
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Auto-Configuration System', () => {
  let service: AutoConfigService;
  
  beforeEach(() => {
    service = AutoConfigService.getInstance();
    jest.clearAllMocks();
  });

  describe('Project Type Detection', () => {
    it('should detect React project correctly', async () => {
      // Mock file system responses
      mockFs.promises.access
        .mockResolvedValueOnce(undefined) // package.json exists
        .mockRejectedValueOnce(new Error('Not found')) // next.config.js doesn't exist
        .mockRejectedValueOnce(new Error('Not found')); // manage.py doesn't exist

      mockFs.promises.stat
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // src directory exists
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // public directory exists
        .mockRejectedValueOnce(new Error('Not found')); // pages directory doesn't exist

      const result = await service.detectProjectType('/fake/react/project');

      expect(result.primaryType).toBe('react');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.allMatches).toHaveLength(1);
      expect(result.allMatches[0].evidence).toContain('Found package.json');
      expect(result.allMatches[0].evidence).toContain('Found src/ directory');
    });

    it('should detect Next.js project with higher priority than React', async () => {
      // Mock Next.js project structure
      mockFs.promises.access
        .mockResolvedValueOnce(undefined) // package.json exists
        .mockResolvedValueOnce(undefined) // next.config.js exists
        .mockRejectedValueOnce(new Error('Not found')); // manage.py doesn't exist

      mockFs.promises.stat
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // pages directory exists
        .mockRejectedValueOnce(new Error('Not found')); // src directory doesn't exist for this test

      const result = await service.detectProjectType('/fake/nextjs/project');

      expect(result.primaryType).toBe('nextjs');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Python project', async () => {
      mockFs.promises.access
        .mockRejectedValueOnce(new Error('Not found')) // package.json doesn't exist
        .mockResolvedValueOnce(undefined) // requirements.txt exists
        .mockRejectedValueOnce(new Error('Not found')); // Cargo.toml doesn't exist

      mockFs.promises.stat
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // src directory exists
        .mockRejectedValueOnce(new Error('Not found')); // other directories don't exist

      const result = await service.detectProjectType('/fake/python/project');

      expect(result.primaryType).toBe('python');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return generic type when no clear match', async () => {
      // Mock no files found
      mockFs.promises.access.mockRejectedValue(new Error('Not found'));
      mockFs.promises.stat.mockRejectedValue(new Error('Not found'));

      const result = await service.detectProjectType('/fake/unknown/project');

      expect(result.primaryType).toBe('generic');
      expect(result.confidence).toBe(0);
      expect(result.allMatches).toHaveLength(0);
    });

    it('should detect multiple project types and rank by confidence', async () => {
      // Mock a project that could be both Node.js and Docker
      mockFs.promises.access
        .mockResolvedValueOnce(undefined) // package.json exists
        .mockResolvedValueOnce(undefined) // Dockerfile exists
        .mockRejectedValueOnce(new Error('Not found')); // requirements.txt doesn't exist

      mockFs.promises.stat
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // src directory exists
        .mockRejectedValueOnce(new Error('Not found')); // other directories don't exist

      const result = await service.detectProjectType('/fake/mixed/project');

      expect(result.allMatches.length).toBeGreaterThan(1);
      expect(result.allMatches[0].confidence).toBeGreaterThanOrEqual(result.allMatches[1].confidence);
    });
  });

  describe('Port Allocation', () => {
    it('should allocate available ports within range', async () => {
      // Mock port availability check
      const mockCreateServer = jest.fn();
      mockCreateServer
        .mockReturnValueOnce({ listen: jest.fn((port, cb) => cb()), close: jest.fn(), on: jest.fn() })
        .mockReturnValueOnce({ listen: jest.fn((port, cb) => cb()), close: jest.fn(), on: jest.fn() })
        .mockReturnValueOnce({ listen: jest.fn((port, cb) => cb()), close: jest.fn(), on: jest.fn() });

      // Mock net module
      jest.doMock('net', () => ({
        createServer: mockCreateServer
      }));

      const ports = await service.allocateAvailablePorts(3);

      expect(ports).toHaveLength(3);
      expect(ports[0]).toBeGreaterThanOrEqual(3000);
      expect(ports[2]).toBeLessThanOrEqual(3999);
    });

    it('should respect port range constraints', async () => {
      const context = {
        projectPath: '/test',
        constraints: {
          portRange: { start: 4000, end: 4010 }
        }
      };

      const mockCreateServer = jest.fn();
      mockCreateServer.mockReturnValue({ 
        listen: jest.fn((port, cb) => cb()), 
        close: jest.fn(), 
        on: jest.fn() 
      });

      jest.doMock('net', () => ({
        createServer: mockCreateServer
      }));

      const ports = await service.allocateAvailablePorts(2, context);

      expect(ports.every(port => port >= 4000 && port <= 4010)).toBe(true);
    });

    it('should exclude specified ports', async () => {
      const context = {
        projectPath: '/test',
        constraints: {
          excludePorts: [3000, 3001, 3002]
        }
      };

      const mockCreateServer = jest.fn();
      mockCreateServer.mockReturnValue({ 
        listen: jest.fn((port, cb) => cb()), 
        close: jest.fn(), 
        on: jest.fn() 
      });

      jest.doMock('net', () => ({
        createServer: mockCreateServer
      }));

      const ports = await service.allocateAvailablePorts(3, context);

      expect(ports.every(port => ![3000, 3001, 3002].includes(port))).toBe(true);
    });
  });

  describe('MCP Server Discovery', () => {
    it('should discover project-level MCP servers', async () => {
      const mockMcpConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            env: { NODE_ENV: 'development' }
          }
        }
      };

      mockFs.promises.access.mockResolvedValueOnce(undefined);
      mockFs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockMcpConfig));

      const servers = await service.discoverMCPServers('/test/project');

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('test-server');
      expect(servers[0].command).toBe('node');
      expect(servers[0].args).toEqual(['server.js']);
      expect(servers[0].env).toEqual({ NODE_ENV: 'development' });
    });

    it('should handle malformed MCP config gracefully', async () => {
      mockFs.promises.access.mockResolvedValueOnce(undefined);
      mockFs.promises.readFile.mockResolvedValueOnce('invalid json');

      const servers = await service.discoverMCPServers('/test/project');

      expect(servers).toHaveLength(0);
    });

    it('should discover servers from multiple config files', async () => {
      const mockProjectConfig = {
        mcpServers: {
          'project-server': { command: 'npm', args: ['run', 'mcp'] }
        }
      };

      const mockGlobalConfig = {
        mcpServers: {
          'global-server': { command: 'docker', args: ['run', 'mcp-server'] }
        }
      };

      mockFs.promises.access
        .mockResolvedValueOnce(undefined) // project .mcp.json exists
        .mockResolvedValueOnce(undefined); // global .mcp.json exists

      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(mockProjectConfig))
        .mockResolvedValueOnce(JSON.stringify(mockGlobalConfig));

      const servers = await service.discoverMCPServers('/test/project');

      expect(servers).toHaveLength(2);
      expect(servers.map(s => s.name)).toContain('project-server');
      expect(servers.map(s => s.name)).toContain('global-server');
    });

    it('should deduplicate servers with same name', async () => {
      const mockConfig1 = {
        mcpServers: {
          'duplicate-server': { command: 'node', args: ['server1.js'] }
        }
      };

      const mockConfig2 = {
        mcpServers: {
          'duplicate-server': { command: 'node', args: ['server2.js'] }
        }
      };

      mockFs.promises.access
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(mockConfig1))
        .mockResolvedValueOnce(JSON.stringify(mockConfig2));

      const servers = await service.discoverMCPServers('/test/project');

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('duplicate-server');
    });
  });

  describe('Configuration Inheritance', () => {
    it('should merge configurations with correct precedence', async () => {
      const globalConfig = {
        DOCKER_ENABLED: false,
        MAX_AGENTS: 5,
        CLAUDE_AUTO_ACCEPT: true
      };

      const projectConfig = {
        DOCKER_ENABLED: true,
        TASK_MASTER_ENABLED: true
      };

      const context = {
        projectPath: '/test/project',
        existingConfig: {
          MAX_AGENTS: 10
        }
      };

      // Mock file reads
      mockFs.promises.access
        .mockResolvedValueOnce(undefined) // global config exists
        .mockResolvedValueOnce(undefined); // project config exists

      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(globalConfig))
        .mockResolvedValueOnce(JSON.stringify(projectConfig));

      // Mock project detection
      jest.spyOn(service, 'detectProjectType').mockResolvedValueOnce({
        primaryType: 'nodejs',
        confidence: 0.8,
        allMatches: [],
        suggestions: { ports: [3000], environment: {}, commands: [], extensions: [] }
      });

      const result = await service.buildConfigWithInheritance(context);

      // Check precedence: existing > project > global
      expect(result.DOCKER_ENABLED).toBe(true); // from project config
      expect(result.MAX_AGENTS).toBe(10); // from existing config
      expect(result.TASK_MASTER_ENABLED).toBe(true); // from project config
      expect(result.CLAUDE_AUTO_ACCEPT).toBe(true); // from global config
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt values correctly', () => {
      const originalValue = 'sensitive-api-key-12345';
      
      const encrypted = service.encryptValue(originalValue);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-cbc');
      
      const decrypted = service.decryptValue(encrypted);
      
      expect(decrypted).toBe(originalValue);
    });

    it('should encrypt with custom password', () => {
      const value = 'secret-value';
      const password = 'custom-password';
      
      const encrypted = service.encryptValue(value, password);
      const decrypted = service.decryptValue(encrypted, password);
      
      expect(decrypted).toBe(value);
    });

    it('should fail to decrypt with wrong password', () => {
      const value = 'secret-value';
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      const encrypted = service.encryptValue(value, password);
      
      expect(() => {
        service.decryptValue(encrypted, wrongPassword);
      }).toThrow();
    });
  });

  describe('Project Patterns', () => {
    it('should have all required patterns defined', () => {
      expect(PROJECT_PATTERNS.length).toBeGreaterThan(0);
      
      PROJECT_PATTERNS.forEach(pattern => {
        expect(pattern.name).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.priority).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(pattern.files)).toBe(true);
      });
    });

    it('should have appropriate priority ordering', () => {
      const reactPattern = PROJECT_PATTERNS.find(p => p.name === 'react');
      const nextjsPattern = PROJECT_PATTERNS.find(p => p.name === 'nextjs');
      const dockerPattern = PROJECT_PATTERNS.find(p => p.name === 'docker');
      
      expect(reactPattern).toBeDefined();
      expect(nextjsPattern).toBeDefined();
      expect(dockerPattern).toBeDefined();
      
      // Next.js should have higher priority than React
      expect(nextjsPattern!.priority).toBeGreaterThan(reactPattern!.priority);
      
      // Docker should have lowest priority (more general)
      expect(dockerPattern!.priority).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AutoConfigService.getInstance();
      const instance2 = AutoConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.promises.access.mockRejectedValue(new Error('Permission denied'));
      mockFs.promises.stat.mockRejectedValue(new Error('File not found'));
      
      const result = await service.detectProjectType('/inaccessible/path');
      
      expect(result.primaryType).toBe('generic');
      expect(result.confidence).toBe(0);
    });

    it('should handle JSON parsing errors in MCP discovery', async () => {
      mockFs.promises.access.mockResolvedValueOnce(undefined);
      mockFs.promises.readFile.mockResolvedValueOnce('{ invalid json }');
      
      const servers = await service.discoverMCPServers('/test/project');
      
      expect(servers).toHaveLength(0);
    });
  });
});