import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Home, 
  GitBranch, 
  Star,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { DirectoryItem, ProjectDiscoveryOptions } from '@magents/shared';
import { apiService } from '../services/api';

interface DirectoryBrowserProps {
  onSelectDirectory?: (path: string) => void;
  onSelectProject?: (path: string, isGitRepo: boolean) => void;
  selectedPath?: string;
  showOnlyGitRepos?: boolean;
  maxDepth?: number;
  includeHidden?: boolean;
  className?: string;
}

interface DirectoryTreeItemProps {
  item: DirectoryItem;
  level: number;
  onSelect: (path: string, isGitRepo: boolean) => void;
  selectedPath?: string;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  showOnlyGitRepos: boolean;
  isLoading?: boolean;
}

interface SearchResult {
  path: string;
  name: string;
  isGitRepo: boolean;
  type: 'file' | 'directory';
}

const DEFAULT_START_PATH = process.env.HOME || '/Users';

const DirectoryTreeItem: React.FC<DirectoryTreeItemProps> = ({
  item,
  level,
  onSelect,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  showOnlyGitRepos,
  isLoading
}) => {
  const isExpanded = expandedPaths.has(item.path);
  const isSelected = selectedPath === item.path;
  const hasChildren = item.children && item.children.length > 0;
  const shouldShow = !showOnlyGitRepos || item.isGitRepo || hasChildren;

  // Filter children based on showOnlyGitRepos setting
  const filteredChildren = useMemo(() => {
    if (!item.children) return [];
    
    if (showOnlyGitRepos) {
      return item.children.filter(child => 
        child.isGitRepo || (child.children && child.children.length > 0)
      );
    }
    
    return item.children.filter(child => child.type === 'directory');
  }, [item.children, showOnlyGitRepos]);

  if (!shouldShow) return null;

  const handleClick = () => {
    if (item.type === 'directory') {
      onSelect(item.path, item.isGitRepo || false);
      
      if (hasChildren) {
        onToggleExpand(item.path);
      }
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(item.path);
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-100 text-blue-800' 
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        style={{ paddingLeft: `${(level * 20) + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse button */}
        {hasChildren && (
          <button
            onClick={handleToggleExpand}
            className="flex-shrink-0 w-4 h-4 mr-1 hover:bg-gray-200 rounded"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        
        {/* Folder icon */}
        <div className="flex-shrink-0 mr-2">
          {item.isGitRepo ? (
            <div className="relative">
              <Folder className="w-4 h-4 text-orange-600" />
              <GitBranch className="w-2 h-2 text-green-600 absolute -bottom-0.5 -right-0.5" />
            </div>
          ) : isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-blue-600" />
          )}
        </div>
        
        {/* Directory name */}
        <span className="flex-1 truncate text-sm font-medium">
          {item.name}
        </span>
        
        {/* Git repo indicator */}
        {item.isGitRepo && (
          <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
            Git
          </span>
        )}
      </div>
      
      {/* Children */}
      {isExpanded && filteredChildren.length > 0 && (
        <div>
          {filteredChildren.map((child) => (
            <DirectoryTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              showOnlyGitRepos={showOnlyGitRepos}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DirectoryBrowser: React.FC<DirectoryBrowserProps> = ({
  onSelectDirectory,
  onSelectProject,
  selectedPath,
  showOnlyGitRepos = false,
  maxDepth = 3,
  includeHidden = false,
  className = ''
}) => {
  const [currentPath, setCurrentPath] = useState<string>(DEFAULT_START_PATH);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  // Load favorites and recent paths from localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem('directoryBrowser.favorites');
    const storedRecent = localStorage.getItem('directoryBrowser.recent');
    
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
    
    if (storedRecent) {
      setRecentPaths(JSON.parse(storedRecent));
    }
  }, []);

  // Save favorites and recent paths to localStorage
  useEffect(() => {
    localStorage.setItem('directoryBrowser.favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('directoryBrowser.recent', JSON.stringify(recentPaths));
  }, [recentPaths]);

  const loadDirectories = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const options: ProjectDiscoveryOptions = {
        path,
        maxDepth,
        includeHidden
      };

      const result = await apiService.discoverProjects(options);
      setDirectories(result);
      
      // Update recent paths
      setRecentPaths(prev => {
        const updated = [path, ...prev.filter(p => p !== path)].slice(0, 10);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directories');
      setDirectories([]);
    } finally {
      setIsLoading(false);
    }
  }, [maxDepth, includeHidden]);

  // Load directories when path changes
  useEffect(() => {
    loadDirectories(currentPath);
  }, [currentPath, loadDirectories]);

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchInDirectories = (items: DirectoryItem[], results: SearchResult[] = []): SearchResult[] => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            path: item.path,
            name: item.name,
            isGitRepo: item.isGitRepo || false,
            type: item.type
          });
        }
        
        if (item.children) {
          searchInDirectories(item.children, results);
        }
      }
      return results;
    };

    const results = searchInDirectories(directories);
    setSearchResults(results.slice(0, 50)); // Limit results for performance
  }, [searchTerm, directories]);

  const handleDirectorySelect = (path: string, isGitRepo: boolean) => {
    onSelectDirectory?.(path);
    onSelectProject?.(path, isGitRepo);
  };

  const handleToggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleNavigateToPath = (path: string) => {
    setCurrentPath(path);
    setSearchTerm('');
    setExpandedPaths(new Set());
  };

  const toggleFavorite = (path: string) => {
    setFavorites(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        return [...prev, path].slice(0, 20); // Limit favorites
      }
    });
  };

  const isFavorite = (path: string) => favorites.includes(path);

  // Breadcrumb navigation
  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Project Directory Browser</h3>
          <button
            onClick={() => loadDirectories(currentPath)}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search directories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-1 text-sm text-gray-600 overflow-x-auto">
          <button
            onClick={() => handleNavigateToPath('/')}
            className="flex items-center hover:text-blue-600"
          >
            <Home className="w-4 h-4" />
          </button>
          {pathSegments.map((segment, index) => {
            const segmentPath = '/' + pathSegments.slice(0, index + 1).join('/');
            return (
              <React.Fragment key={segmentPath}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => handleNavigateToPath(segmentPath)}
                  className="hover:text-blue-600 truncate"
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Favorites and Recent */}
      {(favorites.length > 0 || recentPaths.length > 0) && !searchTerm && (
        <div className="p-4 border-b border-gray-200 space-y-3">
          {favorites.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Star className="w-4 h-4 mr-1" />
                Favorites
              </h4>
              <div className="space-y-1">
                {favorites.slice(0, 5).map((path) => (
                  <button
                    key={path}
                    onClick={() => handleNavigateToPath(path)}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 truncate"
                  >
                    {path}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentPaths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Recent
              </h4>
              <div className="space-y-1">
                {recentPaths.slice(0, 5).map((path) => (
                  <button
                    key={path}
                    onClick={() => handleNavigateToPath(path)}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 truncate"
                  >
                    {path}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {isLoading && directories.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading directories...</span>
          </div>
        )}

        {/* Search Results */}
        {searchTerm && searchResults.length > 0 && (
          <div className="space-y-1 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Search Results ({searchResults.length})
            </h4>
            {searchResults.map((result) => (
              <div
                key={result.path}
                className={`flex items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
                  selectedPath === result.path 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => handleDirectorySelect(result.path, result.isGitRepo)}
              >
                <div className="flex-shrink-0 mr-2">
                  {result.isGitRepo ? (
                    <div className="relative">
                      <Folder className="w-4 h-4 text-orange-600" />
                      <GitBranch className="w-2 h-2 text-green-600 absolute -bottom-0.5 -right-0.5" />
                    </div>
                  ) : (
                    <Folder className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="flex-1 truncate text-sm">{result.path}</span>
                {result.isGitRepo && (
                  <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                    Git
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(result.path);
                  }}
                  className="flex-shrink-0 ml-2 p-1 hover:bg-gray-200 rounded"
                >
                  <Star 
                    className={`w-3 h-3 ${
                      isFavorite(result.path) 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`} 
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Directory Tree */}
        {!searchTerm && directories.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {directories.map((item) => (
              <DirectoryTreeItem
                key={item.path}
                item={item}
                level={0}
                onSelect={handleDirectorySelect}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
                showOnlyGitRepos={showOnlyGitRepos}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {/* Empty States */}
        {!isLoading && !error && directories.length === 0 && !searchTerm && (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No directories found in this location</p>
          </div>
        )}

        {!isLoading && !error && searchTerm && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No directories found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedPath && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 truncate">
              Selected: {selectedPath}
            </span>
            <button
              onClick={() => toggleFavorite(selectedPath)}
              className="flex-shrink-0 ml-2 p-1 hover:bg-gray-200 rounded"
            >
              <Star 
                className={`w-4 h-4 ${
                  isFavorite(selectedPath) 
                    ? 'text-yellow-500 fill-current' 
                    : 'text-gray-400'
                }`} 
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};