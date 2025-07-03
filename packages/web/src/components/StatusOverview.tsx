import React from 'react';
import { LiveMetrics } from './LiveMetrics';
import {
  ServerIcon,
  FolderIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  cpuUsage?: number;
  memoryUsage?: number;
}

interface Project {
  id: string;
  name: string;
  agents?: Agent[] | string[];
}

interface StatusOverviewProps {
  agents: Agent[];
  projects: Project[];
  isLoading: boolean;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({
  agents,
  projects,
  isLoading,
}) => {
  const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED');
  const errorAgents = agents.filter(agent => agent.status === 'ERROR');
  
  const avgCpuUsage = runningAgents.length > 0 
    ? runningAgents.reduce((acc, agent) => acc + (agent.cpuUsage || 0), 0) / runningAgents.length
    : 0;
    
  const avgMemoryUsage = runningAgents.length > 0
    ? runningAgents.reduce((acc, agent) => acc + (agent.memoryUsage || 0), 0) / runningAgents.length
    : 0;

  const systemHealth = agents.length > 0 
    ? Math.round(((agents.length - errorAgents.length) / agents.length) * 100)
    : 100;

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-status-success';
    if (health >= 70) return 'text-yellow-500';
    return 'text-status-error';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 90) return <CheckCircleIcon className="w-6 h-6" />;
    if (health >= 70) return <ExclamationTriangleIcon className="w-6 h-6" />;
    return <ExclamationTriangleIcon className="w-6 h-6" />;
  };

  return (
    <div className="space-y-6">
      {/* Agent and Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Agents */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-status-success/20">
              <ServerIcon className="h-5 w-5 text-status-success" />
            </div>
            <div className={`w-2 h-2 rounded-full ${runningAgents.length > 0 ? 'bg-status-success' : 'bg-foreground-tertiary'}`} />
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Active Agents</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? '...' : runningAgents.length}
          </p>
          <p className="text-xs text-foreground-tertiary mt-1">
            {agents.length} total
          </p>
        </div>

        {/* Total Projects */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-brand/20">
              <FolderIcon className="h-5 w-5 text-brand" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Projects</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? '...' : projects.length}
          </p>
          <p className="text-xs text-foreground-tertiary mt-1">
            Active workspaces
          </p>
        </div>

        {/* System Health */}
        <div className="bg-background-tertiary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${getHealthColor(systemHealth)}/20`}>
              {getHealthIcon(systemHealth)}
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">System Health</p>
          <p className={`text-2xl font-bold ${getHealthColor(systemHealth)}`}>
            {isLoading ? '...' : `${systemHealth}%`}
          </p>
          <p className="text-xs text-foreground-tertiary mt-1">
            {errorAgents.length} error{errorAgents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Live System Metrics via SSE */}
      <div>
        <h3 className="text-sm font-medium text-foreground-secondary mb-3">Live System Metrics</h3>
        <LiveMetrics />
      </div>
    </div>
  );
};