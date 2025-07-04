"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentController = void 0;
const AgentService_1 = require("../services/AgentService");
const ProjectService_1 = require("../services/ProjectService");
// Use service factories to get appropriate implementations
const getAgentManager = () => AgentService_1.AgentService.getInstance();
const getProjectManager = () => ProjectService_1.ProjectService.getInstance();
exports.agentController = {
    async listAgents(options) {
        const { page, limit, status } = options;
        // Get agents from appropriate storage
        let allAgents = await getAgentManager().getActiveAgents();
        // Filter by status if provided
        if (status) {
            allAgents = allAgents.filter((agent) => agent.status === status);
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
    async getAgent(id) {
        const agent = await getAgentManager().getAgent(id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        return agent;
    },
    async createAgent(options) {
        // Generate a temporary agent ID for progress tracking
        const tempAgentId = options.agentId || `agent-${Date.now()}`;
        // Define creation steps
        const steps = [
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
        const emitProgress = (stepIndex, status, error) => {
            const currentStep = steps[stepIndex];
            currentStep.status = status;
            if (status === 'in-progress') {
                currentStep.startTime = new Date();
            }
            else {
                currentStep.endTime = new Date();
            }
            if (error) {
                currentStep.error = error;
            }
            const progress = {
                step: stepIndex + 1,
                totalSteps: steps.length,
                currentStep,
                message: status === 'error' ? error || 'An error occurred' : currentStep.description,
                percentage: Math.round(((stepIndex + (status === 'completed' ? 1 : 0.5)) / steps.length) * 100),
                error: status === 'error' ? error : undefined
            };
            // Import websocketService dynamically to avoid circular dependency
            Promise.resolve().then(() => __importStar(require('../server'))).then(({ websocketService }) => {
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
            const createdAgent = {
                id: agent.agentId,
                branch: agent.branch,
                worktreePath: agent.worktreePath,
                tmuxSession: agent.tmuxSession,
                status: 'RUNNING',
                createdAt: new Date(),
                projectId: options.projectId
            };
            // If projectId is provided, add agent to the project
            if (options.projectId) {
                try {
                    await getProjectManager().addAgentToProject(options.projectId, agent.agentId);
                }
                catch (error) {
                    console.warn(`Failed to add agent ${agent.agentId} to project ${options.projectId}:`, error);
                    // Don't fail agent creation if project association fails
                }
            }
            emitProgress(currentStepIndex, 'completed');
            return createdAgent;
        }
        catch (error) {
            emitProgress(currentStepIndex, 'error', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    },
    async updateAgentStatus(id, status) {
        // For status updates, we need to implement this in CLI AgentManager
        // For now, we'll just return the agent with updated status from memory
        const agent = await this.getAgent(id);
        // Note: This doesn't persist the status change to the CLI storage
        // In a complete implementation, AgentManager would need status update methods
        return {
            ...agent,
            status,
            updatedAt: new Date()
        };
    },
    async deleteAgent(id, removeWorktree = false) {
        // Get agent info first to find associated project
        const agent = await this.getAgent(id);
        // Remove agent from project if associated
        if (agent.projectId) {
            try {
                await getProjectManager().removeAgentFromProject(agent.projectId, id);
            }
            catch (error) {
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
    async updateAgentConfig(id, config) {
        // Get the agent first to ensure it exists
        const agent = await this.getAgent(id);
        // Use database-backed implementation if available
        if (AgentService_1.AgentService.isUsingDatabase()) {
            await getAgentManager().updateAgentConfig(id, config);
        }
        else {
            // Fallback to in-memory storage for CLI-only mode
            agent.config = config;
            console.log(`Updated config for agent ${id} (in-memory only):`, config);
        }
    },
    async assignAgentToProject(agentId, projectId) {
        // Get agent and project to ensure they exist
        const agent = await this.getAgent(agentId);
        await getProjectManager().getProject(projectId);
        // Remove from previous project if assigned
        if (agent.projectId && agent.projectId !== projectId) {
            try {
                await getProjectManager().removeAgentFromProject(agent.projectId, agentId);
            }
            catch (error) {
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
    async unassignAgentFromProject(agentId) {
        const agent = await this.getAgent(agentId);
        if (agent.projectId) {
            try {
                await getProjectManager().removeAgentFromProject(agent.projectId, agentId);
            }
            catch (error) {
                console.warn(`Failed to remove agent ${agentId} from project ${agent.projectId}:`, error);
            }
            // Update agent to remove project assignment
            agent.projectId = '';
            agent.updatedAt = new Date();
        }
        return agent;
    },
    async getAgentsByProject(projectId) {
        // Verify project exists
        await getProjectManager().getProject(projectId);
        // Get all agents and filter by project
        const allAgents = await getAgentManager().getActiveAgents();
        return allAgents.filter((agent) => agent.projectId === projectId);
    },
    async assignTaskToAgent(agentId, taskId) {
        const agent = await this.getAgent(agentId);
        // Note: In a complete implementation, this would integrate with TaskMaster
        // and persist the task assignment to CLI storage
        console.log(`Assigned task ${taskId} to agent ${agentId}`);
        return {
            ...agent,
            updatedAt: new Date()
        };
    }
};
//# sourceMappingURL=agentController.js.map