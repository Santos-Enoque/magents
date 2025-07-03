/**
 * Simple logger class for consistent logging across the application
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('INFO', message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message), ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message), ...args);
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (process.env.VERBOSE) {
      console.log(this.formatMessage('VERBOSE', message), ...args);
    }
  }
}