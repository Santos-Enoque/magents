import React, { useState } from 'react';
import { DirectoryBrowser } from '../components/DirectoryBrowser';

export const DirectoryBrowserDemo: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<{path: string; isGitRepo: boolean} | null>(null);
  const [showOnlyGitRepos, setShowOnlyGitRepos] = useState(false);

  const handleSelectDirectory = (path: string) => {
    setSelectedPath(path);
  };

  const handleSelectProject = (path: string, isGitRepo: boolean) => {
    setSelectedProject({ path, isGitRepo });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Directory Browser Demo</h1>
        <p className="text-gray-600">
          Browse and select project directories with Git repository detection
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DirectoryBrowser
            onSelectDirectory={handleSelectDirectory}
            onSelectProject={handleSelectProject}
            selectedPath={selectedPath}
            showOnlyGitRepos={showOnlyGitRepos}
            maxDepth={3}
            includeHidden={false}
            className="h-96"
          />
        </div>

        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Controls</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="showOnlyGitRepos"
                  type="checkbox"
                  checked={showOnlyGitRepos}
                  onChange={(e) => setShowOnlyGitRepos(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showOnlyGitRepos" className="ml-2 block text-sm text-gray-900">
                  Show only Git repositories
                </label>
              </div>
            </div>
          </div>

          {/* Selection Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selection Info</h3>
            
            {selectedProject ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Path:</span>
                  <p className="text-sm text-gray-900 break-all">{selectedProject.path}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    selectedProject.isGitRepo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedProject.isGitRepo ? 'Git Repository' : 'Directory'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No directory selected</p>
            )}
          </div>

          {/* Features */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
            
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Tree-view navigation</li>
              <li>• Git repository detection</li>
              <li>• Search functionality</li>
              <li>• Breadcrumb navigation</li>
              <li>• Favorites and recent paths</li>
              <li>• Expand/collapse directories</li>
              <li>• Security path validation</li>
              <li>• Virtual scrolling support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};