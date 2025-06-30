import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Table, Grid, Plus, Search, Filter } from 'lucide-react';
import { Agent, AgentStatus } from '@magents/shared';
import { apiService } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { StatusIndicator, StatusSummary } from './StatusIndicator';
import { AgentActions } from './AgentActions';

interface AgentDashboardProps {
  className?: string;
}

interface ViewMode {
  mode: 'table' | 'cards';
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ className }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode['mode']>('table');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // seconds
  const { subscribe, unsubscribe, isConnected, socket } = useWebSocket();

  // Fetch agents data
  const { data: fetchedAgents, isLoading, error, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (fetchedAgents) {
      setAgents(fetchedAgents);
    }
  }, [fetchedAgents]);

  // Subscribe to agent events on mount and handle real-time updates
  useEffect(() => {
    subscribe('agents');

    // Handle WebSocket agent events
    const handleAgentEvent = (message: any) => {
      console.log('Received agent event:', message);
      
      if (message.data && message.data.agentId) {
        const { agentId, event } = message.data;
        
        setAgents(prevAgents => {
          return prevAgents.map(agent => {
            if (agent.id === agentId) {
              // Update agent status based on event
              let newStatus: AgentStatus = agent.status;
              switch (event) {
                case 'created':
                case 'started':
                  newStatus = 'RUNNING';
                  break;
                case 'stopped':
                  newStatus = 'STOPPED';
                  break;
                case 'error':
                  newStatus = 'ERROR';
                  break;
              }
              
              return { ...agent, status: newStatus };
            }
            return agent;
          });
        });
      }
    };

    const handleAgentCreated = (newAgent: Agent) => {
      console.log('New agent created:', newAgent);
      setAgents(prevAgents => {
        // Check if agent already exists to avoid duplicates
        const exists = prevAgents.some(agent => agent.id === newAgent.id);
        if (!exists) {
          return [...prevAgents, newAgent];
        }
        return prevAgents;
      });
    };

    const handleAgentDeleted = (agentId: string) => {
      console.log('Agent deleted:', agentId);
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
    };

    // Add WebSocket event listeners
    if (socket) {
      socket.on('agent:event', handleAgentEvent);
      socket.on('agent:created', handleAgentCreated);
      socket.on('agent:deleted', handleAgentDeleted);
    }

    return () => {
      unsubscribe('agents');
      
      // Remove WebSocket event listeners
      if (socket) {
        socket.off('agent:event', handleAgentEvent);
        socket.off('agent:created', handleAgentCreated);
        socket.off('agent:deleted', handleAgentDeleted);
      }
    };
  }, [subscribe, unsubscribe, socket]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefreshEnabled && autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        refetch();
      }, autoRefreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, autoRefreshInterval, refetch]);

  // Filter agents based on search and status
  const filteredAgents = React.useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = searchTerm === '' || 
        agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.tmuxSession.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchTerm, statusFilter]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const handleRefresh = () => {
    refetch();
  };

  // Agent action handlers
  const handleStartAgent = async (agentId: string) => {
    try {
      await apiService.updateAgentStatus(agentId, 'RUNNING');
      // Status will be updated via WebSocket
    } catch (error) {
      console.error('Failed to start agent:', error);
      // TODO: Show error toast
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      await apiService.updateAgentStatus(agentId, 'STOPPED');
      // Status will be updated via WebSocket
    } catch (error) {
      console.error('Failed to stop agent:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteAgent = async (agentId: string, removeWorktree: boolean = false) => {
    try {
      await apiService.deleteAgent(agentId, removeWorktree);
      // Remove from local state
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
    } catch (error) {
      console.error('Failed to delete agent:', error);
      // TODO: Show error toast
    }
  };

  const handleRestartAgent = async (agentId: string) => {
    try {
      await handleStopAgent(agentId);
      // Small delay before starting
      setTimeout(() => handleStartAgent(agentId), 1000);
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading agents</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error instanceof Error ? error.message : 'Failed to load agents'}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="sm:flex sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <p className="text-sm text-gray-700">
              Monitor and manage your Claude Code agents in real-time
            </p>
            <StatusSummary agents={agents} className="mt-2 sm:mt-0" />
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Table className="w-4 h-4 mr-1.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Grid className="w-4 h-4 mr-1.5" />
              Cards
            </button>
          </div>

          {/* Auto-refresh Toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-500">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              disabled={!autoRefreshEnabled}
              className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center bg-white px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 max-w-lg">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search agents by ID, branch, or session..."
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AgentStatus | 'all')}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="STOPPED">Stopped</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {isLoading && agents.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No agents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new agent.
            </p>
            <div className="mt-6">
              <button 
                onClick={() => navigate('/agents/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </button>
            </div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No matching agents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <TableView 
            agents={filteredAgents} 
            formatDate={formatDate}
            onStart={handleStartAgent}
            onStop={handleStopAgent}
            onRestart={handleRestartAgent}
            onDelete={handleDeleteAgent}
          />
        ) : (
          <CardView 
            agents={filteredAgents} 
            formatDate={formatDate}
            onStart={handleStartAgent}
            onStop={handleStopAgent}
            onRestart={handleRestartAgent}
            onDelete={handleDeleteAgent}
          />
        )}
      </div>
    </div>
  );
};

interface AgentViewProps {
  agents: Agent[];
  formatDate: (date: Date | string) => string;
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
  onRestart: (agentId: string) => void;
  onDelete: (agentId: string, removeWorktree?: boolean) => void;
}

const TableView: React.FC<AgentViewProps> = ({ agents, formatDate, onStart, onStop, onRestart, onDelete }) => (
  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
    <table className="min-w-full divide-y divide-gray-300">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Agent ID
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Branch
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Tmux Session
          </th>
          <th className="relative px-6 py-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {agents.map((agent) => (
          <tr key={agent.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {agent.id}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{agent.branch}</code>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <StatusIndicator status={agent.status} size="sm" />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatDate(agent.createdAt)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{agent.tmuxSession}</code>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <AgentActions
                agent={agent}
                onStart={onStart}
                onStop={onStop}
                onRestart={onRestart}
                onDelete={onDelete}
                variant="dropdown"
                size="sm"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CardView: React.FC<AgentViewProps> = ({ agents, formatDate, onStart, onStop, onRestart, onDelete }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {agents.map((agent) => (
      <div key={agent.id} className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 truncate">{agent.id}</h3>
            <StatusIndicator status={agent.status} size="sm" />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Branch</dt>
              <dd className="text-sm text-gray-900">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{agent.branch}</code>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tmux Session</dt>
              <dd className="text-sm text-gray-900">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{agent.tmuxSession}</code>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDate(agent.createdAt)}</dd>
            </div>
          </div>
          <div className="mt-6">
            <AgentActions
              agent={agent}
              onStart={onStart}
              onStop={onStop}
              onRestart={onRestart}
              onDelete={onDelete}
              variant="inline"
              size="sm"
            />
          </div>
        </div>
      </div>
    ))}
  </div>
);