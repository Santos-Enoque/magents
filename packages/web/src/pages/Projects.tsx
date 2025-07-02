import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FolderIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  ServerIcon,
  CodeBracketIcon,
  ClockIcon,
  CogIcon,
  TrashIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { Project } from '@magents/shared';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (agentCount: number) => {
    if (agentCount > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-status-success/20 text-status-success">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-foreground-tertiary/20 text-foreground-tertiary">
        Idle
      </span>
    );
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <div className="bg-background-card border border-border rounded-lg p-6 hover:bg-background-card-hover transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand/20">
            <FolderIcon className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-foreground-tertiary">
              Web Application
            </p>
          </div>
        </div>
        {getStatusBadge(project.agents?.length || 0)}
      </div>

      <p className="text-sm text-foreground-secondary mb-4 line-clamp-2">
        {project.description || 'No description available'}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4 text-foreground-tertiary" />
          <span className="text-sm text-foreground-secondary">
            {project.agents?.length || 0} agents
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="h-4 w-4 text-foreground-tertiary" />
          <span className="text-sm text-foreground-secondary">
            8 branches
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <ClockIcon className="h-3 w-3" />
          <span>Last: {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}`);
            }}
            className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded transition-colors"
          >
            <CogIcon className="h-4 w-4" />
          </button>
          <button 
            className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle delete
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const ProjectListItem = ({ project }: { project: Project }) => (
    <div className="bg-background-card border border-border rounded-lg p-4 hover:bg-background-card-hover transition-all cursor-pointer group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 rounded-lg bg-brand/20">
            <FolderIcon className="h-5 w-5 text-brand" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-foreground-tertiary">
              {project.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground-secondary">
            <div className="flex items-center gap-2">
              <ServerIcon className="h-4 w-4 text-foreground-tertiary" />
              <span>{project.agents?.length || 0} agents</span>
            </div>
            <div className="flex items-center gap-2">
              <CodeBracketIcon className="h-4 w-4 text-foreground-tertiary" />
              <span>5 branches</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-foreground-tertiary" />
              <span>{new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {getStatusBadge(project.agents?.length || 0)}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/projects/${project.id}`);
              }}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded transition-colors"
            >
              <CogIcon className="h-4 w-4" />
            </button>
            <button 
              className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-foreground-secondary mt-1">
            Manage your development projects and workspaces
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-foreground-tertiary" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center bg-background-tertiary rounded-lg border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-background-card text-foreground' 
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-background-card text-foreground' 
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-background-card border border-border rounded-lg">
          <FolderIcon className="h-12 w-12 text-foreground-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-foreground-secondary text-center max-w-md mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Create your first project to get started with multi-agent development'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/projects/new')}
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create New Project
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};