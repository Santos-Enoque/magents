import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DirectoryBrowser } from '../DirectoryBrowser';
import { apiService } from '../../services/api';
import { DirectoryItem } from '@magents/shared';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    discoverProjects: vi.fn(),
    validateProject: vi.fn(),
    getProjectMetadata: vi.fn(),
  },
}));

const mockApiService = apiService as unknown as {
  discoverProjects: ReturnType<typeof vi.fn>;
  validateProject: ReturnType<typeof vi.fn>;
  getProjectMetadata: ReturnType<typeof vi.fn>;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock process.env
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, HOME: '/Users/testuser' };
});

afterEach(() => {
  process.env = originalEnv;
});

const mockDirectoryData: DirectoryItem[] = [
  {
    name: 'project1',
    path: '/Users/testuser/project1',
    type: 'directory',
    isGitRepo: true,
    children: [
      {
        name: 'src',
        path: '/Users/testuser/project1/src',
        type: 'directory',
        isGitRepo: false,
        children: []
      }
    ]
  },
  {
    name: 'project2',
    path: '/Users/testuser/project2',
    type: 'directory',
    isGitRepo: false,
    children: []
  },
  {
    name: 'documents',
    path: '/Users/testuser/documents',
    type: 'directory',
    isGitRepo: false,
    children: [
      {
        name: 'repo-inside',
        path: '/Users/testuser/documents/repo-inside',
        type: 'directory',
        isGitRepo: true,
        children: []
      }
    ]
  }
];

describe('DirectoryBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockApiService.discoverProjects.mockResolvedValue(mockDirectoryData);
  });

  it('should render directory browser with header', async () => {
    render(<DirectoryBrowser />);
    
    expect(screen.getByText('Project Directory Browser')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search directories...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters on initial load', async () => {
    render(<DirectoryBrowser maxDepth={2} includeHidden={true} />);
    
    await waitFor(() => {
      expect(apiService.discoverProjects).toHaveBeenCalledWith({
        path: '/Users/testuser',
        maxDepth: 2,
        includeHidden: true
      });
    });
  });

  it('should display directory items correctly', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
      expect(screen.getByText('project2')).toBeInTheDocument();
      expect(screen.getByText('documents')).toBeInTheDocument();
    });

    // Check for Git repo indicator
    expect(screen.getAllByText('Git')).toHaveLength(1);
  });

  it('should handle directory selection', async () => {
    const onSelectDirectory = vi.fn();
    const onSelectProject = vi.fn();
    
    render(
      <DirectoryBrowser 
        onSelectDirectory={onSelectDirectory}
        onSelectProject={onSelectProject}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('project1'));
    
    expect(onSelectDirectory).toHaveBeenCalledWith('/Users/testuser/project1');
    expect(onSelectProject).toHaveBeenCalledWith('/Users/testuser/project1', true);
  });

  it('should expand and collapse directories', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    // Initially, 'src' should not be visible
    expect(screen.queryByText('src')).not.toBeInTheDocument();

    // Click to expand project1
    const expandButton = screen.getAllByRole('button')[1]; // Skip refresh button
    fireEvent.click(expandButton);

    // Now 'src' should be visible
    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
    });
  });

  it('should filter search results correctly', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search directories...');
    fireEvent.change(searchInput, { target: { value: 'project1' } });

    await waitFor(() => {
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockApiService.discoverProjects.mockRejectedValue(new Error('Network error'));
    
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    mockApiService.discoverProjects.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<DirectoryBrowser />);
    
    expect(screen.getByText('Loading directories...')).toBeInTheDocument();
  });

  it('should handle favorites functionality', async () => {
    render(<DirectoryBrowser selectedPath="/Users/testuser/project1" />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    // Find and click the favorite button in footer
    const favoriteButtons = screen.getAllByRole('button');
    const favoriteButton = favoriteButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('w-4')
    );
    
    if (favoriteButton) {
      fireEvent.click(favoriteButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'directoryBrowser.favorites',
        JSON.stringify(['/Users/testuser/project1'])
      );
    }
  });

  it('should navigate via breadcrumbs', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Click on home breadcrumb
    const homeButton = screen.getByRole('button', { name: '' }); // Home icon button
    fireEvent.click(homeButton);

    expect(apiService.discoverProjects).toHaveBeenCalledWith({
      path: '/',
      maxDepth: 3,
      includeHidden: false
    });
  });

  it('should show only git repos when showOnlyGitRepos is true', async () => {
    render(<DirectoryBrowser showOnlyGitRepos={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    // project2 should not be visible since it's not a git repo
    expect(screen.queryByText('project2')).not.toBeInTheDocument();
    
    // documents should be visible because it has git repo children
    expect(screen.getByText('documents')).toBeInTheDocument();
  });

  it('should handle refresh functionality', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    // Clear the mock to track new calls
    vi.clearAllMocks();
    mockApiService.discoverProjects.mockResolvedValue(mockDirectoryData);

    // Click refresh button
    const refreshButton = screen.getAllByRole('button')[0]; // First button should be refresh
    fireEvent.click(refreshButton);

    expect(apiService.discoverProjects).toHaveBeenCalledTimes(1);
  });

  it('should save and load recent paths', async () => {
    // Mock localStorage with existing recent paths
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'directoryBrowser.recent') {
        return JSON.stringify(['/Users/testuser/old-path']);
      }
      return null;
    });

    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('/Users/testuser/old-path')).toBeInTheDocument();
    });
  });

  it('should handle empty directory state', async () => {
    mockApiService.discoverProjects.mockResolvedValue([]);
    
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('No directories found in this location')).toBeInTheDocument();
    });
  });

  it('should handle empty search results', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search directories...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No directories found matching "nonexistent"')).toBeInTheDocument();
    });
  });

  it('should respect selectedPath prop', async () => {
    render(<DirectoryBrowser selectedPath="/Users/testuser/project1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Selected: /Users/testuser/project1')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation and accessibility', async () => {
    render(<DirectoryBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('project1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search directories...');
    
    // Test that search input is focusable
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    
    // Test search input functionality with keyboard
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    // Should not crash and should maintain focus
    expect(document.activeElement).toBe(searchInput);
  });
});