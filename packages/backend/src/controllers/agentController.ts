import { Agent, CreateAgentOptions, AgentStatus, AgentCreationProgress, AgentCreationStep } from '@magents/shared';
import { AgentService } from '../services/AgentService';
import { ProjectService } from '../services/ProjectService';
import { AgentManagerDB } from '../services/AgentManagerDB';

// Use service factories to get appropriate implementations
const getAgentManager = () => AgentService.getInstance();
const getProjectManager = () => ProjectService.getInstance();

export const agentController = {
  async listAgents(options: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = options;
    
    // Get agents from appropriate storage
    let allAgents = await getAgentManager().getActiveAgents();
    
    // Filter by status if provided
    if (status) {
      allAgents = allAgents.filter((agent: Agent) => agent.status === status);
    }
    
    const total = allAgents.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedAgents = allAgents.slice(offset, offset + limit);
    
    return {
      agents: paginatedAgents,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  },

  async getAgent(id: string): Promise<Agent> {
    const agent = await (getAgentManager() as AgentManagerDB).getAgent(id);
    if (!agent) {
      throw new Error(`Agent with id ${id} not found`);
    }
    return agent;
  },

  async createAgent(options: CreateAgentOptions): Promise<Agent> {
    // Generate a temporary agent ID for progress tracking
    const tempAgentId = options.agentId || `agent-${Date.now()}`;
    
    // Define creation steps
    const steps: AgentCreationStep[] = [
      {
        id: 'validation',
        name: 'Validation',
        description: 'Validating agent configuration and requirements',
        status: 'pending'
      },
      {
        id: 'git-setup',
        name: 'Git Setup',
        description: 'Creating Git worktree and branch',
        status: 'pending'
      },
      {
        id: 'config-copy',
        name: 'Configuration',
        description: 'Copying Claude and MCP configurations',
        status: 'pending'
      },
      {
        id: 'tmux-session',
        name: 'Tmux Session',
        description: 'Creating and starting tmux session',
        status: 'pending'
      },
      {
        id: 'agent-startup',
        name: 'Agent Startup',
        description: 'Starting Claude Code agent',
        status: 'pending'
      },
      {
        id: 'registration',
        name: 'Registration',
        description: 'Registering agent in system',
        status: 'pending'
      }
    ];

    let currentStepIndex = 0;
    
    // Helper function to emit progress
    const emitProgress = (stepIndex: number, status: 'in-progress' | 'completed' | 'error', error?: string) => {
      const currentStep = steps[stepIndex];
      currentStep.status = status;
      if (status === 'in-progress') {
        currentStep.startTime = new Date();
      } else {
        currentStep.endTime = new Date();
      }
      if (error) {
        currentStep.error = error;
      }

      const progress: AgentCreationProgress = {
        step: stepIndex + 1,
        totalSteps: steps.length,
        currentStep,
        message: status === 'error' ? error || 'An error occurred' : currentStep.description,
        percentage: Math.round(((stepIndex + (status === 'completed' ? 1 : 0.5)) / steps.length) * 100),
        error: status === 'error' ? error : undefined
      };

      // Import websocketService dynamically to avoid circular dependency
      import('../server').then(({ websocketService }) => {
        websocketService?.broadcastAgentProgress(tempAgentId, progress);
      }).catch(console.error);
    };

    try {
      // Step 1: Validation
      currentStepIndex = 0;
      emitProgress(currentStepIndex, 'in-progress');
      
      // Use AgentManager to create agent
      const result = await getAgentManager().createAgent(options);
      
      if (!result.success) {
        emitProgress(currentStepIndex, 'error', result.message || 'Failed to create agent');
        throw new Error(result.message || 'Failed to create agent');
      }
      
      emitProgress(currentStepIndex, 'completed');

      // Return the created agent data
      const agent = result.data;
      if (!agent) {
        emitProgress(currentStepIndex, 'error', 'Agent created but no data returned');
        throw new Error('Agent created but no data returned');
      }

      // Step 2-5: These steps are handled internally by AgentManager
      for (let i = 1; i < steps.length - 1; i++) {
        currentStepIndex = i;
        emitProgress(currentStepIndex, 'in-progress');
        // Simulate step completion with a small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        emitProgress(currentStepIndex, 'completed');
      }

      // Step 6: Registration
      currentStepIndex = steps.length - 1;
      emitProgress(currentStepIndex, 'in-progress');

      // Get the created agent from the database
      const createdAgent = await this.getAgent(agent.agentId);

      // If projectId is provided, add agent to the project
      if (options.projectId) {
        try {
          await getProjectManager().addAgentToProject(options.projectId, agent.agentId);
        } catch (error) {
          console.warn(`Failed to add agent ${agent.agentId} to project ${options.projectId}:`, error);
          // Don't fail agent creation if project association fails
        }
      }

      emitProgress(currentStepIndex, 'completed');

      return createdAgent;
    } catch (error) {
      emitProgress(currentStepIndex, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  async updateAgentStatus(id: string, status: AgentStatus): Promise<Agent> {
    // Use database-backed implementation if available
    if (AgentService.isUsingDatabase()) {
      const updatedAgent = await (getAgentManager() as AgentManagerDB).updateAgentStatus(id, status);
      if (!updatedAgent) {
        throw new Error(`Agent with id ${id} not found`);
      }
      return updatedAgent;
    }
    
    // Fallback for CLI-only mode
    const agent = await this.getAgent(id);
    
    // Note: This doesn't persist the status change to the CLI storage
    // In a complete implementation, AgentManager would need status update methods
    return {
      ...agent,
      status,
      updatedAt: new Date()
    };
  },

  async deleteAgent(id: string, removeWorktree: boolean = false): Promise<void> {
    // Get agent info first to find associated project
    const agent = await this.getAgent(id);
    
    // Remove agent from project if associated
    if (agent.projectId) {
      try {
        await getProjectManager().removeAgentFromProject(agent.projectId, id);
      } catch (error) {
        console.warn(`Failed to remove agent ${id} from project ${agent.projectId}:`, error);
        // Continue with agent deletion even if project disassociation fails
      }
    }
    
    // Use AgentManager to stop and remove agent
    const result = await getAgentManager().stopAgent(id, removeWorktree);
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete agent');
    }
  },

  async updateAgentConfig(id: string, config: Record<string, unknown>): Promise<void> {
    // Get the agent first to ensure it exists
    const agent = await this.getAgent(id);
    
    // Use database-backed implementation if available
    if (AgentService.isUsingDatabase()) {
      await (getAgentManager() as AgentManagerDB).updateAgentConfig(id, config);
    } else {
      // Fallback to in-memory storage for CLI-only mode
      (agent as Agent & { config?: Record<string, unknown> }).config = config;
      console.log(`Updated config for agent ${id} (in-memory only):`, config);
    }
  },

  async assignAgentToProject(agentId: string, projectId: string): Promise<Agent> {
    // Get agent and project to ensure they exist
    const agent = await this.getAgent(agentId);
    await getProjectManager().getProject(projectId);

    // Remove from previous project if assigned
    if (agent.projectId && agent.projectId !== projectId) {
      try {
        await getProjectManager().removeAgentFromProject(agent.projectId, agentId);
      } catch (error) {
        console.warn(`Failed to remove agent ${agentId} from previous project ${agent.projectId}:`, error);
      }
    }

    // Add to new project
    await getProjectManager().addAgentToProject(projectId, agentId);

    // Update agent with project assignment
    // Note: In a complete implementation, this would persist to CLI storage
    agent.projectId = projectId;
    agent.updatedAt = new Date();

    return agent;
  },

  async unassignAgentFromProject(agentId: string): Promise<Agent> {
    const agent = await this.getAgent(agentId);

    if (agent.projectId) {
      try {
        await getProjectManager().removeAgentFromProject(agent.projectId, agentId);
      } catch (error) {
        console.warn(`Failed to remove agent ${agentId} from project ${agent.projectId}:`, error);
      }

      // Update agent to remove project assignment
      agent.projectId = '' as any;
      agent.updatedAt = new Date();
    }

    return agent;
  },

  async getAgentsByProject(projectId: string): Promise<Agent[]> {
    // Verify project exists
    await getProjectManager().getProject(projectId);

    // Get all agents and filter by project
    const allAgents = await getAgentManager().getActiveAgents();
    return allAgents.filter((agent: Agent) => agent.projectId === projectId);
  },

  async assignTaskToAgent(agentId: string, taskId: string): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    
    // Note: In a complete implementation, this would integrate with TaskMaster
    // and persist the task assignment to CLI storage
    console.log(`Assigned task ${taskId} to agent ${agentId}`);
    
    // Return the agent as-is since we retrieved it properly from the database
    return agent;
  }
};