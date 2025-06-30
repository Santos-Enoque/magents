import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft } from 'lucide-react';
import { AgentCreateForm, AgentFormData } from '../components/AgentCreateForm';
import { apiService } from '../services/api';
import { CreateAgentOptions } from '@magents/shared';

export const CreateAgent: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAgent = async (formData: AgentFormData) => {
    setIsCreating(true);

    try {
      // Transform form data to CreateAgentOptions
      const createOptions: CreateAgentOptions = {
        branch: formData.branch.trim(),
        agentId: formData.agentId.trim() || undefined,
        autoAccept: formData.autoAccept,
        useDocker: formData.useDocker,
        projectId: formData.projectId?.trim() || undefined,
      };

      // Create the agent
      const createdAgent = await apiService.createAgent(createOptions);

      // Show success toast
      toast.success(`Agent "${createdAgent.id}" created successfully!`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      // Invalidate queries to refresh agent list
      await queryClient.invalidateQueries({ queryKey: ['agents'] });

      // Navigate to agents page with the new agent
      navigate('/agents', {
        state: { highlightAgentId: createdAgent.id }
      });

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

      // Re-throw to let the form handle it as well
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/agents');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Agents
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Create New Agent</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a new Claude Code agent with a dedicated Git worktree and tmux session.
          The agent will be able to work independently on the specified branch.
        </p>
      </div>

      {/* Form */}
      <AgentCreateForm
        onSubmit={handleCreateAgent}
        onCancel={handleCancel}
        isLoading={isCreating}
      />

      {/* Additional Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">What happens when you create an agent?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>A new Git worktree is created for the specified branch</li>
          <li>A tmux session is started with the agent ID as the session name</li>
          <li>Claude Code is launched within the tmux session</li>
          <li>The agent begins working on the branch independently</li>
          <li>You can monitor and manage the agent from the dashboard</li>
        </ul>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Tips for creating agents</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Use descriptive agent IDs that reflect the task or feature</li>
          <li>Create feature branches before creating agents for new features</li>
          <li>Enable auto-accept for routine tasks, disable for complex changes</li>
          <li>Use project IDs to group related agents together</li>
          <li>Monitor agent status regularly to ensure they're working correctly</li>
        </ul>
      </div>
    </div>
  );
};