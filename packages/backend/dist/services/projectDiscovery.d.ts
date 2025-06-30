import { DirectoryItem, ProjectDiscoveryOptions, GitRepositoryInfo, ProjectValidationResult } from '@magents/shared';
export declare class ProjectDiscoveryService {
    /**
     * Browse directories and build tree structure
     */
    browseDirectory(options: ProjectDiscoveryOptions): Promise<DirectoryItem[]>;
    /**
     * Validate if a directory is a git repository and extract metadata
     */
    validateGitRepository(dirPath: string): Promise<ProjectValidationResult>;
    /**
     * Extract comprehensive git repository information
     */
    getRepositoryMetadata(dirPath: string): Promise<GitRepositoryInfo>;
    /**
     * Build directory tree recursively
     */
    private buildDirectoryTree;
    /**
     * Check if a directory is a git repository
     */
    private isGitRepository;
    /**
     * Get comprehensive git repository information
     */
    private getGitRepositoryInfo;
    /**
     * Validate and normalize file paths to prevent directory traversal
     */
    private validatePath;
}
export declare const projectDiscoveryService: ProjectDiscoveryService;
//# sourceMappingURL=projectDiscovery.d.ts.map