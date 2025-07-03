// String utilities
export function generateId(prefix = '', length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${result}` : result;
}

export function sanitizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function truncateString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

// Date utilities
export function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function isValidPortRange(range: string): boolean {
  const parts = range.split('-');
  if (parts.length !== 2) return false;
  const start = parseInt(parts[0]);
  const end = parseInt(parts[1]);
  return isValidPort(start) && isValidPort(end) && start <= end;
}

// Array utilities
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Object utilities
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as any;
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key] as any);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  
  return result;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as T;
  keys.forEach(key => {
    delete (result as any)[key];
  });
  return result as Omit<T, K>;
}

// Promise utilities
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;
      await delay(delayMs * attempt); // Exponential backoff
    }
  }
  
  throw lastError!;
}

// Path utilities
export function ensureAbsolutePath(path: string, basePath?: string): string {
  if (path.startsWith('/')) return path;
  return basePath ? `${basePath}/${path}` : `${process.cwd()}/${path}`;
}

export function extractFilename(path: string): string {
  return path.split('/').pop() || '';
}

export function extractDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

// Command result utilities
export function createSuccessResult<T>(message: string, data?: T) {
  return {
    success: true,
    message,
    data
  };
}

export function createErrorResult(message: string, error?: any) {
  return {
    success: false,
    message,
    data: error
  };
}

// Environment utilities
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getEnvVar(name: string, defaultValue?: string): string {
  return process.env[name] || defaultValue || '';
}

export function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Agent utilities
export function generateAgentId(branch?: string): string {
  const timestamp = Date.now().toString(36);
  const random = generateId('', 4);
  const branchPart = branch ? sanitizeBranchName(branch).slice(0, 8) : '';
  return `agent-${branchPart ? branchPart + '-' : ''}${timestamp}-${random}`;
}

export function parseAgentId(agentId: string): { branch?: string; timestamp?: number; random?: string } {
  const parts = agentId.split('-');
  if (parts.length < 3) return {};
  
  // Remove 'agent' prefix
  parts.shift();
  
  const random = parts.pop();
  const timestamp = parts.pop();
  const branch = parts.length > 0 ? parts.join('-') : undefined;
  
  return {
    branch,
    timestamp: timestamp ? parseInt(timestamp, 36) : undefined,
    random
  };
}

// Port utilities
export function parsePortRange(range: string): { start: number; end: number } | null {
  if (!isValidPortRange(range)) return null;
  const [start, end] = range.split('-').map(Number);
  return { start, end };
}

export function isPortInRange(port: number, range: { start: number; end: number }): boolean {
  return port >= range.start && port <= range.end;
}

// Logging utilities
export function formatLogMessage(level: string, message: string, metadata?: any): string {
  const timestamp = new Date().toISOString();
  const metaString = metadata ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
}

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

// Export logger
export * from './logger';