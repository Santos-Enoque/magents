import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, Server, GitBranch, Terminal, Shield, Monitor } from 'lucide-react';
import { AgentCreationWizard } from '../components/AgentCreationWizard';
import { AgentCreationProgress } from '../components/AgentCreationProgress';
import { apiService } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { CreateAgentOptions } from '@magents/shared';

export const CreateAgent: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { agentProgress, subscribe, unsubscribe } = useWebSocket();
  const [isCreating, setIsCreating] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

  // Fetch projects and tasks for the wizard
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['taskmaster-tasks'],
    queryFn: async () => {
      try {
        // Use project root path - for now hardcode, but in future could be dynamic based on selected project
        const currentPath = '/Users/santossafrao/Development/personal/magents';
        return await apiService.getTaskMasterTasks(currentPath);
      } catch (error) {
        // TaskMaster might not be available, return empty array
        console.warn('TaskMaster not available:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Subscribe to agent events when component mounts
  useEffect(() => {
    subscribe('agents');
    return () => unsubscribe('agents');
  }, [subscribe, unsubscribe]);

  // Handle progress completion
  useEffect(() => {
    if (currentAgentId && agentProgress[currentAgentId]) {
      const progress = agentProgress[currentAgentId];
      if (progress.percentage === 100 && !progress.error) {
        // Agent creation completed successfully
        setTimeout(() => {
          setIsCreating(false);
          setCurrentAgentId(null);
          navigate('/agents');
        }, 1000);
      } else if (progress.error) {
        // Agent creation failed
        setIsCreating(false);
        setCurrentAgentId(null);
      }
    }
  }, [currentAgentId, agentProgress, navigate]);

  const handleCreateAgent = async (options: CreateAgentOptions) => {
    setIsCreating(true);

    try {
      // Set the agent ID for progress tracking
      const agentId = options.agentId || `agent-${Date.now()}`;
      setCurrentAgentId(agentId);

      // Create the agent
      await apiService.createAgent(options);

      // Don't show success toast or navigate immediately - let progress tracker handle it
      // Invalidate queries to refresh agent list
      await queryClient.invalidateQueries({ queryKey: ['agents'] });

    } catch (error) {
      console.error('Failed to create agent:', error);
      
      // Show error toast
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create agent. Please try again.';
        
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      // Reset state on error
      setIsCreating(false);
      setCurrentAgentId(null);

      // Re-throw to let the form handle it as well
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/agents');
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center text-sm text-foreground-secondary hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Agents
        </button>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">Create New Agent</h1>
        <p className="text-base text-foreground-secondary">
          Create a new Claude Code agent with a dedicated Git worktree and tmux session.
          The agent will be able to work independently on the specified branch.
        </p>
      </div>

      {/* Progress Tracker - Show when creating agent */}
      {isCreating && currentAgentId && agentProgress[currentAgentId] && (
        <div className="mb-6">
          <AgentCreationProgress 
            progress={agentProgress[currentAgentId]} 
            agentId={currentAgentId}
          />
        </div>
      )}

      {/* Wizard */}
      <AgentCreationWizard
        onSubmit={handleCreateAgent}
        onCancel={handleCancel}
        isLoading={isCreating}
        projects={projects}
        tasks={tasks}
      />

      {/* Additional Information */}
      <div className="mt-8 bg-background-card border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-brand" />
          What happens when you create an agent?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <GitBranch className="w-4 h-4 text-status-info mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-foreground-secondary">
              A new Git worktree is created for the specified branch, providing an isolated workspace
            </p>
          </div>
          <div className="flex items-start">
            <Terminal className="w-4 h-4 text-status-success mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-foreground-secondary">
              A tmux session is started with the agent ID as the session name for easy management
            </p>
          </div>
          <div className="flex items-start">
            <Shield className="w-4 h-4 text-status-warning mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-foreground-secondary">
              If Docker mode is enabled, the agent runs in an isolated container with resource limits
            </p>
          </div>
          <div className="flex items-start">
            <Monitor className="w-4 h-4 text-brand mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-foreground-secondary">
              Claude Code is launched within the environment and begins working independently
            </p>
          </div>
          <div className="flex items-start">
            <div className="w-4 h-4 rounded-full bg-status-success mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-foreground-secondary">
              You can monitor, manage, and interact with the agent from the unified dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-background-tertiary border border-border-light rounded-lg p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">💡 Pro Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Use descriptive agent IDs that reflect the task or feature
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Create feature branches before creating agents for new features
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Enable Docker mode for better isolation and security
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Enable auto-accept for routine tasks, disable for complex changes
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Use project IDs to group related agents together
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-brand mr-2">•</span>
              <p className="text-sm text-foreground-secondary">
                Monitor agent status regularly to ensure they're working correctly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};