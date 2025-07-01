import React, { useState } from 'react';
import { Folder, FolderOpen, Search, Plus } from 'lucide-react';
import { Project } from '@magents/shared';
import { WizardFormData } from '../AgentCreationWizard';

interface ProjectSelectionStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  projects: Project[];
}

export const ProjectSelectionStep: React.FC<ProjectSelectionStepProps> = ({
  formData,
  updateFormData,
  projects
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomPath, setShowCustomPath] = useState(false);

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

  const handleCustomPathChange = (path: string) => {
    updateFormData({
      projectId: undefined,
      projectPath: path
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Project Selection Options */}
      <div className="grid grid-cols-1 gap-4">
        {/* Existing Projects */}
        {filteredProjects.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Existing Projects</h3>
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors hover:border-blue-500 hover:bg-blue-50 ${
                    formData.projectId === project.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Folder className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-500 truncate">{project.path}</p>
                      {project.description && (
                        <p className="text-xs text-gray-400 mt-1">{project.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {project.agents.length} agent{project.agents.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {project.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                            {project.tags.length > 2 && (
                              <span className="text-xs text-gray-500">
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
            <h3 className="text-sm font-medium text-gray-700">Custom Project Path</h3>
            <button
              onClick={() => setShowCustomPath(!showCustomPath)}
              className="text-sm text-blue-600 hover:text-blue-700"
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
                className={`w-full p-4 border rounded-lg text-left transition-colors hover:border-blue-500 hover:bg-blue-50 ${
                  !formData.projectId && formData.projectPath !== undefined
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 border-dashed'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Plus className="w-5 h-5 text-gray-400" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New Project Path</h4>
                    <p className="text-sm text-gray-500">Specify a custom directory path</p>
                  </div>
                </div>
              </button>
              
              {(!formData.projectId || showCustomPath) && (
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="/path/to/your/project"
                    value={formData.projectPath || ''}
                    onChange={(e) => handleCustomPathChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-500 mb-4">
            You don't have any registered projects yet. You can specify a custom project path below.
          </p>
          <button
            onClick={() => setShowCustomPath(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Path
          </button>
        </div>
      )}

      {/* Selection Summary */}
      {(formData.projectId || formData.projectPath) && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Project</h4>
          {formData.projectId ? (
            <div>
              <p className="text-sm text-blue-800">
                <strong>Project:</strong> {projects.find(p => p.id === formData.projectId)?.name}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Path:</strong> {formData.projectPath}
              </p>
            </div>
          ) : (
            <p className="text-sm text-blue-800">
              <strong>Custom Path:</strong> {formData.projectPath}
            </p>
          )}
        </div>
      )}
    </div>
  );
};