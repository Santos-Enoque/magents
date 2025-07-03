/**
 * Core Integration Service for CLI
 *
 * Integrates the CLI with the core manager for unified command execution
 * and real-time synchronization with the GUI.
 */
import { CoreCommandResult } from '@magents/shared';
export declare class CoreIntegrationService {
    private static instance;
    private sessionId;
    private isInitialized;
    private dockerManager;
    private configManager;
    private constructor();
    static getInstance(): CoreIntegrationService;
    /**
     * Initialize the core integration service
     */
    initialize(): Promise<void>;
    /**
     * Execute a command through the unified core manager
     */
    executeCommand(commandName: string, params?: Record<string, any>, userId?: string): Promise<CoreCommandResult>;
    /**
     * Get the current session ID
     */
    getSessionId(): string;
    /**
     * Get activity logs for CLI operations
     */
    getActivityLogs(filters?: {
        command?: string;
        since?: Date;
        limit?: number;
    }): import("@magents/shared").ActivityLogEntry[];
    /**
     * Get sync conflicts involving CLI operations
     */
    getSyncConflicts(filters?: {
        resolved?: boolean;
        severity?: 'low' | 'medium' | 'high';
        since?: Date;
    }): import("@magents/shared").ConflictInfo[];
    /**
     * Register standard commands with actual CLI implementations
     */
    private registerStandardCommands;
    /**
     * Register CLI-specific commands
     */
    private registerCliCommands;
    /**
     * Execute actual CLI command using existing services
     */
    private executeActualCommand;
    /**
     * Set up event listeners for real-time updates
     */
    private setupEventListeners;
    /**
     * Get system status information
     */
    private getSystemStatus;
    /**
     * Perform system cleanup
     */
    private performCleanup;
    /**
     * Cleanup on service shutdown
     */
    cleanup(): Promise<void>;
}
export default CoreIntegrationService;
//# sourceMappingURL=CoreIntegrationService.d.ts.map