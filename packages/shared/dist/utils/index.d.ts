export declare function generateId(prefix?: string, length?: number): string;
export declare function sanitizeBranchName(name: string): string;
export declare function truncateString(str: string, maxLength: number, suffix?: string): string;
export declare function formatDate(date: Date): string;
export declare function getRelativeTime(date: Date): string;
export declare function isValidEmail(email: string): boolean;
export declare function isValidPort(port: number): boolean;
export declare function isValidPortRange(range: string): boolean;
export declare function uniqueArray<T>(array: T[]): T[];
export declare function chunkArray<T>(array: T[], size: number): T[][];
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
export declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare function delay(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, delayMs?: number): Promise<T>;
export declare function ensureAbsolutePath(path: string, basePath?: string): string;
export declare function extractFilename(path: string): string;
export declare function extractDirectory(path: string): string;
export declare function createSuccessResult<T>(message: string, data?: T): {
    success: boolean;
    message: string;
    data: T | undefined;
};
export declare function createErrorResult(message: string, error?: any): {
    success: boolean;
    message: string;
    data: any;
};
export declare function isDevelopment(): boolean;
export declare function isProduction(): boolean;
export declare function getEnvVar(name: string, defaultValue?: string): string;
export declare function requireEnvVar(name: string): string;
export declare function generateAgentId(branch?: string): string;
export declare function parseAgentId(agentId: string): {
    branch?: string;
    timestamp?: number;
    random?: string;
};
export declare function parsePortRange(range: string): {
    start: number;
    end: number;
} | null;
export declare function isPortInRange(port: number, range: {
    start: number;
    end: number;
}): boolean;
export declare function formatLogMessage(level: string, message: string, metadata?: any): string;
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function isArray<T>(value: unknown): value is T[];
export declare function isDefined<T>(value: T | undefined | null): value is T;
//# sourceMappingURL=index.d.ts.map