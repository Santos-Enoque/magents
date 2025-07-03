/**
 * Simplified Tests for Auto-Configuration System
 * Focus on testing business logic without complex filesystem mocking
 */

import { 
  AutoConfigService, 
  PROJECT_PATTERNS, 
  PORT_RANGES,
  ProjectPattern
} from '../index';

describe('Auto-Configuration System - Core Logic', () => {
  let service: AutoConfigService;
  
  beforeEach(() => {
    service = AutoConfigService.getInstance();
  });

  describe('Project Patterns', () => {
    it('should have all required patterns defined', () => {
      expect(PROJECT_PATTERNS.length).toBeGreaterThan(0);
      
      PROJECT_PATTERNS.forEach(pattern => {
        expect(pattern.name).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.priority).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(pattern.files)).toBe(true);
        expect(pattern.files.length).toBeGreaterThan(0);
      });
    });

    it('should have sensible priority ordering', () => {
      const reactPattern = PROJECT_PATTERNS.find(p => p.name === 'react');
      const nextjsPattern = PROJECT_PATTERNS.find(p => p.name === 'nextjs');
      const dockerPattern = PROJECT_PATTERNS.find(p => p.name === 'docker');
      
      expect(reactPattern).toBeDefined();
      expect(nextjsPattern).toBeDefined();
      expect(dockerPattern).toBeDefined();
      
      // Next.js should have higher priority than React (more specific)
      expect(nextjsPattern!.priority).toBeGreaterThan(reactPattern!.priority);
      
      // Docker should have lowest priority (most general)
      expect(dockerPattern!.priority).toBe(0);
    });

    it('should have unique pattern names', () => {
      const names = PROJECT_PATTERNS.map(p => p.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names.length).toBe(uniqueNames.length);
    });

    it('should have React and Node.js patterns for JavaScript projects', () => {
      const jsPatterns = PROJECT_PATTERNS.filter(p => 
        p.files.includes('package.json') || 
        p.packageManagers?.includes('npm')
      );
      
      expect(jsPatterns.length).toBeGreaterThan(0);
      expect(jsPatterns.some(p => p.name === 'react')).toBe(true);
      expect(jsPatterns.some(p => p.name === 'nodejs')).toBe(true);
    });

    it('should have Python patterns', () => {
      const pythonPatterns = PROJECT_PATTERNS.filter(p =>
        p.files.some(f => f.includes('requirements.txt') || f.includes('.py'))
      );
      
      expect(pythonPatterns.length).toBeGreaterThan(0);
      expect(pythonPatterns.some(p => p.name === 'python')).toBe(true);
    });
  });

  describe('Port Ranges', () => {
    it('should have defined port ranges', () => {
      expect(PORT_RANGES.WEB_DEVELOPMENT).toBeDefined();
      expect(PORT_RANGES.API_SERVICES).toBeDefined();
      expect(PORT_RANGES.DATABASES).toBeDefined();
      expect(PORT_RANGES.TOOLS_UTILITIES).toBeDefined();
      expect(PORT_RANGES.CUSTOM).toBeDefined();
    });

    it('should have non-overlapping port ranges', () => {
      const ranges = Object.values(PORT_RANGES);
      
      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          const range1 = ranges[i];
          const range2 = ranges[j];
          
          // Check if ranges don't overlap
          const overlap = !(range1.end < range2.start || range2.end < range1.start);
          expect(overlap).toBe(false);
        }
      }
    });

    it('should have valid port numbers', () => {
      Object.values(PORT_RANGES).forEach(range => {
        expect(range.start).toBeGreaterThanOrEqual(1);
        expect(range.end).toBeLessThanOrEqual(65535);
        expect(range.start).toBeLessThan(range.end);
      });
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt values correctly', () => {
      const originalValue = 'test-api-key-12345';
      
      const encrypted = service.encryptValue(originalValue);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-cbc');
      expect(encrypted.encrypted).not.toBe(originalValue);
      
      const decrypted = service.decryptValue(encrypted);
      
      expect(decrypted).toBe(originalValue);
    });

    it('should generate different encrypted values for same input', () => {
      const value = 'same-value';
      
      const encrypted1 = service.encryptValue(value);
      const encrypted2 = service.encryptValue(value);
      
      // Should be different due to random salt and IV
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      
      // But both should decrypt to same value
      expect(service.decryptValue(encrypted1)).toBe(value);
      expect(service.decryptValue(encrypted2)).toBe(value);
    });

    it('should work with custom passwords', () => {
      const value = 'secret-data';
      const password = 'my-custom-password-123';
      
      const encrypted = service.encryptValue(value, password);
      const decrypted = service.decryptValue(encrypted, password);
      
      expect(decrypted).toBe(value);
    });

    it('should handle empty strings', () => {
      const value = '';
      
      const encrypted = service.encryptValue(value);
      const decrypted = service.decryptValue(encrypted);
      
      expect(decrypted).toBe(value);
    });

    it('should handle special characters and unicode', () => {
      const value = 'Special chars: !@#$%^&*()_+ Unicode: 🔐🚀💡';
      
      const encrypted = service.encryptValue(value);
      const decrypted = service.decryptValue(encrypted);
      
      expect(decrypted).toBe(value);
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations correctly', () => {
      // Test the private method through reflection
      const mergeMethod = (service as any).mergeConfigurations;
      
      const config1 = {
        DOCKER_ENABLED: false,
        MAX_AGENTS: 5,
        CLAUDE_AUTO_ACCEPT: true
      };

      const config2 = {
        DOCKER_ENABLED: true,
        TASK_MASTER_ENABLED: true
      };

      const config3 = {
        MAX_AGENTS: 10,
        NEW_FEATURE: true
      };

      const merged = mergeMethod([config1, config2, config3]);

      expect(merged.DOCKER_ENABLED).toBe(true); // from config2
      expect(merged.MAX_AGENTS).toBe(10); // from config3 (last wins)
      expect(merged.CLAUDE_AUTO_ACCEPT).toBe(true); // from config1
      expect(merged.TASK_MASTER_ENABLED).toBe(true); // from config2
      expect(merged.NEW_FEATURE).toBe(true); // from config3
    });

    it('should handle empty configuration arrays', () => {
      const mergeMethod = (service as any).mergeConfigurations;
      const merged = mergeMethod([]);
      
      expect(merged).toEqual({});
    });

    it('should handle single configuration', () => {
      const mergeMethod = (service as any).mergeConfigurations;
      const config = { DOCKER_ENABLED: true, MAX_AGENTS: 3 };
      const merged = mergeMethod([config]);
      
      expect(merged).toEqual(config);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AutoConfigService.getInstance();
      const instance2 = AutoConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = AutoConfigService.getInstance();
      const instance2 = AutoConfigService.getInstance();
      
      // Test that they share the same encryption key
      const value = 'test-value';
      const encrypted1 = instance1.encryptValue(value);
      const decrypted2 = instance2.decryptValue(encrypted1);
      
      expect(decrypted2).toBe(value);
    });
  });

  describe('Auto-Config Generation', () => {
    it('should generate appropriate config for React projects', async () => {
      const mockDetection = {
        primaryType: 'react',
        confidence: 0.9,
        allMatches: [{ type: 'react', confidence: 0.9, evidence: [] }],
        suggestions: { ports: [3000], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/react-app' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.MODE).toBe('standard'); // high confidence, single match
      expect(config.CLAUDE_AUTO_ACCEPT).toBe(false); // interactive development
    });

    it('should generate appropriate config for Python projects', async () => {
      const mockDetection = {
        primaryType: 'python',
        confidence: 0.8,
        allMatches: [{ type: 'python', confidence: 0.8, evidence: [] }],
        suggestions: { ports: [5000], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/python-app' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.CLAUDE_AUTO_ACCEPT).toBe(true); // batch processing friendly
    });

    it('should enable Task Master for detected Task Master projects', async () => {
      const mockDetection = {
        primaryType: 'nodejs',
        confidence: 0.7,
        allMatches: [
          { type: 'nodejs', confidence: 0.7, evidence: [] },
          { type: 'taskmaster', confidence: 0.9, evidence: [] }
        ],
        suggestions: { ports: [3000], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/taskmaster-project' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.TASK_MASTER_ENABLED).toBe(true);
    });

    it('should enable Docker for detected Docker projects', async () => {
      const mockDetection = {
        primaryType: 'nodejs',
        confidence: 0.7,
        allMatches: [
          { type: 'nodejs', confidence: 0.7, evidence: [] },
          { type: 'docker', confidence: 0.8, evidence: [] }
        ],
        suggestions: { ports: [3000], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/docker-project' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.DOCKER_ENABLED).toBe(true);
    });

    it('should set simple mode for low confidence detection', async () => {
      const mockDetection = {
        primaryType: 'generic',
        confidence: 0.3,
        allMatches: [],
        suggestions: { ports: [], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/unknown-project' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.MODE).toBe('simple');
    });

    it('should set advanced mode for complex projects', async () => {
      const mockDetection = {
        primaryType: 'nextjs',
        confidence: 0.9,
        allMatches: [
          { type: 'nextjs', confidence: 0.9, evidence: [] },
          { type: 'react', confidence: 0.8, evidence: [] },
          { type: 'docker', confidence: 0.7, evidence: [] },
          { type: 'taskmaster', confidence: 0.6, evidence: [] }
        ],
        suggestions: { ports: [3000], environment: {}, commands: [], extensions: [] }
      };

      const context = { projectPath: '/test/complex-project' };
      
      const generateMethod = (service as any).generateAutoConfig;
      const config = await generateMethod(mockDetection, context);

      expect(config.MODE).toBe('advanced'); // multiple matches indicates complexity
    });
  });
});