/**
 * Auto-Configuration System for Magents
 *
 * Provides intelligent defaults and automatic configuration detection
 * for different project types, environments, and user preferences.
 */
import { MagentsConfig } from '../types';
export interface ProjectPattern {
    name: string;
    description: string;
    files: string[];
    directories?: string[];
    packageManagers?: string[];
    priority: number;
}
export declare const PROJECT_PATTERNS: ProjectPattern[];
export declare const PORT_RANGES: {
    WEB_DEVELOPMENT: {
        start: number;
        end: number;
    };
    API_SERVICES: {
        start: number;
        end: number;
    };
    DATABASES: {
        start: number;
        end: number;
    };
    TOOLS_UTILITIES: {
        start: number;
        end: number;
    };
    CUSTOM: {
        start: number;
        end: number;
    };
};
export interface ProjectDetectionResult {
    primaryType: string;
    confidence: number;
    allMatches: Array<{
        type: string;
        confidence: number;
        evidence: string[];
    }>;
    suggestions: {
        ports: number[];
        environment: Record<string, string>;
        commands: string[];
        extensions: string[];
    };
}
export interface MCPServerInfo {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    configPath: string;
}
export declare enum ConfigLevel {
    GLOBAL = "global",
    PROJECT = "project",
    AGENT = "agent"
}
export interface AutoConfigContext {
    projectPath: string;
    existingConfig?: Partial<MagentsConfig>;
    userPreferences?: Record<string, any>;
    constraints?: {
        portRange?: {
            start: number;
            end: number;
        };
        excludePorts?: number[];
        requiredFeatures?: string[];
    };
}
export interface EncryptedValue {
    encrypted: string;
    salt: string;
    algorithm: string;
}
/**
 * Main Auto-Configuration Service
 */
export declare class AutoConfigService {
    private static instance;
    private encryptionKey?;
    static getInstance(): AutoConfigService;
    /**
     * Detect project type and characteristics
     */
    detectProjectType(projectPath: string): Promise<ProjectDetectionResult>;
    /**
     * Allocate available ports with conflict detection
     */
    allocateAvailablePorts(count?: number, context?: AutoConfigContext): Promise<number[]>;
    /**
     * Discover MCP servers in project and system
     */
    discoverMCPServers(projectPath: string): Promise<MCPServerInfo[]>;
    /**
     * Build configuration with inheritance
     */
    buildConfigWithInheritance(context: AutoConfigContext): Promise<MagentsConfig>;
    /**
     * Encrypt sensitive values (using modern crypto API)
     */
    encryptValue(value: string, password?: string): EncryptedValue;
    /**
     * Decrypt sensitive values (using modern crypto API)
     */
    decryptValue(encryptedValue: EncryptedValue, password?: string): string;
    private fileExists;
    private directoryExists;
    private packageManagerAvailable;
    private generateProjectSuggestions;
    private getUsedPorts;
    private isPortAvailable;
    private parseMCPConfig;
    private loadGlobalConfig;
    private loadProjectConfig;
    private mergeConfigurations;
    private generateAutoConfig;
    private getOrCreateEncryptionKey;
}
export declare const autoConfig: AutoConfigService;
//# sourceMappingURL=index.d.ts.map