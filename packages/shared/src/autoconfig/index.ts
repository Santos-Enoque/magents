/**
 * Auto-Configuration System for Magents
 * 
 * Provides intelligent defaults and automatic configuration detection
 * for different project types, environments, and user preferences.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MagentsConfig } from '../types';

// Project type detection patterns
export interface ProjectPattern {
  name: string;
  description: string;
  files: string[];
  directories?: string[];
  packageManagers?: string[];
  priority: number;
}

export const PROJECT_PATTERNS: ProjectPattern[] = [
  {
    name: 'react',
    description: 'React.js Application',
    files: ['package.json'],
    directories: ['src', 'public'],
    packageManagers: ['npm', 'yarn', 'pnpm'],
    priority: 1
  },
  {
    name: 'nextjs',
    description: 'Next.js Application',
    files: ['package.json', 'next.config.js', 'next.config.ts'],
    directories: ['pages', 'app'],
    packageManagers: ['npm', 'yarn', 'pnpm'],
    priority: 2
  },
  {
    name: 'nodejs',
    description: 'Node.js Project',
    files: ['package.json'],
    directories: ['src', 'lib'],
    packageManagers: ['npm', 'yarn', 'pnpm'],
    priority: 3
  },
  {
    name: 'python',
    description: 'Python Project',
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    directories: ['src', 'app'],
    packageManagers: ['pip', 'poetry', 'pipenv'],
    priority: 1
  },
  {
    name: 'django',
    description: 'Django Application',
    files: ['manage.py', 'requirements.txt'],
    directories: ['apps', 'templates'],
    packageManagers: ['pip', 'poetry'],
    priority: 2
  },
  {
    name: 'fastapi',
    description: 'FastAPI Application',
    files: ['main.py', 'requirements.txt'],
    directories: ['app', 'api'],
    packageManagers: ['pip', 'poetry'],
    priority: 2
  },
  {
    name: 'rust',
    description: 'Rust Project',
    files: ['Cargo.toml'],
    directories: ['src'],
    packageManagers: ['cargo'],
    priority: 1
  },
  {
    name: 'go',
    description: 'Go Project',
    files: ['go.mod', 'go.sum'],
    directories: ['cmd', 'internal'],
    packageManagers: ['go'],
    priority: 1
  },
  {
    name: 'java',
    description: 'Java Project',
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    directories: ['src/main', 'src/test'],
    packageManagers: ['maven', 'gradle'],
    priority: 1
  },
  {
    name: 'spring',
    description: 'Spring Boot Application',
    files: ['pom.xml', 'application.properties', 'application.yml'],
    directories: ['src/main/java'],
    packageManagers: ['maven', 'gradle'],
    priority: 2
  },
  {
    name: 'docker',
    description: 'Dockerized Project',
    files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    priority: 0
  },
  {
    name: 'taskmaster',
    description: 'Task Master Project',
    files: ['.taskmaster/tasks.json', '.taskmaster/config.json'],
    directories: ['.taskmaster'],
    priority: 3
  }
];

// Port allocation ranges
export const PORT_RANGES = {
  WEB_DEVELOPMENT: { start: 3000, end: 3999 },
  API_SERVICES: { start: 4000, end: 4999 },
  DATABASES: { start: 5000, end: 5999 },
  TOOLS_UTILITIES: { start: 6000, end: 6999 },
  CUSTOM: { start: 8000, end: 8999 }
};

// Project type detection result
export interface ProjectDetectionResult {
  primaryType: string;
  confidence: number;
  allMatches: Array<{
    type: string;
    confidence: number;
    evidence: string[];
  }>;
  suggestions: {
    ports: number[];
    environment: Record<string, string>;
    commands: string[];
    extensions: string[];
  };
}

// MCP server discovery result
export interface MCPServerInfo {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  configPath: string;
}

// Configuration inheritance levels
export enum ConfigLevel {
  GLOBAL = 'global',
  PROJECT = 'project',
  AGENT = 'agent'
}

// Auto-configuration context
export interface AutoConfigContext {
  projectPath: string;
  existingConfig?: Partial<MagentsConfig>;
  userPreferences?: Record<string, any>;
  constraints?: {
    portRange?: { start: number; end: number };
    excludePorts?: number[];
    requiredFeatures?: string[];
  };
}

// Encrypted storage for sensitive data
export interface EncryptedValue {
  encrypted: string;
  salt: string;
  algorithm: string;
}

/**
 * Main Auto-Configuration Service
 */
