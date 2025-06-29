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

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.gitService = new GitService();
    this.tmuxService = new TmuxService();
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

      // Copy Claude configuration and CLAUDE.md with context injection
      await this.copyClaudeConfiguration(repoRoot, worktreePath, {
        agentId,
        branch: options.branch,
        environment: options.environment,
        context: options.context
      });

      // Create tmux session with environment variables
      const environment = {
        ...options.environment,
        AGENT_ID: agentId,
        PROJECT_ROOT: worktreePath,
        PROJECT_NAME: path.basename(repoRoot)
      };
      await this.tmuxService.createSession(tmuxSession, worktreePath, config, environment);

      // Record the agent with environment and context
      const agentRecord: AgentRecord = {
        id: agentId,
        branch: options.branch,
        worktreePath,
        tmuxSession,
        environment: environment as any,
        context: options.context
      };
      this.configManager.saveAgentData(agentRecord);

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
    const agentRecords = this.configManager.getAllAgents();
    const agents: Agent[] = [];

    for (const record of agentRecords) {
      const status = this.tmuxService.sessionExists(record.tmuxSession) ? 'RUNNING' : 'STOPPED';
      agents.push({
        id: record.id,
        branch: record.branch,
        worktreePath: record.worktreePath,
        tmuxSession: record.tmuxSession,
        status: status as AgentStatus,
        createdAt: new Date(), // We don't store creation time yet, so use current time
        environment: record.environment,
        context: record.context
      });
    }

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
        await this.tmuxService.createSession(agent.tmuxSession, agent.worktreePath, config, agent.environment);
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

    // Clear all agent data
    for (const agent of agents) {
      this.configManager.deleteAgentData(agent.id);
    }

    return {
      success: errors.length === 0,
      message: `Stopped ${stopped} agents${removeWorktrees ? ' and removed worktrees' : ''}${errors.length > 0 ? `. Errors: ${errors.join(', ')}` : ''}`,
      data: { stopped, errors }
    };
  }

  private agentExists(agentId: string): boolean {
    const agentData = this.configManager.loadAgentData(agentId);
    return agentData !== null;
  }


  private removeAgentRecord(agentId: string): void {
    this.configManager.deleteAgentData(agentId);
  }

  private async copyClaudeConfiguration(
    sourceRepo: string, 
    worktreePath: string,
    agentInfo?: {
      agentId: string;
      branch: string;
      environment?: Partial<import('../types').AgentEnvironment>;
      context?: import('../types').AgentContext;
    }
  ): Promise<void> {
    try {
      // Copy CLAUDE.md from source repo if it exists
      const claudeMdSource = path.join(sourceRepo, 'CLAUDE.md');
      const claudeMdDest = path.join(worktreePath, 'CLAUDE.md');
      
      if (fs.existsSync(claudeMdSource)) {
        let content = fs.readFileSync(claudeMdSource, 'utf8');
        
        // Inject agent context at the beginning of CLAUDE.md
        if (agentInfo) {
          const contextHeader = this.generateAgentContextHeader(agentInfo);
          content = contextHeader + '\n\n' + content;
        }
        
        fs.writeFileSync(claudeMdDest, content);
        console.log('  ✓ Copied and enhanced CLAUDE.md with agent context');
      } else if (agentInfo) {
        // Create CLAUDE.md with context if it doesn't exist
        const contextHeader = this.generateAgentContextHeader(agentInfo);
        fs.writeFileSync(claudeMdDest, contextHeader);
        console.log('  ✓ Created CLAUDE.md with agent context');
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

  private generateAgentContextHeader(agentInfo: {
    agentId: string;
    branch: string;
    environment?: Partial<import('../types').AgentEnvironment>;
    context?: import('../types').AgentContext;
  }): string {
    const lines = [
      '# AGENT CONTEXT',
      '<!-- This section is auto-generated by magents to provide agent-specific context -->',
      '',
      `**Agent ID:** ${agentInfo.agentId}`,
      `**Branch:** ${agentInfo.branch}`,
      `**Created:** ${new Date().toISOString()}`,
      ''
    ];

    if (agentInfo.environment) {
      lines.push('## Environment');
      if (agentInfo.environment.PROJECT_ROOT) {
        lines.push(`- **Project Root:** ${agentInfo.environment.PROJECT_ROOT}`);
      }
      if (agentInfo.environment.PROJECT_NAME) {
        lines.push(`- **Project Name:** ${agentInfo.environment.PROJECT_NAME}`);
      }
      if (agentInfo.environment.AGENT_TASK) {
        lines.push(`- **Task:** ${agentInfo.environment.AGENT_TASK}`);
      }
      if (agentInfo.environment.ALLOWED_PORTS) {
        lines.push(`- **Allowed Ports:** ${agentInfo.environment.ALLOWED_PORTS}`);
      }
      if (agentInfo.environment.ISOLATION_MODE) {
        lines.push(`- **Isolation Mode:** ${agentInfo.environment.ISOLATION_MODE}`);
      }
      lines.push('');
    }

    if (agentInfo.context) {
      lines.push('## Context');
      
      if (agentInfo.context.task) {
        lines.push(`### Task Description`);
        lines.push(agentInfo.context.task);
        lines.push('');
      }

      if (agentInfo.context.services && Object.keys(agentInfo.context.services).length > 0) {
        lines.push('### Services');
        Object.entries(agentInfo.context.services).forEach(([name, url]) => {
          lines.push(`- **${name}:** ${url}`);
        });
        lines.push('');
      }

      if (agentInfo.context.boundaries && agentInfo.context.boundaries.length > 0) {
        lines.push('### Boundaries');
        agentInfo.context.boundaries.forEach(boundary => {
          lines.push(`- ${boundary}`);
        });
        lines.push('');
      }
    }

    lines.push('## Important Notes');
    lines.push('- Stay focused on this specific branch and task');
    lines.push('- Do not access files outside the project root');
    lines.push('- Ignore services running on ports not listed above');
    lines.push('');
    lines.push('---');
    lines.push('<!-- End of auto-generated agent context -->');

    return lines.join('\n');
  }
}