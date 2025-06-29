import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ConfigManager } from '../config/ConfigManager';

export interface PortAllocation {
  projectId: string;
  agentId?: string;
  port: number;
  service: string;
  allocatedAt: Date;
}

export class PortManager {
  private configManager: ConfigManager;
  private allocationsFile: string;
  private readonly MIN_PORT = 3000;
  private readonly MAX_PORT = 9999;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.allocationsFile = path.join(this.configManager.getAgentsDir(), 'port-allocations.json');
  }

  public allocatePort(projectId: string, service: string = 'web', preferred?: number): number {
    const allocations = this.loadAllocations();
    
    // Check if preferred port is available
    if (preferred && this.isPortAvailable(preferred, allocations)) {
      const allocation: PortAllocation = {
        projectId,
        port: preferred,
        service,
        allocatedAt: new Date()
      };
      
      allocations.push(allocation);
      this.saveAllocations(allocations);
      return preferred;
    }

    // Find next available port
    const startPort = preferred || this.MIN_PORT;
    
    for (let port = startPort; port <= this.MAX_PORT; port++) {
      if (this.isPortAvailable(port, allocations)) {
        const allocation: PortAllocation = {
          projectId,
          port,
          service,
          allocatedAt: new Date()
        };
        
        allocations.push(allocation);
        this.saveAllocations(allocations);
        return port;
      }
    }

    throw new Error(`No available ports in range ${startPort}-${this.MAX_PORT}`);
  }

  public allocateRange(projectId: string, count: number, startPort?: number): [number, number] {
    const allocations = this.loadAllocations();
    const start = startPort || this.MIN_PORT;
    
    // Find a continuous range of available ports
    for (let port = start; port <= this.MAX_PORT - count; port++) {
      let available = true;
      
      // Check if the entire range is available
      for (let i = 0; i < count; i++) {
        if (!this.isPortAvailable(port + i, allocations)) {
          available = false;
          break;
        }
      }
      
      if (available) {
        // Allocate the entire range
        for (let i = 0; i < count; i++) {
          const allocation: PortAllocation = {
            projectId,
            port: port + i,
            service: `service-${i}`,
            allocatedAt: new Date()
          };
          allocations.push(allocation);
        }
        
        this.saveAllocations(allocations);
        return [port, port + count - 1];
      }
    }

    throw new Error(`No available port range of ${count} ports`);
  }

  public releaseProjectPorts(projectId: string): void {
    const allocations = this.loadAllocations();
    const filtered = allocations.filter(a => a.projectId !== projectId);
    this.saveAllocations(filtered);
  }

  public releaseAgentPorts(agentId: string): void {
    const allocations = this.loadAllocations();
    const filtered = allocations.filter(a => a.agentId !== agentId);
    this.saveAllocations(filtered);
  }

  public getProjectPorts(projectId: string): PortAllocation[] {
    const allocations = this.loadAllocations();
    return allocations.filter(a => a.projectId === projectId);
  }

  public getAllocatedPorts(): PortAllocation[] {
    return this.loadAllocations();
  }

  public isPortInUse(port: number): boolean {
    try {
      // Check if port is actually in use on the system
      const result = execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
      return result.trim().length > 0;
    } catch {
      // Port is not in use
      return false;
    }
  }

  public detectProjectPorts(projectPath: string): { [service: string]: number } {
    const ports: { [service: string]: number } = {};
    
    try {
      // Check package.json for common port configurations
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Look for port configurations in scripts
        if (packageJson.scripts) {
          for (const [name, script] of Object.entries(packageJson.scripts)) {
            if (typeof script === 'string') {
              const portMatch = script.match(/--port[=\s]+(\d+)/);
              if (portMatch) {
                ports[name] = parseInt(portMatch[1], 10);
              }
            }
          }
        }
      }

      // Check for common config files
      const configFiles = [
        'next.config.js',
        'vite.config.js',
        'webpack.config.js',
        '.env',
        '.env.local'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const portMatches = content.match(/PORT[=:\s]+(\d+)/gi);
          
          if (portMatches) {
            portMatches.forEach((match, index) => {
              const port = parseInt(match.replace(/PORT[=:\s]+/i, ''), 10);
              if (port) {
                ports[`config-${index}`] = port;
              }
            });
          }
        }
      }

    } catch (error) {
      console.warn('Error detecting ports:', error);
    }

    return ports;
  }

  private isPortAvailable(port: number, allocations: PortAllocation[]): boolean {
    // Check if port is allocated in our system
    const allocated = allocations.some(a => a.port === port);
    if (allocated) {
      return false;
    }

    // Check if port is actually in use on the system
    return !this.isPortInUse(port);
  }

  private loadAllocations(): PortAllocation[] {
    if (!fs.existsSync(this.allocationsFile)) {
      return [];
    }

    try {
      const data = fs.readFileSync(this.allocationsFile, 'utf8');
      return JSON.parse(data) as PortAllocation[];
    } catch (error) {
      console.warn('Error loading port allocations:', error);
      return [];
    }
  }

  private saveAllocations(allocations: PortAllocation[]): void {
    try {
      fs.writeFileSync(this.allocationsFile, JSON.stringify(allocations, null, 2));
    } catch (error) {
      console.error('Error saving port allocations:', error);
    }
  }
}