export class AutoConfigService {
  private static instance: AutoConfigService;
  private encryptionKey?: Buffer;

  static getInstance(): AutoConfigService {
    if (!AutoConfigService.instance) {
      AutoConfigService.instance = new AutoConfigService();
    }
    return AutoConfigService.instance;
  }

  /**
   * Detect project type and characteristics
   */
  async detectProjectType(projectPath: string): Promise<ProjectDetectionResult> {
    const matches: Array<{ type: string; confidence: number; evidence: string[] }> = [];
    
    for (const pattern of PROJECT_PATTERNS) {
      const evidence: string[] = [];
      let score = 0;
      
      // Check for required files
      if (pattern.files) {
        for (const file of pattern.files) {
          const filePath = path.join(projectPath, file);
          if (await this.fileExists(filePath)) {
            evidence.push(`Found ${file}`);
            score += 2;
          }
        }
      }
      
      // Check for directories
      if (pattern.directories) {
        for (const dir of pattern.directories) {
          const dirPath = path.join(projectPath, dir);
          if (await this.directoryExists(dirPath)) {
            evidence.push(`Found ${dir}/ directory`);
            score += 1;
          }
        }
      }
      
      // Check for package managers
      if (pattern.packageManagers) {
        for (const pm of pattern.packageManagers) {
          if (await this.packageManagerAvailable(pm)) {
            evidence.push(`${pm} available`);
            score += 0.5;
          }
        }
      }
      
      if (score > 0) {
        const confidence = Math.min(score / (pattern.files?.length || 1) * pattern.priority, 1);
        matches.push({
          type: pattern.name,
          confidence,
          evidence
        });
      }
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    const primaryType = matches[0]?.type || 'generic';
    const primaryConfidence = matches[0]?.confidence || 0;
    
    // Generate suggestions based on detected type
    const suggestions = await this.generateProjectSuggestions(primaryType, projectPath);
    
    return {
      primaryType,
      confidence: primaryConfidence,
      allMatches: matches,
      suggestions
    };
  }

  /**
   * Allocate available ports with conflict detection
   */
  async allocateAvailablePorts(count: number = 3, context?: AutoConfigContext): Promise<number[]> {
    const allocatedPorts: number[] = [];
    const usedPorts = await this.getUsedPorts();
    const excludePorts = context?.constraints?.excludePorts || [];
    
    const { start, end } = context?.constraints?.portRange || PORT_RANGES.WEB_DEVELOPMENT;
    
    for (let port = start; port <= end && allocatedPorts.length < count; port++) {
      if (!usedPorts.includes(port) && !excludePorts.includes(port)) {
        if (await this.isPortAvailable(port)) {
          allocatedPorts.push(port);
        }
      }
    }
    
    return allocatedPorts;
  }

  /**
   * Discover MCP servers in project and system
   */
  async discoverMCPServers(projectPath: string): Promise<MCPServerInfo[]> {
    const servers: MCPServerInfo[] = [];
    
    // Check project-level .mcp.json
    const projectMcpPath = path.join(projectPath, '.mcp.json');
    if (await this.fileExists(projectMcpPath)) {
      const projectServers = await this.parseMCPConfig(projectMcpPath);
      servers.push(...projectServers);
    }
    
    // Check global .mcp.json
    const globalMcpPath = path.join(require('os').homedir(), '.mcp.json');
    if (await this.fileExists(globalMcpPath)) {
      const globalServers = await this.parseMCPConfig(globalMcpPath);
      servers.push(...globalServers);
    }
    
    // Check common MCP server locations
    const commonPaths = [
      path.join(projectPath, '.claude', 'mcp.json'),
      path.join(require('os').homedir(), '.claude', 'mcp.json'),
      '/usr/local/etc/mcp.json'
    ];
    
    for (const mcpPath of commonPaths) {
      if (await this.fileExists(mcpPath)) {
        try {
          const servers_found = await this.parseMCPConfig(mcpPath);
          servers.push(...servers_found);
        } catch (error) {
          console.warn(`Failed to parse MCP config at ${mcpPath}:`, error);
        }
      }
    }
    
    // Remove duplicates based on name
    const uniqueServers = servers.filter((server, index, self) => 
      self.findIndex(s => s.name === server.name) === index
    );
    
    return uniqueServers;
  }

  /**
   * Build configuration with inheritance
   */
  async buildConfigWithInheritance(context: AutoConfigContext): Promise<MagentsConfig> {
    const configs: Partial<MagentsConfig>[] = [];
    
    // Load global config
    const globalConfig = await this.loadGlobalConfig();
    if (globalConfig) {
      configs.push(globalConfig);
    }
    
    // Load project config
    const projectConfig = await this.loadProjectConfig(context.projectPath);
    if (projectConfig) {
      configs.push(projectConfig);
    }
    
    // Add existing/provided config
    if (context.existingConfig) {
      configs.push(context.existingConfig);
    }
    
    // Merge configurations with precedence
    const mergedConfig = this.mergeConfigurations(configs);
    
    // Apply auto-detected settings
    const detectionResult = await this.detectProjectType(context.projectPath);
    const autoConfig = await this.generateAutoConfig(detectionResult, context);
    
    return { ...mergedConfig, ...autoConfig } as MagentsConfig;
  }

  /**
   * Encrypt sensitive values (using modern crypto API)
   */
  encryptValue(value: string, password?: string): EncryptedValue {
    const salt = crypto.randomBytes(16);
    const key = password ? 
      crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256') :
      this.getOrCreateEncryptionKey();
    
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: iv.toString('hex') + ':' + encrypted,
      salt: salt.toString('hex'),
      algorithm
    };
  }

