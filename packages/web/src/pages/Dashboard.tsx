import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { 
  ServerIcon, 
  FolderIcon, 
  CheckCircleIcon,
  ChartBarIcon,
  PlayIcon,
  StopIcon,
  CodeBracketIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, inProgress: 0 });
  
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  // Fetch task statistics for the first project
  useEffect(() => {
    const fetchTaskStats = async () => {
      if (projects.length > 0) {
        try {
          const stats = await apiService.getTaskMasterStatistics(projects[0].path);
          if (stats) {
            setTaskStats({
              total: stats.total || 0,
              done: stats.done || 0,
              inProgress: stats.inProgress || 0
            });
          }
        } catch (error) {
          console.error('Failed to fetch task statistics:', error);
        }
      }
    };
    
    fetchTaskStats();
  }, [projects]);

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING').length;
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED').length;
  const errorAgents = agents.filter(agent => agent.status === 'ERROR').length;
  const totalAgents = agents.length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-brand/20 to-purple-600/20 rounded-xl p-8 border border-border">
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Developer</h1>
        <p className="text-foreground-secondary text-lg">
          You have {runningAgents} active agents working across {projects.length} projects
        </p>
        <div className="mt-6 flex gap-4">
          <button 
            onClick={() => navigate('/agents/create')}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <PlayIcon className="w-4 h-4" />
            Create Agent
          </button>
          <button 
            onClick={() => navigate('/projects/new')}
            className="px-4 py-2 bg-background-tertiary hover:bg-background-card-hover text-foreground border border-border rounded-lg font-medium transition-colors">
            New Project
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-status-success/20">
              <ServerIcon className="h-6 w-6 text-status-success" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Active Agents</p>
          <p className="text-3xl font-bold text-foreground">
            {agentsLoading ? '...' : runningAgents}
          </p>
          <p className="text-xs text-foreground-tertiary mt-2">
            Across all workspaces
          </p>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-brand/20">
              <FolderIcon className="h-6 w-6 text-brand" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-foreground">
            {projectsLoading ? '...' : projects.length}
          </p>
          <p className="text-xs text-foreground-tertiary mt-2">
            Across all workspaces
          </p>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-status-warning/20">
              <CheckCircleIcon className="h-6 w-6 text-status-warning" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Tasks Completed</p>
          <p className="text-3xl font-bold text-foreground">{taskStats.done}</p>
          <p className="text-xs text-foreground-tertiary mt-2">
            {taskStats.total} total tasks
          </p>
        </div>

        <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-status-success/20">
              <ChartBarIcon className="h-6 w-6 text-status-success" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">System Health</p>
          <p className="text-3xl font-bold text-foreground">
            {totalAgents > 0 
              ? Math.round(((totalAgents - errorAgents) / totalAgents) * 100) 
              : 100}%
          </p>
          <p className="text-xs text-status-success mt-2">
            {errorAgents > 0 ? `${errorAgents} agent(s) with errors` : 'All systems operational'}
          </p>
        </div>
      </div>

      {/* Live Agents and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Agents */}
        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ServerIcon className="w-5 h-5 text-foreground-secondary" />
              Live Agents
            </h2>
            <a href="/agents" className="text-sm text-brand hover:text-brand-hover">
              View All Agents
            </a>
          </div>
          <div className="space-y-3">
            {agentsLoading ? (
              <div className="text-foreground-tertiary text-center py-8">Loading...</div>
            ) : agents.slice(0, 4).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg hover:bg-background-card-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    agent.status === 'RUNNING' ? 'bg-status-success' : 
                    agent.status === 'ERROR' ? 'bg-status-error' : 'bg-foreground-tertiary'
                  }`} />
                  <div>
                    <p className="font-medium text-foreground text-sm">{agent.id}</p>
                    <p className="text-xs text-foreground-tertiary flex items-center gap-1 mt-0.5">
                      <CodeBracketIcon className="w-3 h-3" />
                      {agent.branch}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    agent.status === 'RUNNING' ? 'bg-status-success/20 text-status-success' : 
                    agent.status === 'STOPPED' ? 'bg-foreground-tertiary/20 text-foreground-tertiary' :
                    'bg-status-error/20 text-status-error'
                  }`}>
                    {agent.status}
                  </span>
                  <span className="text-xs text-foreground-tertiary">
                    {agent.createdAt ? new Date(agent.createdAt).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-foreground-secondary" />
              Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3">
              <PlayIcon className="w-5 h-5 text-status-success mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Agent started on <span className="font-medium">feature/auth-system</span></p>
                <p className="text-xs text-foreground-tertiary mt-1">web-app • 5m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3">
              <CheckCircleIcon className="w-5 h-5 text-brand mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Completed user authentication implementation</p>
                <p className="text-xs text-foreground-tertiary mt-1">web-app • 15m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3">
              <StopIcon className="w-5 h-5 text-foreground-tertiary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Agent stopped on <span className="font-medium">fix/database-connection</span></p>
                <p className="text-xs text-foreground-tertiary mt-1">api-service • 30m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3">
              <CodeBracketIcon className="w-5 h-5 text-purple-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Created new branch <span className="font-medium">feature/dashboard-ui</span></p>
                <p className="text-xs text-foreground-tertiary mt-1">web-app • 45m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-status-error mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Agent encountered error in test execution</p>
                <p className="text-xs text-foreground-tertiary mt-1">api-service • 60m ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-background-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-foreground-secondary" />
            Recent Projects
          </h2>
          <a href="/projects" className="text-sm text-brand hover:text-brand-hover">
            View All Projects
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsLoading ? (
            <div className="text-foreground-tertiary text-center py-8 col-span-3">Loading...</div>
          ) : projects.slice(0, 3).map((project) => (
            <div key={project.id} className="p-6 bg-background-tertiary rounded-lg hover:bg-background-card-hover transition-colors border border-border">
              <h3 className="font-semibold text-foreground mb-2">{project.name}</h3>
              <p className="text-sm text-foreground-tertiary mb-4">{project.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-tertiary">
                  {project.agents?.length || 0} agents
                </span>
                <button className="text-sm text-brand hover:text-brand-hover font-medium">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};