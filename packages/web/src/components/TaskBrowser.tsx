import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskMasterTask, Project } from '@magents/shared';
import { apiService } from '../services/api';
import { StatusIndicator } from './StatusIndicator';
import { TaskCreationWizard } from './TaskCreationWizard';
import { ProjectSelector } from './ProjectSelector';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { ChevronRight, Search, Filter, RefreshCw, AlertCircle, Plus } from 'lucide-react';

interface TaskBrowserProps {
  projectPath?: string; // Make optional as we'll use project selector
  onTaskSelect?: (task: TaskMasterTask) => void;
}

interface TaskCardProps {
  task: TaskMasterTask;
  onSelect: (task: TaskMasterTask) => void;
  isSelected: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect, isSelected }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-status-error bg-status-error/20 border-status-error/30';
      case 'medium':
        return 'text-status-warning bg-status-warning/20 border-status-warning/30';
      case 'low':
        return 'text-status-success bg-status-success/20 border-status-success/30';
      default:
        return 'text-foreground-tertiary bg-foreground-tertiary/20 border-foreground-tertiary/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-status-success';
      case 'in-progress':
        return 'text-brand';
      case 'blocked':
        return 'text-status-error';
      case 'cancelled':
        return 'text-foreground-tertiary';
      default:
        return 'text-status-warning';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-background-card-hover ${
        isSelected ? 'border-brand bg-brand/10' : 'border-border hover:border-border-hover'
      } bg-background-card`}
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono text-foreground-tertiary">#{task.id}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
          {task.status}
        </span>
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">{task.title}</h3>
      
      {task.description && (
        <p className="text-sm text-foreground-secondary mb-2">
          {truncateText(task.description, 150)}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-4 text-xs text-foreground-tertiary">
          {task.dependencies && task.dependencies.length > 0 && (
            <span>Deps: {task.dependencies.join(', ')}</span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span>{task.subtasks.length} subtasks</span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
      </div>
    </div>
  );
};

export const TaskBrowser: React.FC<TaskBrowserProps> = ({ projectPath: initialProjectPath, onTaskSelect }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { features, loading: featuresLoading } = useFeatureFlags();
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskMasterTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskMasterTask | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  // Project selection state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    searchParams.get('projectId') || undefined
  );
  
  // Derive effective project path from selected project or initial prop
  const effectiveProjectPath = selectedProject?.path || initialProjectPath;
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all');
  const [dependencyFilter, setDependencyFilter] = useState<string>(searchParams.get('deps') || 'all');
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'status' | 'title'>(
    (searchParams.get('sort') as any) || 'id'
  );
  const [showFilters, setShowFilters] = useState(searchParams.get('filters') === 'true');

  // Update URL params when filters change
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || (key !== 'search' && key !== 'projectId' && value === 'all')) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle project selection
  const handleProjectSelect = useCallback((project: Project | null) => {
    setSelectedProject(project);
    setSelectedProjectId(project?.id);
    
    // Update URL params
    updateUrlParams({ projectId: project?.id || '' });
    
    // Store in localStorage for persistence
    if (project) {
      localStorage.setItem('magents-selected-project', project.id);
    } else {
      localStorage.removeItem('magents-selected-project');
    }
  }, [updateUrlParams]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!effectiveProjectPath) {
      setTasks([]);
      setFilteredTasks([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const tasksData = await apiService.getTaskMasterTasks(effectiveProjectPath);
      setTasks(tasksData);
      setFilteredTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectPath]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Restore selected project from localStorage on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('magents-selected-project');
    if (savedProjectId && !selectedProjectId) {
      setSelectedProjectId(savedProjectId);
      updateUrlParams({ projectId: savedProjectId });
    }
  }, []); // Only run on mount

  // Filter and sort tasks
  useEffect(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.id.toLowerCase().includes(query) ||
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply dependency filter
    if (dependencyFilter !== 'all') {
      filtered = filtered.filter(task => {
        const hasDeps = task.dependencies && task.dependencies.length > 0;
        return dependencyFilter === 'with' ? hasDeps : !hasDeps;
      });
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, statusFilter, priorityFilter, dependencyFilter, sortBy]);

  const handleTaskSelect = (task: TaskMasterTask) => {
    setSelectedTask(task);
    onTaskSelect?.(task);
  };

  const handleTaskCreated = (newTask: TaskMasterTask) => {
    // Add the new task to the list
    setTasks(prev => [...prev, newTask]);
    // Close the wizard
    setShowCreateWizard(false);
    // Select the newly created task
    handleTaskSelect(newTask);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Cmd/Ctrl + F: Toggle filters
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFilters(prev => {
          const newValue = !prev;
          updateUrlParams({ filters: newValue ? 'true' : '' });
          return newValue;
        });
      }

      // Cmd/Ctrl + R: Refresh tasks
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        fetchTasks();
      }

      // Cmd/Ctrl + N: New task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (effectiveProjectPath) {
          setShowCreateWizard(true);
        }
      }

      // Number keys 1-5: Quick status filters
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            setStatusFilter('all');
            updateUrlParams({ status: 'all' });
            break;
          case '2':
            setStatusFilter('pending');
            updateUrlParams({ status: 'pending' });
            break;
          case '3':
            setStatusFilter('in-progress');
            updateUrlParams({ status: 'in-progress' });
            break;
          case '4':
            setStatusFilter('done');
            updateUrlParams({ status: 'done' });
            break;
          case '5':
            setStatusFilter('blocked');
            updateUrlParams({ status: 'blocked' });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchTasks, updateUrlParams, effectiveProjectPath]);

  // Check if TaskMaster integration is disabled
  if (!featuresLoading && features && !features.taskMasterIntegration) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b border-border bg-background-card">
          <h2 className="text-lg font-semibold text-foreground">Task Management</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">TaskMaster Integration Disabled</h3>
            <p className="text-foreground-secondary mb-4 max-w-md">
              TaskMaster integration is currently disabled. Enable it in the system settings or use the internal task system.
            </p>
            {features.internalTaskSystem && (
              <p className="text-sm text-foreground-tertiary">
                Internal task system is available as an alternative.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show project selection prompt when no project is selected
  if (!effectiveProjectPath && !loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b border-border bg-background-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-foreground">TaskMaster Tasks</h2>
              {/* Project Selector */}
              <div className="min-w-0 flex-1 max-w-xs">
                <ProjectSelector
                  selectedProjectId={selectedProjectId}
                  onProjectSelect={handleProjectSelect}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* No project selected message */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Project Selected</h3>
            <p className="text-foreground-secondary mb-4 max-w-md">
              Please select a project from the dropdown above to view and manage its TaskMaster tasks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-foreground-tertiary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-status-error mb-4" />
        <p className="text-foreground font-medium mb-2">Failed to load tasks</p>
        <p className="text-sm text-foreground-secondary mb-4">{error}</p>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-foreground">TaskMaster Tasks</h2>
            {/* Project Selector */}
            <div className="min-w-0 flex-1 max-w-xs">
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onProjectSelect={handleProjectSelect}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateWizard(true)}
              disabled={!effectiveProjectPath}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-2 text-sm ${
                effectiveProjectPath 
                  ? 'bg-brand text-white hover:bg-brand-hover' 
                  : 'bg-foreground-tertiary/20 text-foreground-tertiary cursor-not-allowed'
              }`}
              title={effectiveProjectPath ? "Create new task (⌘N)" : "Select a project first"}
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => {
                setShowFilters(!showFilters);
                updateUrlParams({ filters: !showFilters ? 'true' : '' });
              }}
              className={`p-2 rounded-md transition-colors ${
                showFilters ? 'bg-background-tertiary text-foreground' : 'text-foreground-tertiary hover:bg-background-tertiary'
              }`}
              title="Toggle filters (⌘F)"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={fetchTasks}
              className="p-2 text-foreground-tertiary hover:bg-background-tertiary rounded-md transition-colors"
              title="Refresh tasks (⌘R)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Search tasks by ID, title, or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              updateUrlParams({ search: e.target.value });
            }}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background-card text-foreground placeholder-foreground-tertiary"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  updateUrlParams({ status: e.target.value });
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background-card text-foreground"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  updateUrlParams({ priority: e.target.value });
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background-card text-foreground"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Dependencies</label>
              <select
                value={dependencyFilter}
                onChange={(e) => {
                  setDependencyFilter(e.target.value);
                  updateUrlParams({ deps: e.target.value });
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background-card text-foreground"
              >
                <option value="all">All</option>
                <option value="with">With Dependencies</option>
                <option value="without">No Dependencies</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  updateUrlParams({ sort: e.target.value });
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background-card text-foreground"
              >
                <option value="id">ID</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground-secondary">No tasks found</p>
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dependencyFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setDependencyFilter('all');
                  updateUrlParams({ search: '', status: 'all', priority: 'all', deps: 'all' });
                }}
                className="mt-2 text-sm text-brand hover:text-brand-hover"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={handleTaskSelect}
                isSelected={selectedTask?.id === task.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Count and Keyboard Shortcuts */}
      <div className="p-4 border-t border-border bg-background-secondary">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-secondary">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
          <div className="text-xs text-foreground-tertiary">
            <span className="mr-3">⌘K: Search</span>
            <span className="mr-3">⌘F: Filters</span>
            <span className="mr-3">⌘R: Refresh</span>
            <span className="mr-3">⌘N: New Task</span>
            <span>1-5: Status filters</span>
          </div>
        </div>
      </div>

      {/* Task Creation Wizard */}
      {showCreateWizard && effectiveProjectPath && (
        <TaskCreationWizard
          projectPath={effectiveProjectPath}
          onClose={() => setShowCreateWizard(false)}
          onTaskCreated={handleTaskCreated}
          existingTasks={tasks}
        />
      )}
    </div>
  );
};