  /**
   * Decrypt sensitive values (using modern crypto API)
   */
  decryptValue(encryptedValue: EncryptedValue, password?: string): string {
    const salt = Buffer.from(encryptedValue.salt, 'hex');
    const key = password ?
      crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256') :
      this.getOrCreateEncryptionKey();
    
    const [ivHex, encrypted] = encryptedValue.encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(encryptedValue.algorithm, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Private helper methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async packageManagerAvailable(pm: string): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`${pm} --version`, (error: any) => {
          resolve(!error);
        });
      });
    } catch {
      return false;
    }
  }

  private async generateProjectSuggestions(projectType: string, projectPath: string) {
    const suggestions = {
      ports: await this.allocateAvailablePorts(3),
      environment: {} as Record<string, string>,
      commands: [] as string[],
      extensions: [] as string[]
    };

    switch (projectType) {
      case 'react':
      case 'nextjs':
        suggestions.environment = {
          NODE_ENV: 'development',
          BROWSER: 'none'
        };
        suggestions.commands = ['npm start', 'npm run dev', 'npm run build'];
        suggestions.extensions = ['.jsx', '.tsx', '.js', '.ts'];
        break;
        
      case 'python':
      case 'django':
      case 'fastapi':
        suggestions.environment = {
          PYTHONPATH: projectPath,
          DJANGO_SETTINGS_MODULE: 'settings'
        };
        suggestions.commands = ['python manage.py runserver', 'python -m uvicorn main:app', 'python app.py'];
        suggestions.extensions = ['.py', '.pyx'];
        break;
        
      case 'rust':
        suggestions.commands = ['cargo run', 'cargo build', 'cargo test'];
        suggestions.extensions = ['.rs'];
        break;
        
      case 'go':
        suggestions.commands = ['go run .', 'go build', 'go test'];
        suggestions.extensions = ['.go'];
        break;
    }

    return suggestions;
  }

  private async getUsedPorts(): Promise<number[]> {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('netstat -tuln', (error: any, stdout: string) => {
          if (error) {
            resolve([]);
            return;
          }
          
          const ports: number[] = [];
          const lines = stdout.split('\n');
          
          for (const line of lines) {
            const match = line.match(/:(\d+)\s/);
            if (match) {
              const port = parseInt(match[1], 10);
              if (port >= 1000 && port <= 65535) {
                ports.push(port);
              }
            }
          }
          
          resolve(ports);
        });
      });
    } catch {
      return [];
    }
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      const net = require('net');
      return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close();
          resolve(true);
        });
        server.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  private async parseMCPConfig(configPath: string): Promise<MCPServerInfo[]> {
    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      
      const servers: MCPServerInfo[] = [];
      
      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          const typedConfig = serverConfig as { command?: string; args?: string[]; env?: Record<string, string> };
          servers.push({
            name,
            command: typedConfig.command || '',
            args: typedConfig.args || [],
            env: typedConfig.env || {},
            configPath
          });
        }
      }
      
      return servers;
    } catch (error) {
      console.warn(`Failed to parse MCP config at ${configPath}:`, error);
      return [];
    }
  }

  private async loadGlobalConfig(): Promise<Partial<MagentsConfig> | null> {
    try {
      const configPath = path.join(require('os').homedir(), '.magents', 'config.json');
      if (await this.fileExists(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load global config:', error);
    }
    return null;
  }

  private async loadProjectConfig(projectPath: string): Promise<Partial<MagentsConfig> | null> {
    try {
      const configPath = path.join(projectPath, '.magents', 'config.json');
      if (await this.fileExists(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load project config:', error);
    }
    return null;
  }

  private mergeConfigurations(configs: Partial<MagentsConfig>[]): Partial<MagentsConfig> {
    return configs.reduce((merged, config) => {
      return { ...merged, ...config };
    }, {});
  }

  private async generateAutoConfig(
    detection: ProjectDetectionResult, 
    context: AutoConfigContext
  ): Promise<Partial<MagentsConfig>> {
    const config: Partial<MagentsConfig> = {};
    
    // Set mode based on project complexity
    if (detection.confidence > 0.8) {
      config.MODE = detection.allMatches.length > 2 ? 'advanced' : 'standard';
    } else {
      config.MODE = 'simple';
    }
    
    // Enable features based on detection
    if (detection.allMatches.some(m => m.type === 'taskmaster')) {
      config.TASK_MASTER_ENABLED = true;
    }
    
    if (detection.allMatches.some(m => m.type === 'docker')) {
      config.DOCKER_ENABLED = true;
    }
    
    // Set defaults based on project type
    const primaryType = detection.primaryType;
    switch (primaryType) {
      case 'react':
      case 'nextjs':
        config.CLAUDE_AUTO_ACCEPT = false; // Interactive development
        break;
        
      case 'python':
      case 'django':
      case 'fastapi':
        config.CLAUDE_AUTO_ACCEPT = true; // Batch processing friendly
        break;
        
      default:
        config.CLAUDE_AUTO_ACCEPT = false;
    }
    
    return config;
  }

  private getOrCreateEncryptionKey(): Buffer {
    if (!this.encryptionKey) {
      // In production, this should come from secure key management
      this.encryptionKey = crypto.randomBytes(32);
    }
    return this.encryptionKey;
  }
}

// Export singleton instance
export const autoConfig = AutoConfigService.getInstance();