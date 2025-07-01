import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Table, Grid, Plus, Search, Filter, Folder, Clock, Users, Server } from 'lucide-react';
import { Project, ProjectStatus } from '@magents/shared';
import { apiService } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-toastify';

interface ProjectDashboardProps {
  className?: string;
}

interface ViewMode {
  mode: 'table' | 'cards';
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ className }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode['mode']>('table');
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // seconds
  const { subscribe, unsubscribe, isConnected, socket } = useWebSocket();

  // Fetch projects data
  const { data: fetchedProjects, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (fetchedProjects) {
      setProjects(fetchedProjects);
    }
  }, [fetchedProjects]);

  // Subscribe to project events on mount and handle real-time updates
  useEffect(() => {
    subscribe('projects');

    // Handle WebSocket project events
    const handleProjectEvent = (message: any) => {
      console.log('Received project event:', message);
      
      if (message.data && message.data.projectId) {
        const { projectId, event } = message.data;
        
        setProjects(prevProjects => {
          return prevProjects.map(project => {
            if (project.id === projectId) {
              // Update project status based on event
              let newStatus: ProjectStatus = project.status;
              switch (event) {
                case 'activated':
                  newStatus = 'ACTIVE';
                  break;
                case 'deactivated':
                  newStatus = 'INACTIVE';
                  break;
              }
              
              return { ...project, status: newStatus, updatedAt: new Date() };
            }
            return project;
          });
        });
      }
    };

    const handleProjectCreated = (newProject: Project) => {
      console.log('New project created:', newProject);
      setProjects(prevProjects => {
        // Check if project already exists to avoid duplicates
        const exists = prevProjects.some(project => project.id === newProject.id);
        if (!exists) {
          return [...prevProjects, newProject];
        }
        return prevProjects;
      });
    };

    const handleProjectDeleted = (projectId: string) => {
      console.log('Project deleted:', projectId);
      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
    };

    const handleProjectUpdated = (updatedProject: Project) => {
      console.log('Project updated:', updatedProject);
      setProjects(prevProjects => {
        return prevProjects.map(project => 
          project.id === updatedProject.id ? updatedProject : project
        );
      });
    };

    // Add WebSocket event listeners
    if (socket) {
      socket.on('project:event', handleProjectEvent);
      socket.on('project:created', handleProjectCreated);
      socket.on('project:deleted', handleProjectDeleted);
      socket.on('project:updated', handleProjectUpdated);
    }

    return () => {
      unsubscribe('projects');
      
      // Remove WebSocket event listeners
      if (socket) {
        socket.off('project:event', handleProjectEvent);
        socket.off('project:created', handleProjectCreated);
        socket.off('project:deleted', handleProjectDeleted);
        socket.off('project:updated', handleProjectUpdated);
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

  // Filter projects based on search and status
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    }
  };

  // Project action handlers
  const handleUpdateProjectStatus = async (projectId: string, status: ProjectStatus) => {
    try {
      await apiService.updateProject(projectId, { status });
      toast.success(`Project ${projectId} ${status.toLowerCase()} successfully`);
      // Status will be updated via WebSocket or next refetch
    } catch (error) {
      console.error('Failed to update project status:', error);
      toast.error(`Failed to update project ${projectId}`);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiService.deleteProject(projectId);
      toast.success(`Project ${projectId} deleted successfully`);
      // Remove from local state
      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error(`Failed to delete project ${projectId}`);
    }
  };

  // Calculate project statistics
  const projectStats = React.useMemo(() => {
    const active = projects.filter(p => p.status === 'ACTIVE').length;
    const inactive = projects.filter(p => p.status === 'INACTIVE').length;
    const totalAgents = projects.reduce((sum, p) => sum + p.agents.length, 0);
    
    return { active, inactive, total: projects.length, totalAgents };
  }, [projects]);

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error instanceof Error ? error.message : 'Failed to load projects'}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <p className="text-sm text-gray-700">
              Manage and monitor your development projects
            </p>
            <ProjectSummary stats={projectStats} className="mt-2 sm:mt-0" />
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

          {/* Create Project Button */}
          <button 
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
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
              placeholder="Search projects by name, path, description, or tags..."
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {isLoading && projects.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Folder className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new project.
            </p>
            <div className="mt-6">
              <button 
                onClick={() => navigate('/projects/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </button>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No matching projects</h3>
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
            projects={filteredProjects} 
            formatDate={formatDate}
            onUpdateStatus={handleUpdateProjectStatus}
            onDelete={handleDeleteProject}
            navigate={navigate}
          />
        ) : (
          <CardView 
            projects={filteredProjects} 
            formatDate={formatDate}
            onUpdateStatus={handleUpdateProjectStatus}
            onDelete={handleDeleteProject}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
};

interface ProjectSummaryProps {
  stats: {
    active: number;
    inactive: number;
    total: number;
    totalAgents: number;
  };
  className?: string;
}

const ProjectSummary: React.FC<ProjectSummaryProps> = ({ stats, className }) => (
  <div className={`flex items-center space-x-4 text-sm text-gray-500 ${className}`}>
    <div className="flex items-center space-x-1">
      <Server className="h-4 w-4" />
      <span>{stats.total} projects</span>
    </div>
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span>{stats.active} active</span>
    </div>
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full" />
      <span>{stats.inactive} inactive</span>
    </div>
    <div className="flex items-center space-x-1">
      <Users className="h-4 w-4" />
      <span>{stats.totalAgents} agents</span>
    </div>
  </div>
);

interface ProjectViewProps {
  projects: Project[];
  formatDate: (date: Date | string) => string;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => void;
  onDelete: (projectId: string) => void;
  navigate: (path: string) => void;
}

const TableView: React.FC<ProjectViewProps> = ({ projects, formatDate, onUpdateStatus, onDelete, navigate }) => (
  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
    <table className="min-w-full divide-y divide-gray-300">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Project Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Path
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Agents
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created
          </th>
          <th className="relative px-6 py-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {projects.map((project) => (
          <tr key={project.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <button
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
              >
                {project.name}
              </button>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{project.path}</code>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                project.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{project.agents.length}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatDate(project.createdAt)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <ProjectActions
                project={project}
                onUpdateStatus={onUpdateStatus}
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

const CardView: React.FC<ProjectViewProps> = ({ projects, formatDate, onUpdateStatus, onDelete, navigate }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {projects.map((project) => (
      <div key={project.id} className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              <button
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
              >
                {project.name}
              </button>
            </h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              project.status === 'ACTIVE' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {project.status}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Path</dt>
              <dd className="text-sm text-gray-900">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{project.path}</code>
              </dd>
            </div>
            {project.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{project.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Agents</dt>
              <dd className="text-sm text-gray-900 flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{project.agents.length}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900 flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDate(project.createdAt)}</span>
              </dd>
            </div>
            {project.tags && project.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.tags.map((tag, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </div>
          <div className="mt-6">
            <ProjectActions
              project={project}
              onUpdateStatus={onUpdateStatus}
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

interface ProjectActionsProps {
  project: Project;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => void;
  onDelete: (projectId: string) => void;
  variant: 'dropdown' | 'inline';
  size: 'sm' | 'md';
}

const ProjectActions: React.FC<ProjectActionsProps> = ({ project, onUpdateStatus, onDelete, variant, size }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const handleStatusToggle = () => {
    const newStatus: ProjectStatus = project.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    onUpdateStatus(project.id, newStatus);
  };

  const handleDelete = () => {
    if (showConfirmDelete) {
      onDelete(project.id);
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex space-x-2">
        <button
          onClick={handleStatusToggle}
          className={`px-3 py-1 text-xs font-medium rounded ${
            project.status === 'ACTIVE'
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          {project.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={handleDelete}
          className={`px-3 py-1 text-xs font-medium rounded ${
            showConfirmDelete
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {showConfirmDelete ? 'Confirm Delete' : 'Delete'}
        </button>
      </div>
    );
  }

  // Dropdown variant (simplified for now)
  return (
    <div className="flex space-x-2">
      <button
        onClick={handleStatusToggle}
        className="text-blue-600 hover:text-blue-900 text-sm"
      >
        {project.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
      </button>
      <button
        onClick={handleDelete}
        className={`text-sm ${
          showConfirmDelete ? 'text-red-900 font-semibold' : 'text-red-600 hover:text-red-900'
        }`}
      >
        {showConfirmDelete ? 'Confirm' : 'Delete'}
      </button>
    </div>
  );
};