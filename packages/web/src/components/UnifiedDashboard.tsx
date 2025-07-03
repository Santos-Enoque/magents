import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent as SharedAgent, Project as SharedProject } from '@magents/shared';
import { apiService } from '../services/api';
import { mockApiService } from '../services/mockApi';
import { useDemoMode } from './DemoModeProvider';
import { AgentCard } from './AgentCard';
import { QuickActions } from './QuickActions';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusOverview } from './StatusOverview';
import { InlineTerminal } from './InlineTerminal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { CommandPalette } from './CommandPalette';
import { useRealTime } from './RealTimeProvider';
import { useKeyboardShortcuts, createCommonShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

// Create local interfaces that are compatible with the dashboard components
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

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  agents?: Agent[] | string[];
}

export const UnifiedDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    agents: true,
    projects: false,
    advanced: false,
  });
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Demo mode detection
  const { isDemoMode } = useDemoMode();
  
  // Select appropriate API service
  const currentApiService = isDemoMode ? mockApiService : apiService;

  // Real-time updates via WebSocket or SSE
  const { isConnected, connectionType, lastUpdate, setRefreshCallback } = useRealTime();

  // Helper function to transform shared types to local types
  const transformAgent = (agent: SharedAgent): Agent => ({
    ...agent,
    lastActivity: agent.updatedAt || agent.createdAt,
    cpuUsage: Math.random() * 100, // Mock data - replace with real data
    memoryUsage: Math.random() * 100, // Mock data - replace with real data
  });

  const transformProject = (project: SharedProject): Project => ({
    ...project,
  });

  // Data queries
  const { data: sharedAgents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agents', isDemoMode ? 'demo' : 'real'],
    queryFn: () => currentApiService.getAgents(),
    refetchInterval: isDemoMode ? 10000 : 5000, // Slower refresh in demo mode
  });

  const { data: sharedProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', isDemoMode ? 'demo' : 'real'],
    queryFn: () => currentApiService.getProjects(),
  });

  // Transform the data
  const agents = sharedAgents.map(transformAgent);
  const projects = sharedProjects.map(transformProject);

  // Set up real-time updates callback
  useEffect(() => {
    setRefreshCallback(refetchAgents);
  }, [refetchAgents, setRefreshCallback]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING');
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED');
  const errorAgents = agents.filter(agent => agent.status === 'ERROR');

  // Keyboard shortcuts
  const handleCreateAgent = () => {
    window.open('/agents/new', '_blank');
  };

  const handleOpenTerminal = () => {
    window.dispatchEvent(new CustomEvent('open-terminal', { 
      detail: { agentId: undefined } 
    }));
  };

  const handleStartAllAgents = () => {
    stoppedAgents.forEach(agent => {
      window.dispatchEvent(new CustomEvent('start-agent', { 
        detail: { agentId: agent.id } 
      }));
    });
  };

  const handleStopAllAgents = () => {
    runningAgents.forEach(agent => {
      window.dispatchEvent(new CustomEvent('stop-agent', { 
        detail: { agentId: agent.id } 
      }));
    });
  };

  const shortcuts = createCommonShortcuts({
    createAgent: handleCreateAgent,
    openTerminal: handleOpenTerminal,
    refreshData: refetchAgents,
    toggleViewMode: () => setViewMode(prev => prev === 'grid' ? 'list' : 'grid'),
    showHelp: () => setShowShortcutsModal(true),
    closeModal: () => {
      setShowShortcutsModal(false);
      setShowCommandPalette(false);
    },
    startAllAgents: handleStartAllAgents,
    stopAllAgents: handleStopAllAgents,
    openCommandPalette: () => setShowCommandPalette(true),
  });

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Development Dashboard</h1>
            {isDemoMode && (
              <span className="px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-foreground-secondary mt-1">
            {isDemoMode 
              ? 'Explore the dashboard with sample data'
              : 'Manage your multi-agent development workflow'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            <span className="text-sm text-foreground-secondary">
              {isConnected ? `Connected (${connectionType.toUpperCase()})` : 'Disconnected'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-foreground-tertiary">
                • Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
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
              title="Grid view (Ctrl+V)"
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
              title="List view (Ctrl+V)"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
            title="Keyboard shortcuts (Ctrl+?)"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>
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
        agents={agents}
        onRefresh={refetchAgents}
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
                    onRefresh={refetchAgents}
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
                    onRefresh={refetchAgents}
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
                    onRefresh={refetchAgents}
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

      {/* Inline Terminal */}
      <InlineTerminal />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={shortcuts}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onCommandExecuted={(result) => {
          console.log('Command executed:', result);
          if (result.success) {
            refetchAgents(); // Refresh data on successful command
          }
        }}
      />
    </div>
  );
};