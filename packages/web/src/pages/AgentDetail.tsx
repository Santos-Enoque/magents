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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-status-error/20 border border-status-error/30 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-status-error" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-status-error">Error loading agent</h3>
              <div className="mt-2 text-sm text-status-error">
                <p>{error instanceof Error ? error.message : 'Agent not found'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate('/agents')}
                  className="bg-status-error/20 px-3 py-2 rounded-md text-sm font-medium text-status-error hover:bg-status-error/30"
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
    <div className="max-w-7xl mx-auto p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center text-sm text-foreground-tertiary hover:text-foreground-secondary mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Agents
        </button>

        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center">
              {agent.id}
              <StatusIndicator status={agent.status} size="md" className="ml-4" />
            </h1>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              <div className="flex items-center text-sm text-foreground-secondary">
                <GitBranch className="w-4 h-4 mr-1" />
                <code className="bg-background-tertiary px-2 py-1 rounded text-foreground">{agent.branch}</code>
              </div>
              <div className="flex items-center text-sm text-foreground-secondary mt-2 sm:mt-0">
                <Terminal className="w-4 h-4 mr-1" />
                <code className="bg-background-tertiary px-2 py-1 rounded text-foreground">{agent.tmuxSession}</code>
              </div>
              <div className="flex items-center text-sm text-foreground-secondary mt-2 sm:mt-0">
                <Clock className="w-4 h-4 mr-1" />
                <span>Running for {formatDuration(agent.createdAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="ml-6 flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background-card hover:bg-background-card-hover"
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
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-foreground-tertiary hover:text-foreground-secondary hover:border-border-hover'
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
            <div className="bg-background-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Basic Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Agent ID</dt>
                  <dd className="mt-1 text-sm text-foreground">{agent.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Branch</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    <code className="bg-background-tertiary px-2 py-1 rounded text-foreground">{agent.branch}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Status</dt>
                  <dd className="mt-1">
                    <StatusIndicator status={agent.status} variant="full" />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Created</dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDate(agent.createdAt)}</dd>
                </div>
                {agent.updatedAt && (
                  <div>
                    <dt className="text-sm font-medium text-foreground-tertiary">Last Updated</dt>
                    <dd className="mt-1 text-sm text-foreground">{formatDate(agent.updatedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* System Information */}
            <div className="bg-background-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">System Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Tmux Session</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    <code className="bg-background-tertiary px-2 py-1 rounded text-foreground">{agent.tmuxSession}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Worktree Path</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    <code className="bg-background-tertiary px-2 py-1 rounded text-xs break-all text-foreground">{agent.worktreePath}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">WebSocket Connection</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    <span className={`inline-flex items-center ${isConnected ? 'text-status-success' : 'text-status-error'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </dd>
                </div>
                {agent.projectId && (
                  <div>
                    <dt className="text-sm font-medium text-foreground-tertiary">Project ID</dt>
                    <dd className="mt-1 text-sm text-foreground">{agent.projectId}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="bg-background-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Agent Configuration</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-foreground-tertiary">Auto Accept</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {agent.autoAccept ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/20 text-status-success border border-status-success/30">
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground-tertiary/20 text-foreground-tertiary border border-foreground-tertiary/30">
                      Disabled
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-foreground-tertiary">Docker Mode</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {agent.useDocker ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/20 text-brand border border-brand/30">
                      Docker
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground-tertiary/20 text-foreground-tertiary border border-foreground-tertiary/30">
                      Local
                    </span>
                  )}
                </dd>
              </div>
              {agent.config && (
                <div>
                  <dt className="text-sm font-medium text-foreground-tertiary">Additional Configuration</dt>
                  <dd className="mt-1">
                    <pre className="bg-background-secondary rounded p-3 text-xs overflow-x-auto text-foreground border border-border">
                      {JSON.stringify(agent.config, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-background-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-brand pl-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Agent started</p>
                  <p className="text-sm text-foreground-tertiary">{formatDate(agent.createdAt)}</p>
                </div>
                <p className="text-sm text-foreground-secondary mt-1">Agent was created and started successfully</p>
              </div>
              {agent.status === 'RUNNING' && (
                <div className="border-l-4 border-status-success pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Currently running</p>
                    <p className="text-sm text-foreground-tertiary">Active</p>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">Agent is actively processing tasks</p>
                </div>
              )}
              {agent.status === 'STOPPED' && (
                <div className="border-l-4 border-status-warning pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Agent stopped</p>
                    <p className="text-sm text-foreground-tertiary">{agent.updatedAt ? formatDate(agent.updatedAt) : 'Unknown'}</p>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">Agent has been stopped</p>
                </div>
              )}
              {agent.status === 'ERROR' && (
                <div className="border-l-4 border-status-error pl-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Error occurred</p>
                    <p className="text-sm text-foreground-tertiary">{agent.updatedAt ? formatDate(agent.updatedAt) : 'Unknown'}</p>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">Agent encountered an error</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="bg-background-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Live Terminal View</h3>
              <div className="text-sm text-foreground-secondary">
                Real-time view of agent's tmux session
              </div>
            </div>
            
            <TmuxViewer agent={agent} />
            
            <div className="mt-6 p-4 bg-brand/10 border border-brand/30 rounded-lg">
              <h4 className="text-sm font-medium text-brand">Direct Access</h4>
              <p className="text-sm text-brand mt-1">For full terminal control, attach directly:</p>
              <div className="mt-2 bg-background-tertiary rounded p-2 border border-border">
                <code className="text-foreground text-sm">
                  tmux attach-session -t {agent.tmuxSession}
                </code>
              </div>
              <p className="text-sm text-brand mt-2">Or use the magents CLI:</p>
              <div className="mt-2 bg-background-tertiary rounded p-2 border border-border">
                <code className="text-foreground text-sm">
                  magents attach {agent.id}
                </code>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interactive' && (
          <div className="bg-background-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Interactive Terminal</h3>
              <div className="text-sm text-foreground-secondary">
                Direct command interface to agent's tmux session
              </div>
            </div>
            
            <InteractiveTerminal agent={agent} />
            
            <div className="mt-4 p-3 bg-brand/10 border border-brand/30 rounded-lg">
              <h4 className="text-sm font-medium text-brand">Usage Tips</h4>
              <ul className="mt-2 text-sm text-brand space-y-1 list-disc list-inside">
                <li>Type commands and press Enter to execute them in the agent's tmux session</li>
                <li>Switch between tmux windows (main, claude, git) using the dropdown</li>
                <li>Use standard terminal commands: <code className="bg-background-tertiary px-1 rounded text-foreground border border-border">ls</code>, <code className="bg-background-tertiary px-1 rounded text-foreground border border-border">cd</code>, <code className="bg-background-tertiary px-1 rounded text-foreground border border-border">git status</code></li>
                <li>Commands are executed in the agent's working directory</li>
                <li>Use <code className="bg-background-tertiary px-1 rounded text-foreground border border-border">clear</code> to clear the terminal display</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};