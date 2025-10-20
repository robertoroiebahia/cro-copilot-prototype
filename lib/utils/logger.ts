/**
 * Structured Logger
 * Consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  module?: string;
  userId?: string;
  analysisId?: string;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  module?: string;
  userId?: string;
  analysisId?: string;
  enabled?: boolean;
}

/**
 * Logger Class
 */
export class Logger {
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig) {
    this.config = {
      level: config.level,
      module: config.module || 'app',
      userId: config.userId || '',
      analysisId: config.analysisId || '',
      enabled: config.enabled !== false,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LoggerConfig>): Logger {
    return new Logger({
      ...this.config,
      ...context,
    });
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp.toISOString()}]`,
      `[${entry.level.toUpperCase()}]`,
      `[${entry.module || 'app'}]`,
    ];

    if (entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }

    if (entry.analysisId) {
      parts.push(`[analysis:${entry.analysisId}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Log entry
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      module: this.config.module,
      userId: this.config.userId || undefined,
      analysisId: this.config.analysisId || undefined,
      error,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && level === LogLevel.ERROR) {
      // TODO: Send to external service (e.g., Sentry, LogRocket, etc.)
    }
  }

  /**
   * Debug level
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`${label} started`, context);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `${label} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { ...context, duration }
      );
      throw error;
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Default logger instance
 */
export const logger = createLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  enabled: process.env.NODE_ENV !== 'test',
});
