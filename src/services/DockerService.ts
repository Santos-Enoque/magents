import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DockerContainerOptions {
  agentId: string;
  projectPath: string;
  portRange: string;
  environment?: Record<string, string>;
  branch: string;
  projectName: string;
  isolationMode?: 'strict' | 'permissive';
}

export type ContainerStatus = 'running' | 'stopped' | 'paused' | 'restarting' | 'removing' | 'dead' | 'created' | 'exited';

export class DockerService {
  private templatesDir: string;

  constructor() {
    // Get the templates directory relative to the current file
    this.templatesDir = path.resolve(__dirname, '../../templates');
  }

  public async createContainer(options: DockerContainerOptions): Promise<void> {
    try {
      // Generate docker-compose file
      const composeFile = this.generateDockerComposeFile(options);
      const composeFilePath = path.join(options.projectPath, `docker-compose.${options.agentId}.yml`);
      
      // Write docker-compose file
      fs.writeFileSync(composeFilePath, composeFile);
      
      // Build and create container
      execSync(`docker-compose -f "${composeFilePath}" build`, { 
        cwd: options.projectPath,
        stdio: 'pipe'
      });
      
      console.log(`  ✓ Docker container built for agent ${options.agentId}`);
      
    } catch (error) {
      throw new Error(`Failed to create Docker container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async startContainer(agentId: string, projectPath: string): Promise<void> {
    try {
      const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
      
      if (!fs.existsSync(composeFilePath)) {
        throw new Error(`Docker compose file not found: ${composeFilePath}`);
      }
      
      execSync(`docker-compose -f "${composeFilePath}" up -d`, {
        cwd: projectPath,
        stdio: 'pipe'
      });
      
      console.log(`  ✓ Docker container started for agent ${agentId}`);
      
    } catch (error) {
      throw new Error(`Failed to start Docker container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async stopContainer(agentId: string, projectPath: string): Promise<void> {
    try {
      const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
      
      if (!fs.existsSync(composeFilePath)) {
        // Container already cleaned up
        return;
      }
      
      execSync(`docker-compose -f "${composeFilePath}" down`, {
        cwd: projectPath,
        stdio: 'pipe'
      });
      
      console.log(`  ✓ Docker container stopped for agent ${agentId}`);
      
    } catch (error) {
      throw new Error(`Failed to stop Docker container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async removeContainer(agentId: string, projectPath: string): Promise<void> {
    try {
      const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
      
      if (!fs.existsSync(composeFilePath)) {
        return;
      }
      
      // Stop and remove containers, networks, and volumes
      execSync(`docker-compose -f "${composeFilePath}" down -v --remove-orphans`, {
        cwd: projectPath,
        stdio: 'pipe'
      });
      
      // Remove the compose file
      fs.unlinkSync(composeFilePath);
      
      console.log(`  ✓ Docker container removed for agent ${agentId}`);
      
    } catch (error) {
      throw new Error(`Failed to remove Docker container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async execInContainer(agentId: string, projectPath: string, command: string[]): Promise<string> {
    try {
      const composeFilePath = path.join(projectPath, `docker-compose.${agentId}.yml`);
      const containerName = `magents-${agentId}`;
      
      // Build the docker exec command
      const dockerCommand = ['docker', 'exec', containerName, ...command];
      
      const result = execSync(dockerCommand.join(' '), {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      return result.trim();
      
    } catch (error) {
      throw new Error(`Failed to execute command in container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public containerExists(agentId: string): boolean {
    try {
      const containerName = `magents-${agentId}`;
      execSync(`docker inspect ${containerName}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  public getContainerStatus(agentId: string): ContainerStatus | null {
    try {
      const containerName = `magents-${agentId}`;
      const result = execSync(`docker inspect -f '{{.State.Status}}' ${containerName}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return result.trim() as ContainerStatus;
    } catch {
      return null;
    }
  }

  public isDockerAvailable(): boolean {
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker-compose --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private generateDockerComposeFile(options: DockerContainerOptions): string {
    const templatePath = path.join(this.templatesDir, 'docker-compose.template.yml');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Docker compose template not found: ${templatePath}`);
    }
    
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Generate unique subnet for this agent (172.20.x.0/24)
    const subnetSuffix = Math.floor(Math.random() * 254) + 1;
    const subnet = `172.20.${subnetSuffix}.0/24`;
    
    // Get Claude config directory
    const homeDir = os.homedir();
    const claudeConfigDir = path.join(homeDir, '.claude');
    const agentDataDir = path.join(homeDir, '.magents', options.agentId);
    
    // Ensure agent data directory exists
    if (!fs.existsSync(agentDataDir)) {
      fs.mkdirSync(agentDataDir, { recursive: true });
    }
    
    // Replace template variables
    const replacements = {
      '{{AGENT_ID}}': options.agentId,
      '{{PROJECT_PATH}}': options.projectPath,
      '{{TEMPLATES_DIR}}': this.templatesDir,
      '{{CLAUDE_CONFIG_DIR}}': claudeConfigDir,
      '{{AGENT_DATA_DIR}}': agentDataDir,
      '{{PORT_RANGE}}': options.portRange,
      '{{PROJECT_NAME}}': options.projectName,
      '{{BRANCH}}': options.branch,
      '{{ISOLATION_MODE}}': options.isolationMode || 'strict',
      '{{SUBNET}}': subnet
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      template = template.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return template;
  }

  public async attachToContainer(agentId: string, projectPath: string): Promise<void> {
    try {
      const containerName = `magents-${agentId}`;
      
      // Start tmux session inside the container
      await this.execInContainer(agentId, projectPath, [
        'tmux', 'new-session', '-d', '-s', 'main'
      ]);
      
      // Attach to the container with tmux
      const attachCommand = `docker exec -it ${containerName} tmux attach-session -t main`;
      
      // This will replace the current process, similar to tmux attach
      execSync(attachCommand, { stdio: 'inherit' });
      
    } catch (error) {
      throw new Error(`Failed to attach to container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}