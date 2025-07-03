import React, { useState, useEffect } from 'react';
import { Project } from '@magents/shared';
import { apiService } from '../services/api';
import { ChevronDown, Folder, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (project: Project | null) => void;
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectSelect,
  className = "",
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  // Fetch projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await apiService.getProjects();
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.id && project.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProjectSelect = (project: Project) => {
    onProjectSelect(project);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    onProjectSelect(null);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-background-card hover:bg-background-card-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
        disabled={loading}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Folder className="w-4 h-4 text-foreground-tertiary flex-shrink-0" />
          {loading ? (
            <span className="text-foreground-secondary">Loading projects...</span>
          ) : selectedProject ? (
            <div className="min-w-0">
              <span className="text-foreground font-medium truncate block">
                {selectedProject.name}
              </span>
              <span className="text-xs text-foreground-tertiary truncate block">
                {selectedProject.path}
              </span>
            </div>
          ) : (
            <span className="text-foreground-secondary">Select a project...</span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-foreground-tertiary flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-border rounded-md shadow-lg z-20 max-h-80 overflow-hidden">
            
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-background text-foreground placeholder-foreground-tertiary text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="p-4 text-center">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-foreground-tertiary" />
                <p className="text-sm text-foreground-secondary">Loading projects...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 text-center">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 text-status-error" />
                <p className="text-sm text-status-error mb-2">{error}</p>
                <button
                  onClick={loadProjects}
                  className="text-sm text-brand hover:text-brand-hover"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Projects list */}
            {!loading && !error && (
              <div className="overflow-y-auto max-h-60">
                {/* Clear selection option */}
                {selectedProject && (
                  <button
                    onClick={handleClearSelection}
                    className="w-full px-4 py-3 text-left hover:bg-background-tertiary border-b border-border"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4" /> {/* Spacer for alignment */}
                      <span className="text-foreground-secondary italic">Clear selection</span>
                    </div>
                  </button>
                )}

                {filteredProjects.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-foreground-secondary">
                      {searchQuery ? 'No projects match your search' : 'No projects found'}
                    </p>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full px-4 py-3 text-left hover:bg-background-tertiary transition-colors ${
                        selectedProject?.id === project.id ? 'bg-brand/10 border-r-2 border-brand' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Folder className="w-4 h-4 text-foreground-tertiary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {project.name}
                          </div>
                          <div className="text-xs text-foreground-tertiary truncate">
                            {project.path}
                          </div>
                          {project.status && (
                            <div className="text-xs text-foreground-secondary mt-1">
                              Status: {project.status}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-2 border-t border-border bg-background-secondary">
              <p className="text-xs text-foreground-tertiary text-center">
                {filteredProjects.length} of {projects.length} projects
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};