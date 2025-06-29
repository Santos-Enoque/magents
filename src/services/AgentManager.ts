import * as fs from 'fs';
import * as path from 'path';
import { Agent, AgentRecord, CreateAgentOptions, CommandResult, AgentStatus, CreateAgentResult, CleanupResult } from '../types';
import { ConfigManager } from '../config/ConfigManager';
import { GitService } from './GitService';
import { TmuxService } from './TmuxService';

export class AgentManager {
  private configManager: ConfigManager;
  private gitService: GitService;
  private tmuxService: TmuxService;
  private activeAgentsFile: string;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.gitService = new GitService();
    this.tmuxService = new TmuxService();
    this.activeAgentsFile = path.join(this.configManager.getAgentsDir(), 'active_agents');
  }

  public async createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>> {
    try {
      const config = this.configManager.loadConfig();
      const agentId = options.agentId || `${config.WORKTREE_PREFIX}-${Date.now()}`;
      
      // Check if agent already exists
      if (this.agentExists(agentId)) {
        return {
          success: false,
          message: `Agent '${agentId}' already exists`
        };
      }

      // Check max agents limit
      const activeAgents = this.getActiveAgents();
      if (activeAgents.length >= config.MAX_AGENTS) {
        return {
          success: false,
          message: `Maximum number of agents (${config.MAX_AGENTS}) reached`
        };
      }

      const repoRoot = this.gitService.getRepoRoot();
      const worktreePath = path.join(path.dirname(repoRoot), agentId);
      const tmuxSession = `${config.TMUX_SESSION_PREFIX}-${agentId}`;

      // Prepare branch
      await this.gitService.prepareBranch(options.branch, config.DEFAULT_BASE_BRANCH);

      // Create worktree
      await this.gitService.createWorktree(worktreePath, options.branch, config.DEFAULT_BASE_BRANCH);

      // Copy Claude configuration and CLAUDE.md
      await this.copyClaudeConfiguration(repoRoot, worktreePath);

      // Create tmux session
      await this.tmuxService.createSession(tmuxSession, worktreePath, config);

      // Record the agent
      this.recordAgent({
        id: agentId,
        branch: options.branch,
        worktreePath,
        tmuxSession
      });

      return {
        success: true,
        message: `Agent '${agentId}' created successfully!`,
        data: {
          agentId,
          branch: options.branch,
          worktreePath,
          tmuxSession
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public getActiveAgents(): Agent[] {
    if (!fs.existsSync(this.activeAgentsFile)) {
      return [];
    }

    const content = fs.readFileSync(this.activeAgentsFile, 'utf8');
    const agents: Agent[] = [];

    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        const [id, branch, worktreePath, tmuxSession] = trimmed.split(':');
        if (id && branch && worktreePath && tmuxSession) {
          const status = this.tmuxService.sessionExists(tmuxSession) ? 'RUNNING' : 'STOPPED';
          agents.push({
            id,
            branch,
            worktreePath,
            tmuxSession,
            status: status as AgentStatus,
            createdAt: new Date() // We don't store creation time yet, so use current time
          });
        }
      }
    });

    return agents;
  }

  public async attachToAgent(agentId: string): Promise<CommandResult> {
    const agents = this.getActiveAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return {
        success: false,
        message: `Agent '${agentId}' not found`
      };
    }

    try {
      if (!this.tmuxService.sessionExists(agent.tmuxSession)) {
        // Recreate session if it doesn't exist
        const config = this.configManager.loadConfig();
        await this.tmuxService.createSession(agent.tmuxSession, agent.worktreePath, config);
      }

      // Attach to session (this will replace current process)
      await this.tmuxService.attachToSession(agent.tmuxSession);

      return {
        success: true,
        message: `Attached to agent '${agentId}'`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to attach to agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async stopAgent(agentId: string, removeWorktree: boolean = false): Promise<CommandResult> {
    const agents = this.getActiveAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return {
        success: false,
        message: `Agent '${agentId}' not found`
      };
    }

    try {
      // Kill tmux session
      if (this.tmuxService.sessionExists(agent.tmuxSession)) {
        await this.tmuxService.killSession(agent.tmuxSession);
      }

      // Remove worktree if requested
      if (removeWorktree && fs.existsSync(agent.worktreePath)) {
        await this.gitService.removeWorktree(agent.worktreePath);
      }

      // Remove from active agents
      this.removeAgentRecord(agentId);

      return {
        success: true,
        message: `Agent '${agentId}' stopped${removeWorktree ? ' and worktree removed' : ''}`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async cleanupAllAgents(removeWorktrees: boolean = false): Promise<CommandResult<CleanupResult>> {
    const agents = this.getActiveAgents();

    if (agents.length === 0) {
      return {
        success: true,
        message: 'No active agents to cleanup'
      };
    }

    let stopped = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        // Kill tmux session
        if (this.tmuxService.sessionExists(agent.tmuxSession)) {
          await this.tmuxService.killSession(agent.tmuxSession);
        }

        // Remove worktree if requested
        if (removeWorktrees && fs.existsSync(agent.worktreePath)) {
          await this.gitService.removeWorktree(agent.worktreePath);
        }

        stopped++;
      } catch (error) {
        errors.push(`Failed to stop ${agent.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clear active agents file
    if (fs.existsSync(this.activeAgentsFile)) {
      fs.unlinkSync(this.activeAgentsFile);
    }

    return {
      success: errors.length === 0,
      message: `Stopped ${stopped} agents${removeWorktrees ? ' and removed worktrees' : ''}${errors.length > 0 ? `. Errors: ${errors.join(', ')}` : ''}`,
      data: { stopped, errors }
    };
  }

  private agentExists(agentId: string): boolean {
    const agents = this.getActiveAgents();
    return agents.some(agent => agent.id === agentId);
  }

  private recordAgent(agent: AgentRecord): void {
    const line = `${agent.id}:${agent.branch}:${agent.worktreePath}:${agent.tmuxSession}\n`;
    fs.appendFileSync(this.activeAgentsFile, line);
  }

  private removeAgentRecord(agentId: string): void {
    if (!fs.existsSync(this.activeAgentsFile)) {
      return;
    }

    const content = fs.readFileSync(this.activeAgentsFile, 'utf8');
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(`${agentId}:`);
    });

    fs.writeFileSync(this.activeAgentsFile, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  }

  private async copyClaudeConfiguration(sourceRepo: string, worktreePath: string): Promise<void> {
    try {
      // Copy CLAUDE.md from source repo if it exists
      const claudeMdSource = path.join(sourceRepo, 'CLAUDE.md');
      const claudeMdDest = path.join(worktreePath, 'CLAUDE.md');
      
      if (fs.existsSync(claudeMdSource)) {
        fs.copyFileSync(claudeMdSource, claudeMdDest);
        console.log('  ✓ Copied CLAUDE.md');
      }

      // Copy Claude settings from user's home directory
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const claudeConfigDir = path.join(homeDir, '.claude');
      
      if (fs.existsSync(claudeConfigDir)) {
        // Copy settings.json
        const settingsSource = path.join(claudeConfigDir, 'settings.json');
        const settingsDest = path.join(worktreePath, '.claude-settings.json');
        
        if (fs.existsSync(settingsSource)) {
          fs.copyFileSync(settingsSource, settingsDest);
          console.log('  ✓ Copied Claude settings');
        }

        // Copy custom commands
        const commandsSource = path.join(claudeConfigDir, 'commands');
        const commandsDest = path.join(worktreePath, '.claude-commands');
        
        if (fs.existsSync(commandsSource)) {
          // Create .claude-commands directory
          if (!fs.existsSync(commandsDest)) {
            fs.mkdirSync(commandsDest);
          }
          
          // Copy all command files
          const commandFiles = fs.readdirSync(commandsSource);
          commandFiles.forEach(file => {
            if (file.endsWith('.md')) {
              fs.copyFileSync(
                path.join(commandsSource, file),
                path.join(commandsDest, file)
              );
            }
          });
          
          if (commandFiles.length > 0) {
            console.log(`  ✓ Copied ${commandFiles.length} custom commands`);
          }
        }
      }

      // Also check for .claude.json in home directory
      const claudeJsonPath = path.join(homeDir, '.claude.json');
      if (fs.existsSync(claudeJsonPath)) {
        const claudeJsonDest = path.join(worktreePath, '.claude.json');
        fs.copyFileSync(claudeJsonPath, claudeJsonDest);
        console.log('  ✓ Copied .claude.json');
      }

    } catch (error) {
      console.warn(`  ⚠ Warning: Could not copy some Claude configuration files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}