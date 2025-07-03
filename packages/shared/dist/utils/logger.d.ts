/**
 * Simple logger class for consistent logging across the application
 */
export declare class Logger {
    private context;
    constructor(context: string);
    private formatMessage;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    verbose(message: string, ...args: any[]): void;
}
//# sourceMappingURL=logger.d.ts.map