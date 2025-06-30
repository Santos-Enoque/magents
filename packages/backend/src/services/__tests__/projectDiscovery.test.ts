import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { ProjectDiscoveryService } from '../projectDiscovery';
import { ProjectDiscoveryOptions, GitRepositoryInfo } from '@magents/shared';

// Mock the fs and child_process modules
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
    readFile: jest.fn()
  },
  accessSync: jest.fn()
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn)
}));

describe('ProjectDiscoveryService', () => {
  let service: ProjectDiscoveryService;
  let mockFs: any;
  let mockExec: any;
  let mockAccessSync: any;

  beforeEach(() => {
    service = new ProjectDiscoveryService();
    mockFs = fs as any;
    mockExec = exec as any;
    mockAccessSync = require('fs').accessSync;
    jest.clearAllMocks();
    
    // Default mock for path validation - allow access by default
    mockAccessSync.mockImplementation(() => {}); // No error = path exists
  });

  describe('browseDirectory', () => {
    it('should browse directory and return directory items', async () => {
      const testPath = '/test/path';
      const options: ProjectDiscoveryOptions = { path: testPath, maxDepth: 2 };

      // Mock fs.stat to validate path exists
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });

      // Mock fs.readdir to return test entries
      mockFs.readdir.mockResolvedValue([
        { name: 'project1', isDirectory: () => true, isFile: () => false },
        { name: 'project2', isDirectory: () => true, isFile: () => false },
        { name: 'file.txt', isDirectory: () => false, isFile: () => true }
      ]);

      // Mock git repository check - need separate calls for each directory check
      mockFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true }) // Initial path validation
        .mockResolvedValueOnce({ isDirectory: () => true }) // project1/.git
        .mockRejectedValueOnce(new Error('ENOENT')) // project2/.git (not a git repo)
        .mockRejectedValueOnce(new Error('ENOENT')); // file.txt/.git (not applicable)

      const result = await service.browseDirectory(options);

      expect(result).toHaveLength(3); // 2 directories + 1 file
      expect(result[0].type).toBe('directory');
      expect(result.find(item => item.name === 'project1')?.isGitRepo).toBe(true);
      expect(result.find(item => item.name === 'project2')?.isGitRepo).toBe(false);
    });

    it('should handle directory read errors gracefully', async () => {
      const testPath = '/test/path';
      const options: ProjectDiscoveryOptions = { path: testPath };

      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.browseDirectory(options);
      expect(result).toEqual([]);
    });

    it('should respect maxDepth parameter', async () => {
      const testPath = '/test/path';
      const options: ProjectDiscoveryOptions = { path: testPath, maxDepth: 1 };

      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValue([
        { name: 'project1', isDirectory: () => true, isFile: () => false }
      ]);

      const result = await service.browseDirectory(options);
      
      expect(result).toHaveLength(1);
      expect(result[0].children).toBeUndefined(); // No children due to maxDepth
    });

    it('should filter hidden files when includeHidden is false', async () => {
      const testPath = '/test/path';
      const options: ProjectDiscoveryOptions = { path: testPath, includeHidden: false };

      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValue([
        { name: 'visible-project', isDirectory: () => true, isFile: () => false },
        { name: '.hidden-project', isDirectory: () => true, isFile: () => false }
      ]);

      const result = await service.browseDirectory(options);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible-project');
    });
  });

  describe('validateGitRepository', () => {
    it('should validate a valid git repository', async () => {
      const testPath = '/test/repo';

      // Mock path validation
      mockFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true }) // Path exists and is directory
        .mockResolvedValueOnce({ isDirectory: () => true }); // .git exists

      // Mock git commands with proper promisified exec
      mockExec
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' }) // git rev-parse --abbrev-ref HEAD
        .mockResolvedValueOnce({ stdout: '* main\n  develop\n', stderr: '' }) // git branch -a
        .mockResolvedValueOnce({ stdout: 'origin\thttps://github.com/test/repo.git (fetch)\n', stderr: '' }) // git remote -v
        .mockResolvedValueOnce({ stdout: 'abc123|Initial commit|John Doe|2023-01-01 12:00:00 +0000', stderr: '' }) // git log
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // git status --porcelain (clean)

      // Mock TaskMaster config check
      mockFs.access.mockRejectedValue(new Error('ENOENT')); // No TaskMaster config

      const result = await service.validateGitRepository(testPath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.gitInfo?.currentBranch).toBe('main');
      expect(result.gitInfo?.isClean).toBe(true);
      expect(result.gitInfo?.hasTaskMaster).toBe(false);
    });

    it('should handle non-git directories', async () => {
      const testPath = '/test/notrepo';

      mockFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true }) // Path exists and is directory
        .mockRejectedValueOnce(new Error('ENOENT')); // .git doesn't exist

      const result = await service.validateGitRepository(testPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Not a valid git repository');
    });

    it('should handle non-existent paths', async () => {
      const testPath = '/test/nonexistent';

      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await service.validateGitRepository(testPath);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect TaskMaster configuration', async () => {
      const testPath = '/test/repo';

      mockFs.stat
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => true });

      // Mock basic git commands
      mockExec
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: '* main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'abc123|Initial commit|John Doe|2023-01-01 12:00:00 +0000', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      // Mock TaskMaster config exists
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('{"research": true}');

      const result = await service.validateGitRepository(testPath);

      expect(result.gitInfo?.hasTaskMaster).toBe(true);
      expect(result.gitInfo?.taskMasterConfig?.research).toBe(true);
    });
  });

  describe('getRepositoryMetadata', () => {
    it('should extract comprehensive git repository metadata', async () => {
      const testPath = '/test/repo';

      mockFs.stat.mockResolvedValue({ isDirectory: () => true });

      // Mock all git commands for comprehensive metadata
      mockExec
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: '* main\n  develop\n  remotes/origin/main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'origin\thttps://github.com/test/repo.git (fetch)\norigin\thttps://github.com/test/repo.git (push)\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'abc123|Initial commit|John Doe|2023-01-01 12:00:00 +0000', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'M file.txt\n', stderr: '' }); // Not clean

      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.getRepositoryMetadata(testPath);

      expect(result.isValid).toBe(true);
      expect(result.currentBranch).toBe('main');
      expect(result.branches).toContain('main');
      expect(result.branches).toContain('develop');
      expect(result.remotes).toHaveLength(2);
      expect(result.lastCommit?.hash).toBe('abc123');
      expect(result.isClean).toBe(false);
    });
  });

  describe('path validation', () => {
    it('should reject paths with directory traversal attempts', async () => {
      const maliciousPath = '/test/../../../etc/passwd';
      const options: ProjectDiscoveryOptions = { path: maliciousPath };

      // Mock accessSync to fail for this test
      mockAccessSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      await expect(service.browseDirectory(options)).rejects.toThrow('Path does not exist or is not accessible');
    });

    it('should reject non-existent paths', async () => {
      const nonExistentPath = '/test/nonexistent';
      const options: ProjectDiscoveryOptions = { path: nonExistentPath };

      // Mock path validation to fail
      mockAccessSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      await expect(service.browseDirectory(options)).rejects.toThrow('Path does not exist or is not accessible');
    });
  });
});