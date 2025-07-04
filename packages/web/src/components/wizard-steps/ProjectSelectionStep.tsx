import React, { useState, useRef } from 'react';
import { Folder, FolderOpen, Search, Plus, FolderSearch } from 'lucide-react';
import { Project } from '@magents/shared';
import { WizardFormData } from '../AgentCreationWizard';
import { toast } from 'react-toastify';

interface ProjectSelectionStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  projects: Project[];
}

interface PathValidation {
  isGitRepo: boolean;
  hasTaskMaster: boolean;
  gitBranch?: string;
  taskCount?: number;
  error?: string;
}

export const ProjectSelectionStep: React.FC<ProjectSelectionStepProps> = ({
  formData,
  updateFormData,
  projects
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomPath, setShowCustomPath] = useState(false);
  const [pathValidation, setPathValidation] = useState<PathValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectSelect = (project: Project) => {
    updateFormData({
      projectId: project.id,
      projectPath: project.path
    });
  };

  const handleCustomPathChange = async (path: string) => {
    updateFormData({
      projectId: undefined,
      projectPath: path
    });
    
    // Validate the path if it's not empty
    if (path && path.trim().length > 0) {
      await validateProjectPath(path);
    } else {
      setPathValidation(null);
    }
  };
  
  const validateProjectPath = async (path: string) => {
    setIsValidating(true);
    try {
      const response = await fetch(`/api/projects/validate?path=${encodeURIComponent(path)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const validation = result.data;
          const gitInfo = validation.gitInfo;
          
          setPathValidation({
            isGitRepo: gitInfo?.isValid || false,
            hasTaskMaster: gitInfo?.hasTaskMaster || false,
            gitBranch: gitInfo?.currentBranch,
            taskCount: 0, // We'll implement task counting separately if needed
            error: validation.errors?.length > 0 ? validation.errors[0] : undefined
          });
        } else {
          setPathValidation({
            isGitRepo: false,
            hasTaskMaster: false,
            error: result.error || 'Unable to validate path'
          });
        }
      } else {
        setPathValidation({
          isGitRepo: false,
          hasTaskMaster: false,
          error: 'Unable to validate path'
        });
      }
    } catch (error) {
      console.error('Path validation error:', error);
      setPathValidation({
        isGitRepo: false,
        hasTaskMaster: false,
        error: 'Failed to connect to server'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBrowseDirectory = () => {
    // Note: This will open a file dialog, but we'll extract the directory path
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if ('webkitRelativePath' in file && file.webkitRelativePath) {
        // Extract directory from the path
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop(); // Remove filename
        const dirPath = pathParts.join('/');
        
        // Try to construct the full system path
        // In web browsers, we can't get the full system path due to security restrictions
        // We'll try to construct a reasonable absolute path
        let fullPath = dirPath;
        
        // If the path doesn't start with '/', try to make it absolute
        if (!dirPath.startsWith('/')) {
          // For web context, we'll use a common project directory structure
          const homeDir = '/Users';
          fullPath = `${homeDir}/${dirPath}`;
        } else if (dirPath.startsWith('/') && !dirPath.includes('/Users') && !dirPath.includes('/home')) {
          // If it's a relative path starting with '/', prepend home directory
          const homeDir = '/Users';
          fullPath = `${homeDir}${dirPath}`;
        }
        
        handleCustomPathChange(fullPath);
      } else {
        // For single file selection without webkitRelativePath,
        // we can't determine the directory path in the browser
        // Reset file input and do nothing - user should manually enter path
        event.target.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary w-4 h-4" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand text-foreground placeholder-foreground-tertiary"
        />
      </div>

      {/* Project Selection Options */}
      <div className="grid grid-cols-1 gap-4">
        {/* Existing Projects */}
        {filteredProjects.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground-secondary mb-3">Existing Projects</h3>
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={`w-full p-4 border rounded-lg text-left transition-all hover:border-brand hover:bg-brand/10 ${
                    formData.projectId === project.id 
                      ? 'border-brand bg-brand/20' 
                      : 'border-border bg-background-secondary'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Folder className="w-5 h-5 text-foreground-tertiary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{project.name}</h4>
                      <p className="text-sm text-foreground-secondary truncate">{project.path}</p>
                      {project.description && (
                        <p className="text-xs text-foreground-tertiary mt-1">{project.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-foreground-tertiary">
                          {project.agents.length} agent{project.agents.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'ACTIVE' 
                            ? 'bg-status-success/20 text-status-success' 
                            : 'bg-background-tertiary text-foreground-secondary'
                        }`}>
                          {project.status}
                        </span>
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {project.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="text-xs bg-brand/20 text-brand px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                            {project.tags.length > 2 && (
                              <span className="text-xs text-foreground-tertiary">
                                +{project.tags.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Path Option */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground-secondary">Custom Project Path</h3>
            <button
              onClick={() => setShowCustomPath(!showCustomPath)}
              className="text-sm text-brand hover:text-brand-hover transition-colors"
            >
              {showCustomPath ? 'Hide' : 'Show'} Custom Path
            </button>
          </div>
          
          {(showCustomPath || !formData.projectId) && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCustomPath(true);
                  handleCustomPathChange('');
                }}
                className={`w-full p-4 border rounded-lg text-left transition-all hover:border-brand hover:bg-brand/10 ${
                  !formData.projectId && formData.projectPath !== undefined
                    ? 'border-brand bg-brand/20' 
                    : 'border-border border-dashed bg-background-secondary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Plus className="w-5 h-5 text-foreground-tertiary" />
                  <div>
                    <h4 className="text-sm font-medium text-foreground">New Project Path</h4>
                    <p className="text-sm text-foreground-secondary">Specify a custom directory path</p>
                  </div>
                </div>
              </button>
              
              {(!formData.projectId || showCustomPath) && (
                <div className="space-y-3">
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary w-4 h-4" />
                    <input
                      type="text"
                      placeholder="/Users/username/path/to/your/project"
                      value={formData.projectPath || ''}
                      onChange={(e) => handleCustomPathChange(e.target.value)}
                      className="w-full pl-10 pr-32 py-2 bg-background-secondary border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand text-foreground placeholder-foreground-tertiary"
                    />
                    <button
                      onClick={handleBrowseDirectory}
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-brand hover:bg-brand-hover text-white text-sm rounded-md transition-colors flex items-center"
                    >
                      <FolderSearch className="w-3 h-3 mr-1" />
                      Browse
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-foreground-tertiary flex items-start">
                      <span className="inline-block w-2 h-2 rounded-full bg-status-info mt-1 mr-2 flex-shrink-0" />
                      <span>Select the root directory of your project. We'll check for Git configuration, TaskMaster setup, and project templates.</span>
                    </p>
                    <p className="text-xs text-foreground-tertiary flex items-start">
                      <span className="inline-block w-2 h-2 rounded-full bg-status-success mt-1 mr-2 flex-shrink-0" />
                      <span>The agent will operate from this directory - creating worktrees, running commands, and managing tasks.</span>
                    </p>
                  </div>
                  
                  {/* Path Validation Results */}
                  {pathValidation && formData.projectPath && (
                    <div className="bg-background-tertiary border border-border rounded-md p-3 space-y-2">
                      <h5 className="text-xs font-medium text-foreground mb-2">Project Analysis</h5>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          pathValidation.isGitRepo ? 'bg-status-success' : 'bg-status-warning'
                        }`} />
                        <span className="text-xs text-foreground-secondary">
                          {pathValidation.isGitRepo 
                            ? `Git repository detected (branch: ${pathValidation.gitBranch || 'main'})`
                            : 'Not a Git repository - worktrees will be created in a subdirectory'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          pathValidation.hasTaskMaster ? 'bg-status-success' : 'bg-status-warning'
                        }`} />
                        <span className="text-xs text-foreground-secondary">
                          {pathValidation.hasTaskMaster 
                            ? `TaskMaster configured (${pathValidation.taskCount || 0} tasks found)`
                            : 'TaskMaster not found - can be configured later'
                          }
                        </span>
                      </div>
                      
                      {pathValidation.error && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-status-error" />
                          <span className="text-xs text-status-error">
                            {pathValidation.error}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isValidating && (
                    <div className="text-xs text-foreground-tertiary flex items-center">
                      <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing project directory...
                    </div>
                  )}
                  
                  {/* Hidden file input for directory selection */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    // @ts-ignore - webkitdirectory is a non-standard attribute
                    webkitdirectory=""
                    directory=""
                    multiple
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No Projects Message */}
      {projects.length === 0 && (
        <div className="text-center py-8">
          <Folder className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Projects Found</h3>
          <p className="text-foreground-secondary mb-4">
            You don't have any registered projects yet. You can specify a custom project path below.
          </p>
          <button
            onClick={() => setShowCustomPath(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Path
          </button>
        </div>
      )}

      {/* Selection Summary */}
      {(formData.projectId || formData.projectPath) && (
        <div className="bg-brand/10 border border-brand/30 rounded-md p-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Selected Project</h4>
          {formData.projectId ? (
            <div>
              <p className="text-sm text-foreground-secondary">
                <span className="text-foreground">Project:</span> {projects.find(p => p.id === formData.projectId)?.name}
              </p>
              <p className="text-sm text-foreground-secondary">
                <span className="text-foreground">Path:</span> {formData.projectPath}
              </p>
            </div>
          ) : (
            <p className="text-sm text-foreground-secondary">
              <span className="text-foreground">Custom Path:</span> {formData.projectPath}
            </p>
          )}
        </div>
      )}
    </div>
  );
};