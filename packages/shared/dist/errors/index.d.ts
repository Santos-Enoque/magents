/**
 * Enhanced Error Handling System for Magents
 * Provides structured error classes, user-friendly messages, and recovery suggestions
 */
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum ErrorCategory {
    AGENT = "agent",
    PROJECT = "project",
    DOCKER = "docker",
    SYSTEM = "system",
    NETWORK = "network",
    VALIDATION = "validation",
    CONFIGURATION = "configuration"
}
export interface ErrorContext {
    timestamp: Date;
    severity: ErrorSeverity;
    category: ErrorCategory;
    code: string;
    userMessage: string;
    technicalMessage: string;
    suggestions: string[];
    learnMoreUrl?: string;
    context?: Record<string, any>;
    recoverable: boolean;
    autoFixAvailable: boolean;
}
export declare class MagentsError extends Error {
    readonly timestamp: Date;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
    readonly code: string;
    readonly userMessage: string;
    readonly technicalMessage: string;
    readonly suggestions: string[];
    readonly learnMoreUrl?: string;
    context?: Record<string, any>;
    readonly recoverable: boolean;
    readonly autoFixAvailable: boolean;
    constructor(errorContext: ErrorContext);
    toJSON(): {
        name: string;
        code: string;
        userMessage: string;
        technicalMessage: string;
        severity: ErrorSeverity;
        category: ErrorCategory;
        suggestions: string[];
        learnMoreUrl: string | undefined;
        context: Record<string, any> | undefined;
        recoverable: boolean;
        autoFixAvailable: boolean;
        timestamp: string;
        stack: string | undefined;
    };
}
/**
 * Error message mappings with user-friendly descriptions and recovery suggestions
 */
export declare const ERROR_MESSAGES: Record<string, Omit<ErrorContext, 'timestamp' | 'context'>>;
/**
 * Create a structured error with enhanced context
 */
export declare function createMagentsError(code: string, context?: Record<string, any>, overrides?: Partial<ErrorContext>): MagentsError;
/**
 * Create error from generic Error object
 */
export declare function createMagentsErrorFromGeneric(error: Error, code?: string, context?: Record<string, any>): MagentsError;
/**
 * Auto-fix functionality for supported errors
 */
export declare function attemptAutoFix(error: MagentsError): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map