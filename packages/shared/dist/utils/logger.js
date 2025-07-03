"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/**
 * Simple logger class for consistent logging across the application
 */
class Logger {
    constructor(context) {
        this.context = context;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] [${this.context}] ${message}`;
    }
    info(message, ...args) {
        console.log(this.formatMessage('INFO', message), ...args);
    }
    warn(message, ...args) {
        console.warn(this.formatMessage('WARN', message), ...args);
    }
    error(message, ...args) {
        console.error(this.formatMessage('ERROR', message), ...args);
    }
    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }
    verbose(message, ...args) {
        if (process.env.VERBOSE) {
            console.log(this.formatMessage('VERBOSE', message), ...args);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map