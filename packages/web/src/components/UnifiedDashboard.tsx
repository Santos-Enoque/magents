import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AgentCard } from './AgentCard';
import { QuickActions } from './QuickActions';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusOverview } from './StatusOverview';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  branch: string;
  project?: string;
  lastActivity?: string;
  createdAt?: string;
  worktreePath?: string;
  tmuxSession?: string;
  dockerContainer?: string;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  agents?: Agent[];
}

export const UnifiedDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    agents: true,
    projects: false,
    advanced: false,
  });

  // WebSocket for real-time updates
  const { socket, isConnected } = useWebSocket();

  // Data queries
  const { data: agents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  // Real-time updates via WebSocket
  useEffect(() => {
    if (socket) {
      socket.on('agent-status-changed', () => {
        refetchAgents();
      });

      socket.on('agent-created', () => {
        refetchAgents();
      });

      socket.on('agent-deleted', () => {
        refetchAgents();
      });

      return () => {
        socket.off('agent-status-changed');
        socket.off('agent-created');
        socket.off('agent-deleted');
      };
    }
  }, [socket, refetchAgents]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED');
  const errorAgents = agents.filter(agent => agent.status === 'ERROR');

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Development Dashboard</h1>
          <p className="text-foreground-secondary mt-1">
            Manage your multi-agent development workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-sm text-foreground-secondary">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-background-tertiary rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-background-card text-foreground' 
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-background-card text-foreground' 
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Overview - Always Visible */}
      <CollapsibleSection
        title="System Overview"
        isExpanded={expandedSections.overview}
        onToggle={() => toggleSection('overview')}
      >
        <StatusOverview
          agents={agents}
          projects={projects}
          isLoading={agentsLoading || projectsLoading}
        />
      </CollapsibleSection>

      {/* Quick Actions */}
      <QuickActions 
        onAgentCreate={() => {/* Navigate to create */}}
        onAgentStart={(id) => {/* Start agent */}}
        onAgentStop={(id) => {/* Stop agent */}}
        onTaskAssign={() => {/* Navigate to task assignment */}}
        agents={agents}
      />

      {/* Agents Section */}
      <CollapsibleSection
        title={`Active Agents (${agents.length})`}
        isExpanded={expandedSections.agents}
        onToggle={() => toggleSection('agents')}
      >
        <div className="space-y-4">
          {/* Running Agents */}
          {runningAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-status-success mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-status-success rounded-full" />
                Running ({runningAgents.length})
              </h3>
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {runningAgents.map(agent => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stopped Agents */}
          {stoppedAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-foreground-secondary rounded-full" />
                Stopped ({stoppedAgents.length})
              </h3>
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {stoppedAgents.map(agent => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error Agents */}
          {errorAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-status-error mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-status-error rounded-full" />
                Errors ({errorAgents.length})
              </h3>
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {errorAgents.map(agent => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {agents.length === 0 && !agentsLoading && (
            <div className="text-center py-12 bg-background-card rounded-lg border border-border">
              <p className="text-foreground-secondary mb-4">No agents found</p>
              <button className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors">
                Create Your First Agent
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Projects Section - Collapsible */}
      <CollapsibleSection
        title={`Projects (${projects.length})`}
        isExpanded={expandedSections.projects}
        onToggle={() => toggleSection('projects')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.id} className="bg-background-card border border-border rounded-lg p-4 hover:bg-background-card-hover transition-colors">
              <h3 className="font-semibold text-foreground mb-2">{project.name}</h3>
              <p className="text-sm text-foreground-secondary mb-3">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-tertiary">
                  {project.agents?.length || 0} agents
                </span>
                <button className="text-brand hover:text-brand-hover font-medium">
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Advanced Options - Collapsible */}
      <CollapsibleSection
        title="Advanced Options"
        isExpanded={expandedSections.advanced}
        onToggle={() => toggleSection('advanced')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-background-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">System Settings</h3>
            <p className="text-sm text-foreground-secondary mb-3">
              Configure global system preferences
            </p>
            <button className="text-sm text-brand hover:text-brand-hover">
              Open Settings
            </button>
          </div>
          
          <div className="bg-background-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Resource Monitor</h3>
            <p className="text-sm text-foreground-secondary mb-3">
              View system resource usage and performance
            </p>
            <button className="text-sm text-brand hover:text-brand-hover">
              View Monitor
            </button>
          </div>
          
          <div className="bg-background-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Logs & Debugging</h3>
            <p className="text-sm text-foreground-secondary mb-3">
              Access system logs and debugging tools
            </p>
            <button className="text-sm text-brand hover:text-brand-hover">
              View Logs
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};