import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ServerIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  PlayIcon,
  StopIcon,
  CodeBracketIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { Agent } from '@magents/shared';

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'RUNNING' | 'STOPPED' | 'ERROR'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  
  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchTerm === '' || 
      agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.projectId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesProject = projectFilter === 'all' || agent.projectId === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <div className="h-2 w-2 bg-status-success rounded-full animate-pulse" />;
      case 'STOPPED':
        return <div className="h-2 w-2 bg-foreground-tertiary rounded-full" />;
      case 'ERROR':
        return <div className="h-2 w-2 bg-status-error rounded-full" />;
      default:
        return <div className="h-2 w-2 bg-foreground-tertiary rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      RUNNING: 'bg-status-success/20 text-status-success',
      STOPPED: 'bg-foreground-tertiary/20 text-foreground-tertiary',
      ERROR: 'bg-status-error/20 text-status-error',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.STOPPED}`}>
        {status}
      </span>
    );
  };

  const AgentCard = ({ agent }: { agent: Agent }) => {
    const project = projects.find(p => p.id === agent.projectId);
    
    return (
      <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              agent.status === 'RUNNING' ? 'bg-status-success/20' : 
              agent.status === 'ERROR' ? 'bg-status-error/20' : 'bg-foreground-tertiary/20'
            }`}>
              <ServerIcon className={`h-5 w-5 ${
                agent.status === 'RUNNING' ? 'text-status-success' : 
                agent.status === 'ERROR' ? 'text-status-error' : 'text-foreground-tertiary'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{agent.id}</h3>
              <p className="text-sm text-foreground-tertiary">{project?.name || agent.projectId}</p>
            </div>
          </div>
          {getStatusBadge(agent.status)}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <CodeBracketIcon className="h-4 w-4 text-foreground-tertiary" />
            <span className="text-foreground-secondary">{agent.branch}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-tertiary">Ports:</span>
            <span className="text-foreground-secondary font-mono text-xs">
              3000, 3001
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-tertiary">Environment:</span>
            <span className="text-foreground-secondary">docker</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
            <ClockIcon className="h-3 w-3" />
            <span>Last: {agent.createdAt ? new Date(agent.createdAt).toLocaleTimeString() : 'Never'}</span>
          </div>
          <div className="flex items-center gap-1">
            {agent.status === 'RUNNING' ? (
              <button 
                className="p-1.5 text-status-error hover:bg-status-error/10 rounded transition-colors"
                title="Stop Agent"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            ) : (
              <button 
                className="p-1.5 text-status-success hover:bg-status-success/10 rounded transition-colors"
                title="Start Agent"
              >
                <PlayIcon className="h-4 w-4" />
              </button>
            )}
            <button 
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded transition-colors"
              title="View Details"
              onClick={() => navigate(`/agents/${agent.id}`)}
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <ArrowPathIcon className="h-8 w-8 text-foreground-tertiary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-foreground-secondary mt-1">
            Manage your development agents
          </p>
        </div>
        <button
          onClick={() => navigate('/agents/create')}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Create Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-secondary">Running</p>
              <p className="text-2xl font-bold text-status-success">
                {agents.filter(a => a.status === 'RUNNING').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-status-success/20">
              <PlayIcon className="h-5 w-5 text-status-success" />
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-secondary">Stopped</p>
              <p className="text-2xl font-bold text-foreground">
                {agents.filter(a => a.status === 'STOPPED').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-foreground-tertiary/20">
              <StopIcon className="h-5 w-5 text-foreground-tertiary" />
            </div>
          </div>
        </div>
        <div className="bg-background-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-secondary">Errors</p>
              <p className="text-2xl font-bold text-status-error">
                {agents.filter(a => a.status === 'ERROR').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-status-error/20">
              <ExclamationTriangleIcon className="h-5 w-5 text-status-error" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search agents, branches, or tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-foreground-tertiary" />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand"
          >
            <option value="all">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="STOPPED">Stopped</option>
            <option value="ERROR">Error</option>
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-background-card border border-border rounded-lg">
          <ServerIcon className="h-12 w-12 text-foreground-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm || statusFilter !== 'all' || projectFilter !== 'all' ? 'No agents found' : 'No agents yet'}
          </h3>
          <p className="text-foreground-secondary text-center max-w-md mb-6">
            {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'Try adjusting your filters' 
              : 'Create your first agent to start developing'}
          </p>
          {!searchTerm && statusFilter === 'all' && projectFilter === 'all' && (
            <button
              onClick={() => navigate('/agents/create')}
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create Agent
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};