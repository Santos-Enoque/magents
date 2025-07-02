import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

export const Analytics: React.FC = () => {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  // Calculate metrics
  const totalAgents = agents.length;
  const runningAgents = agents.filter(a => a.status === 'RUNNING').length;
  const stoppedAgents = agents.filter(a => a.status === 'STOPPED').length;
  const errorAgents = agents.filter(a => a.status === 'ERROR').length;
  
  const agentUptime = totalAgents > 0 
    ? Math.round((runningAgents / totalAgents) * 100) 
    : 0;

  const projectsWithAgents = projects.filter(p => 
    agents.some(a => a.projectId === p.id)
  ).length;

  const averageAgentsPerProject = projects.length > 0
    ? (totalAgents / projects.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-foreground-secondary mt-1">
          System performance and usage metrics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground-secondary">Agent Uptime</p>
              <p className="text-2xl font-bold text-foreground mt-1">{agentUptime}%</p>
              <p className="text-xs text-foreground-tertiary mt-2">
                {runningAgents} of {totalAgents} running
              </p>
            </div>
            <div className="p-3 rounded-lg bg-status-success/20">
              <ArrowTrendingUpIcon className="h-6 w-6 text-status-success" />
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground-secondary">Total Agents</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalAgents}</p>
              <p className="text-xs text-foreground-tertiary mt-2">
                Across {projects.length} projects
              </p>
            </div>
            <div className="p-3 rounded-lg bg-brand/20">
              <ServerIcon className="h-6 w-6 text-brand" />
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground-secondary">Active Projects</p>
              <p className="text-2xl font-bold text-foreground mt-1">{projectsWithAgents}</p>
              <p className="text-xs text-foreground-tertiary mt-2">
                With running agents
              </p>
            </div>
            <div className="p-3 rounded-lg bg-brand/20">
              <CheckCircleIcon className="h-6 w-6 text-brand" />
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground-secondary">Avg Agents/Project</p>
              <p className="text-2xl font-bold text-foreground mt-1">{averageAgentsPerProject}</p>
              <p className="text-xs text-foreground-tertiary mt-2">
                Distribution metric
              </p>
            </div>
            <div className="p-3 rounded-lg bg-foreground-tertiary/20">
              <ChartBarIcon className="h-6 w-6 text-foreground-tertiary" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Breakdown */}
      <div className="bg-background-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Agent Status Distribution</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground-secondary">Running</span>
              <span className="text-sm font-medium text-status-success">{runningAgents} agents</span>
            </div>
            <div className="w-full bg-background-tertiary rounded-full h-2">
              <div 
                className="bg-status-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalAgents > 0 ? (runningAgents / totalAgents) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground-secondary">Stopped</span>
              <span className="text-sm font-medium text-foreground-tertiary">{stoppedAgents} agents</span>
            </div>
            <div className="w-full bg-background-tertiary rounded-full h-2">
              <div 
                className="bg-foreground-tertiary h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalAgents > 0 ? (stoppedAgents / totalAgents) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground-secondary">Error</span>
              <span className="text-sm font-medium text-status-error">{errorAgents} agents</span>
            </div>
            <div className="w-full bg-background-tertiary rounded-full h-2">
              <div 
                className="bg-status-error h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalAgents > 0 ? (errorAgents / totalAgents) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">System Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-foreground-tertiary" />
                <span className="text-sm text-foreground">Average agent runtime</span>
              </div>
              <span className="text-sm font-medium text-foreground">2h 34m</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-status-success" />
                <span className="text-sm text-foreground">Tasks completed today</span>
              </div>
              <span className="text-sm font-medium text-foreground">12</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <ServerIcon className="h-5 w-5 text-brand" />
                <span className="text-sm text-foreground">New agents this week</span>
              </div>
              <span className="text-sm font-medium text-foreground">3</span>
            </div>
          </div>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Performance Metrics</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="h-5 w-5 text-status-success" />
                <span className="text-sm text-foreground">Success rate</span>
              </div>
              <span className="text-sm font-medium text-status-success">94.2%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <ArrowTrendingDownIcon className="h-5 w-5 text-status-error" />
                <span className="text-sm text-foreground">Error rate</span>
              </div>
              <span className="text-sm font-medium text-status-error">5.8%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-foreground-tertiary" />
                <span className="text-sm text-foreground">Avg response time</span>
              </div>
              <span className="text-sm font-medium text-foreground">234ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};