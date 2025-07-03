import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';
import { mockApiService } from '../services/mockApi';
import { useDemoMode } from './DemoModeProvider';
import {
  PlusIcon,
  PlayIcon,
  StopIcon,
  ClipboardDocumentListIcon,
  CommandLineIcon,
  CogIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  branch: string;
}

interface QuickActionsProps {
  agents: Agent[];
  onRefresh?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  agents,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  // Use appropriate API service
  const { isDemoMode } = useDemoMode();
  const currentApiService = isDemoMode ? mockApiService : apiService;

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED');

  const setLoadingState = (key: string, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: loading }));
  };

  const handleCreateAgent = () => {
    navigate('/agents/new');
  };

  const handleAssignTasks = () => {
    navigate('/tasks/assign');
  };

  const handleStartAgent = async (agentId: string) => {
    setLoadingState(`start-${agentId}`, true);
    try {
      await currentApiService.startAgent(agentId);
      toast.success(`Agent ${agentId} started successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to start agent ${agentId}`);
      console.error('Failed to start agent:', error);
    } finally {
      setLoadingState(`start-${agentId}`, false);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    setLoadingState(`stop-${agentId}`, true);
    try {
      await currentApiService.stopAgent(agentId);
      toast.success(`Agent ${agentId} stopped successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to stop agent ${agentId}`);
      console.error('Failed to stop agent:', error);
    } finally {
      setLoadingState(`stop-${agentId}`, false);
    }
  };

  const handleStartAll = async () => {
    setLoadingState('start-all', true);
    try {
      const promises = stoppedAgents.map(agent => currentApiService.startAgent(agent.id));
      await Promise.all(promises);
      toast.success(`Started ${stoppedAgents.length} agents`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to start some agents');
      console.error('Failed to start agents:', error);
    } finally {
      setLoadingState('start-all', false);
    }
  };

  const handleStopAll = async () => {
    setLoadingState('stop-all', true);
    try {
      const promises = runningAgents.map(agent => currentApiService.stopAgent(agent.id));
      await Promise.all(promises);
      toast.success(`Stopped ${runningAgents.length} agents`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to stop some agents');
      console.error('Failed to stop agents:', error);
    } finally {
      setLoadingState('stop-all', false);
    }
  };

  const handleRestartAll = async () => {
    setLoadingState('restart-all', true);
    try {
      // Stop all running agents first
      const stopPromises = runningAgents.map(agent => currentApiService.stopAgent(agent.id));
      await Promise.all(stopPromises);
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start all agents
      const startPromises = agents.map(agent => currentApiService.startAgent(agent.id));
      await Promise.all(startPromises);
      
      toast.success(`Restarted ${agents.length} agents`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to restart agents');
      console.error('Failed to restart agents:', error);
    } finally {
      setLoadingState('restart-all', false);
    }
  };

  const handleCleanUpStopped = async () => {
    setLoadingState('cleanup', true);
    try {
      const promises = stoppedAgents.map(agent => currentApiService.deleteAgent(agent.id));
      await Promise.all(promises);
      toast.success(`Cleaned up ${stoppedAgents.length} stopped agents`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to clean up stopped agents');
      console.error('Failed to clean up agents:', error);
    } finally {
      setLoadingState('cleanup', false);
    }
  };

  const handleOpenTerminal = () => {
    navigate('/terminal');
  };

  const handleOpenSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <button
          onClick={() => setShowBulkActions(!showBulkActions)}
          className="text-sm text-brand hover:text-brand-hover"
        >
          {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Primary Actions */}
        <button
          onClick={handleCreateAgent}
          className="flex flex-col items-center gap-2 p-4 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors group"
        >
          <PlusIcon className="w-6 h-6" />
          <span className="text-sm font-medium">Create Agent</span>
        </button>

        <button
          onClick={handleAssignTasks}
          className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors group"
        >
          <ClipboardDocumentListIcon className="w-6 h-6" />
          <span className="text-sm font-medium">Assign Tasks</span>
        </button>

        <button
          onClick={handleOpenTerminal}
          className="flex flex-col items-center gap-2 p-4 bg-background-tertiary text-foreground rounded-lg hover:bg-background-card-hover transition-colors border border-border"
        >
          <CommandLineIcon className="w-6 h-6" />
          <span className="text-sm font-medium">Terminal</span>
        </button>

        <button
          onClick={handleOpenSettings}
          className="flex flex-col items-center gap-2 p-4 bg-background-tertiary text-foreground rounded-lg hover:bg-background-card-hover transition-colors border border-border"
        >
          <CogIcon className="w-6 h-6" />
          <span className="text-sm font-medium">Settings</span>
        </button>

        {/* Conditional Actions */}
        {stoppedAgents.length > 0 && (
          <button
            onClick={handleStartAll}
            disabled={isLoading['start-all']}
            className="flex flex-col items-center gap-2 p-4 bg-status-success text-white rounded-lg hover:bg-status-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon className={`w-6 h-6 ${isLoading['start-all'] ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isLoading['start-all'] ? 'Starting...' : `Start (${stoppedAgents.length})`}
            </span>
          </button>
        )}

        {runningAgents.length > 0 && (
          <button
            onClick={handleStopAll}
            disabled={isLoading['stop-all']}
            className="flex flex-col items-center gap-2 p-4 bg-foreground-tertiary text-white rounded-lg hover:bg-foreground-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StopIcon className={`w-6 h-6 ${isLoading['stop-all'] ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isLoading['stop-all'] ? 'Stopping...' : `Stop (${runningAgents.length})`}
            </span>
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Bulk Operations</h3>
          <div className="flex flex-wrap gap-2">
            {stoppedAgents.length > 0 && (
              <button
                onClick={handleStartAll}
                className="px-3 py-2 bg-status-success text-white rounded-lg hover:bg-status-success/80 transition-colors text-sm flex items-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                Start All Stopped ({stoppedAgents.length})
              </button>
            )}

            {runningAgents.length > 0 && (
              <button
                onClick={handleStopAll}
                className="px-3 py-2 bg-foreground-tertiary text-white rounded-lg hover:bg-foreground-secondary transition-colors text-sm flex items-center gap-2"
              >
                <StopIcon className="w-4 h-4" />
                Stop All Running ({runningAgents.length})
              </button>
            )}

            <button
              onClick={handleRestartAll}
              disabled={isLoading['restart-all']}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RocketLaunchIcon className={`w-4 h-4 ${isLoading['restart-all'] ? 'animate-spin' : ''}`} />
              {isLoading['restart-all'] ? 'Restarting...' : 'Restart All'}
            </button>

            <button
              onClick={handleCleanUpStopped}
              disabled={isLoading['cleanup'] || stoppedAgents.length === 0}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading['cleanup'] ? 'Cleaning...' : 'Clean Up Stopped'}
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-foreground-tertiary space-y-2">
          <div className="flex items-center justify-between">
            <span>💡 Use keyboard shortcuts for faster access</span>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+?</kbd>
              <span>Show all shortcuts</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+N</kbd>
              <span>Create Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+T</kbd>
              <span>Open Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+V</kbd>
              <span>Toggle View</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+R</kbd>
              <span>Refresh</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};