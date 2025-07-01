import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Terminal, GitBranch, Clock, Server, AlertCircle, Info, Settings, Activity, RefreshCw } from 'lucide-react';
import { Agent, AgentStatus } from '@magents/shared';
import { apiService } from '../services/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { AgentActions } from '../components/AgentActions';
import { TmuxViewer } from '../components/TmuxViewer';
import { InteractiveTerminal } from '../components/InteractiveTerminal';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-toastify';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
  { id: 'configuration', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  { id: 'terminal', label: 'Terminal View', icon: <Terminal className="w-4 h-4" /> },
  { id: 'interactive', label: 'Interactive', icon: <Terminal className="w-4 h-4" /> },
];

export const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  // Fetch agent data
  const { data: agent, isLoading, error, refetch } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => apiService.getAgent(id!),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to agent-specific events
  useEffect(() => {
    if (id) {
      subscribe(`agent:${id}`);
    }

    return () => {
      if (id) {
        unsubscribe(`agent:${id}`);
      }
    };
  }, [id, subscribe, unsubscribe]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const formatDuration = (createdAt: Date | string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Agent action handlers
  const handleStartAgent = async (agentId: string) => {
    try {
      await apiService.updateAgentStatus(agentId, 'RUNNING');
      toast.success('Agent started successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to start agent');
      console.error('Failed to start agent:', error);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      await apiService.updateAgentStatus(agentId, 'STOPPED');
      toast.success('Agent stopped successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to stop agent');
      console.error('Failed to stop agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string, removeWorktree: boolean = false) => {
    try {
      await apiService.deleteAgent(agentId, removeWorktree);
      toast.success('Agent deleted successfully');
      navigate('/agents');
    } catch (error) {
      toast.error('Failed to delete agent');
      console.error('Failed to delete agent:', error);
    }
  };

  const handleRestartAgent = async (agentId: string) => {
    try {
      await handleStopAgent(agentId);
      setTimeout(() => handleStartAgent(agentId), 1000);
    } catch (error) {
      toast.error('Failed to restart agent');
      console.error('Failed to restart agent:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading agent</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error instanceof Error ? error.message : 'Agent not found'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate('/agents')}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Back to agents
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Agents
        </button>

        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              {agent.id}
              <StatusIndicator status={agent.status} size="md" className="ml-4" />
            </h1>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              <div className="flex items-center text-sm text-gray-500">
                <GitBranch className="w-4 h-4 mr-1" />
                <code className="bg-gray-100 px-2 py-1 rounded">{agent.branch}</code>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-2 sm:mt-0">
                <Terminal className="w-4 h-4 mr-1" />
                <code className="bg-gray-100 px-2 py-1 rounded">{agent.tmuxSession}</code>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-2 sm:mt-0">
                <Clock className="w-4 h-4 mr-1" />
                <span>Running for {formatDuration(agent.createdAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="ml-6 flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <AgentActions
              agent={agent}
              onStart={handleStartAgent}
              onStop={handleStopAgent}
              onRestart={handleRestartAgent}
              onDelete={handleDeleteAgent}
              variant="inline"
              size="md"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Agent ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{agent.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Branch</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <code className="bg-gray-100 px-2 py-1 rounded">{agent.branch}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <StatusIndicator status={agent.status} variant="full" />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(agent.createdAt)}</dd>
                </div>
                {agent.updatedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(agent.updatedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* System Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tmux Session</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <code className="bg-gray-100 px-2 py-1 rounded">{agent.tmuxSession}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Worktree Path</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{agent.worktreePath}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">WebSocket Connection</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </dd>
                </div>
                {agent.projectId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Project ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{agent.projectId}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Configuration</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Auto Accept</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {agent.autoAccept ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Disabled
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Docker Mode</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {agent.useDocker ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Docker
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Local
                    </span>
                  )}
                </dd>
              </div>
              {agent.config && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Additional Configuration</dt>
                  <dd className="mt-1">
                    <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">
                      {JSON.stringify(agent.config, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-400 pl-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">Agent started</p>
                  <p className="text-sm text-gray-500">{formatDate(agent.createdAt)}</p>
                </div>
                <p className="text-sm text-gray-500 mt-1">Agent was created and started successfully</p>
              </div>
              {agent.status === 'RUNNING' && (
                <div className="border-l-4 border-green-400 pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Currently running</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Agent is actively processing tasks</p>
                </div>
              )}
              {agent.status === 'STOPPED' && (
                <div className="border-l-4 border-yellow-400 pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Agent stopped</p>
                    <p className="text-sm text-gray-500">{agent.updatedAt ? formatDate(agent.updatedAt) : 'Unknown'}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Agent has been stopped</p>
                </div>
              )}
              {agent.status === 'ERROR' && (
                <div className="border-l-4 border-red-400 pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Error occurred</p>
                    <p className="text-sm text-gray-500">{agent.updatedAt ? formatDate(agent.updatedAt) : 'Unknown'}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Agent encountered an error</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Live Terminal View</h3>
              <div className="text-sm text-gray-500">
                Real-time view of agent's tmux session
              </div>
            </div>
            
            <TmuxViewer agent={agent} />
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900">Direct Access</h4>
              <p className="text-sm text-blue-800 mt-1">For full terminal control, attach directly:</p>
              <div className="mt-2 bg-blue-100 rounded p-2">
                <code className="text-blue-900 text-sm">
                  tmux attach-session -t {agent.tmuxSession}
                </code>
              </div>
              <p className="text-sm text-blue-800 mt-2">Or use the magents CLI:</p>
              <div className="mt-2 bg-blue-100 rounded p-2">
                <code className="text-blue-900 text-sm">
                  magents attach {agent.id}
                </code>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interactive' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Interactive Terminal</h3>
              <div className="text-sm text-gray-500">
                Direct command interface to agent's tmux session
              </div>
            </div>
            
            <InteractiveTerminal agent={agent} />
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900">Usage Tips</h4>
              <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Type commands and press Enter to execute them in the agent's tmux session</li>
                <li>Switch between tmux windows (main, claude, git) using the dropdown</li>
                <li>Use standard terminal commands: <code className="bg-blue-100 px-1 rounded">ls</code>, <code className="bg-blue-100 px-1 rounded">cd</code>, <code className="bg-blue-100 px-1 rounded">git status</code></li>
                <li>Commands are executed in the agent's working directory</li>
                <li>Use <code className="bg-blue-100 px-1 rounded">clear</code> to clear the terminal display</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};