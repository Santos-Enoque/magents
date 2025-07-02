import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  onAgentCreate: () => void;
  onAgentStart: (id: string) => void;
  onAgentStop: (id: string) => void;
  onTaskAssign: () => void;
  agents: Agent[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAgentCreate,
  onAgentStart,
  onAgentStop,
  onTaskAssign,
  agents,
}) => {
  const navigate = useNavigate();
  const [showBulkActions, setShowBulkActions] = useState(false);

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED');

  const handleCreateAgent = () => {
    navigate('/agents/new');
  };

  const handleAssignTasks = () => {
    navigate('/tasks/assign');
  };

  const handleStartAll = () => {
    stoppedAgents.forEach(agent => onAgentStart(agent.id));
  };

  const handleStopAll = () => {
    runningAgents.forEach(agent => onAgentStop(agent.id));
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
            onClick={() => {/* Handle start stopped agents */}}
            className="flex flex-col items-center gap-2 p-4 bg-status-success text-white rounded-lg hover:bg-status-success/80 transition-colors"
          >
            <PlayIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Start ({stoppedAgents.length})</span>
          </button>
        )}

        {runningAgents.length > 0 && (
          <button
            onClick={() => {/* Handle stop running agents */}}
            className="flex flex-col items-center gap-2 p-4 bg-foreground-tertiary text-white rounded-lg hover:bg-foreground-secondary transition-colors"
          >
            <StopIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Stop ({runningAgents.length})</span>
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
              onClick={() => {/* Handle restart all */}}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center gap-2"
            >
              <RocketLaunchIcon className="w-4 h-4" />
              Restart All
            </button>

            <button
              onClick={() => {/* Handle clean up */}}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Clean Up Stopped
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-foreground-tertiary">
          <span>💡 Use keyboard shortcuts for faster access</span>
          <div className="flex gap-2">
            <kbd className="px-2 py-1 bg-background-tertiary rounded border border-border text-foreground-secondary">Ctrl+N</kbd>
            <span>Create Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
};