"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.sanitizeBranchName = sanitizeBranchName;
exports.truncateString = truncateString;
exports.formatDate = formatDate;
exports.getRelativeTime = getRelativeTime;
exports.isValidEmail = isValidEmail;
exports.isValidPort = isValidPort;
exports.isValidPortRange = isValidPortRange;
exports.uniqueArray = uniqueArray;
exports.chunkArray = chunkArray;
exports.deepMerge = deepMerge;
exports.pick = pick;
exports.omit = omit;
exports.delay = delay;
exports.retry = retry;
exports.ensureAbsolutePath = ensureAbsolutePath;
exports.extractFilename = extractFilename;
exports.extractDirectory = extractDirectory;
exports.createSuccessResult = createSuccessResult;
exports.createErrorResult = createErrorResult;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.getEnvVar = getEnvVar;
exports.requireEnvVar = requireEnvVar;
exports.generateAgentId = generateAgentId;
exports.parseAgentId = parseAgentId;
exports.parsePortRange = parsePortRange;
exports.isPortInRange = isPortInRange;
exports.formatLogMessage = formatLogMessage;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isArray = isArray;
exports.isDefined = isDefined;
// String utilities
function generateId(prefix = '', length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix ? `${prefix}-${result}` : result;
}
function sanitizeBranchName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function truncateString(str, maxLength, suffix = '...') {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
}
// Date utilities
function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays === 1)
        return 'yesterday';
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
// Validation utilities
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidPort(port) {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}
function isValidPortRange(range) {
    const parts = range.split('-');
    if (parts.length !== 2)
        return false;
    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);
    return isValidPort(start) && isValidPort(end) && start <= end;
}
// Array utilities
function uniqueArray(array) {
    return [...new Set(array)];
}
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
// Object utilities
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        }
        else if (source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}
function pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}
function omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
}
// Promise utilities
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts)
                break;
            await delay(delayMs * attempt); // Exponential backoff
        }
    }
    throw lastError;
}
// Path utilities
function ensureAbsolutePath(path, basePath) {
    if (path.startsWith('/'))
        return path;
    return basePath ? `${basePath}/${path}` : `${process.cwd()}/${path}`;
}
function extractFilename(path) {
    return path.split('/').pop() || '';
}
function extractDirectory(path) {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
}
// Command result utilities
function createSuccessResult(message, data) {
    return {
        success: true,
        message,
        data
    };
}
function createErrorResult(message, error) {
    return {
        success: false,
        message,
        data: error
    };
}
// Environment utilities
function isDevelopment() {
    return process.env.NODE_ENV === 'development';
}
function isProduction() {
    return process.env.NODE_ENV === 'production';
}
function getEnvVar(name, defaultValue) {
    return process.env[name] || defaultValue || '';
}
function requireEnvVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}
// Agent utilities
function generateAgentId(branch) {
    const timestamp = Date.now().toString(36);
    const random = generateId('', 4);
    const branchPart = branch ? sanitizeBranchName(branch).slice(0, 8) : '';
    return `agent-${branchPart ? branchPart + '-' : ''}${timestamp}-${random}`;
}
function parseAgentId(agentId) {
    const parts = agentId.split('-');
    if (parts.length < 3)
        return {};
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
function parsePortRange(range) {
    if (!isValidPortRange(range))
        return null;
    const [start, end] = range.split('-').map(Number);
    return { start, end };
}
function isPortInRange(port, range) {
    return port >= range.start && port <= range.end;
}
// Logging utilities
function formatLogMessage(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const metaString = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
}
// Type guards
function isString(value) {
    return typeof value === 'string';
}
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isArray(value) {
    return Array.isArray(value);
}
function isDefined(value) {
    return value !== undefined && value !== null;
}
//# sourceMappingURL=index.js.map