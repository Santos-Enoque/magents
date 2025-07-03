import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';
import { mockApiService } from '../services/mockApi';
import { useDemoMode } from './DemoModeProvider';
import {
  PlayIcon,
  StopIcon,
  CodeBracketIcon,
  ComputerDesktopIcon,
  ClockIcon,
  CpuChipIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  branch: string;
  project?: string;
  lastActivity?: string | Date;
  createdAt?: string | Date;
  worktreePath?: string;
  tmuxSession?: string;
  dockerContainer?: string;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface AgentCardProps {
  agent: Agent;
  viewMode: 'grid' | 'list';
  onRefresh?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  viewMode,
  onRefresh,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use appropriate API service
  const { isDemoMode } = useDemoMode();
  const currentApiService = isDemoMode ? mockApiService : apiService;

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await currentApiService.startAgent(agent.id);
      toast.success(`Agent ${agent.id} started successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to start agent ${agent.id}`);
      console.error('Failed to start agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await currentApiService.stopAgent(agent.id);
      toast.success(`Agent ${agent.id} stopped successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to stop agent ${agent.id}`);
      console.error('Failed to stop agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttach = () => {
    // Open inline terminal or navigate to terminal page
    if (window.innerWidth >= 1024) {
      // On larger screens, trigger inline terminal
      window.dispatchEvent(new CustomEvent('open-terminal', { 
        detail: { agentId: agent.id } 
      }));
    } else {
      // On smaller screens, navigate to dedicated terminal page
      window.open(`/terminal?agent=${agent.id}`, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete agent ${agent.id}?`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      await currentApiService.deleteAgent(agent.id);
      toast.success(`Agent ${agent.id} deleted successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to delete agent ${agent.id}`);
      console.error('Failed to delete agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'text-status-success bg-status-success/20';
      case 'ERROR':
        return 'text-status-error bg-status-error/20';
      default:
        return 'text-foreground-tertiary bg-foreground-tertiary/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'ERROR':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp?: string | Date) => {
    if (!timestamp) return 'Never';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-background-card border border-border rounded-lg p-4 hover:bg-background-card-hover transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                agent.status === 'RUNNING' ? 'bg-status-success' : 
                agent.status === 'ERROR' ? 'bg-status-error' : 'bg-foreground-tertiary'
              }`} />
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(agent.status)}`}>
                {agent.status}
              </span>
            </div>

            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">{agent.id}</h3>
                <CodeBracketIcon className="w-4 h-4 text-foreground-secondary" />
                <span className="text-sm text-foreground-secondary">{agent.branch}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-foreground-tertiary">
                <span>Last: {formatTime(agent.lastActivity)}</span>
                {agent.cpuUsage && (
                  <span>CPU: {agent.cpuUsage.toFixed(1)}%</span>
                )}
                {agent.memoryUsage && (
                  <span>Memory: {agent.memoryUsage.toFixed(1)}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {agent.status === 'RUNNING' ? (
              <>
                <button
                  onClick={handleAttach}
                  className="p-2 text-brand hover:bg-brand/20 rounded-lg transition-colors"
                  title="Attach to agent"
                  disabled={isLoading}
                >
                  <ComputerDesktopIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStop}
                  className="p-2 text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors disabled:opacity-50"
                  title="Stop agent"
                  disabled={isLoading}
                >
                  <StopIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            ) : (
              <button
                onClick={handleStart}
                className="p-2 text-status-success hover:bg-status-success/20 rounded-lg transition-colors disabled:opacity-50"
                title="Start agent"
                disabled={isLoading}
              >
                <PlayIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"
              >
                <EllipsisVerticalIcon className="w-4 h-4" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-background-card border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                    View Details
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                    View Logs
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                    Clone Agent
                  </button>
                  <hr className="my-1 border-border" />
                  <button 
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-status-error hover:bg-status-error/20 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete Agent'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-background-card border border-border rounded-lg p-4 hover:bg-background-card-hover transition-colors relative">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(agent.status)}
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(agent.status)}`}>
            {agent.status}
          </span>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-foreground-secondary hover:bg-background-tertiary rounded transition-colors"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-full mt-1 bg-background-card border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                View Details
              </button>
              <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                View Logs
              </button>
              <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary transition-colors">
                Clone Agent
              </button>
              <hr className="my-1 border-border" />
              <button 
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-status-error hover:bg-status-error/20 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Agent Info */}
      <div className="mb-4">
        <h3 className="font-medium text-foreground mb-1 truncate" title={agent.id}>
          {agent.id}
        </h3>
        <div className="flex items-center gap-1 text-sm text-foreground-secondary mb-2">
          <CodeBracketIcon className="w-3 h-3" />
          <span className="truncate" title={agent.branch}>{agent.branch}</span>
        </div>
        
        {/* Resource Usage */}
        {(agent.cpuUsage || agent.memoryUsage) && (
          <div className="flex items-center gap-3 text-xs text-foreground-tertiary">
            {agent.cpuUsage && (
              <div className="flex items-center gap-1">
                <CpuChipIcon className="w-3 h-3" />
                <span>{agent.cpuUsage.toFixed(1)}%</span>
              </div>
            )}
            {agent.memoryUsage && (
              <div className="flex items-center gap-1">
                <span>RAM: {agent.memoryUsage.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time Info */}
      <div className="text-xs text-foreground-tertiary mb-4">
        <div>Last activity: {formatTime(agent.lastActivity)}</div>
        <div>Created: {formatTime(agent.createdAt)}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {agent.status === 'RUNNING' ? (
          <>
            <button
              onClick={handleAttach}
              className="flex-1 px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Attach
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-2 bg-background-tertiary text-foreground-secondary rounded-lg hover:bg-background-card-hover transition-colors text-sm disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Stopping...' : 'Stop'}
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            className="w-full px-3 py-2 bg-status-success text-white rounded-lg hover:bg-status-success/80 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isLoading}
          >
            <PlayIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Starting...' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
};