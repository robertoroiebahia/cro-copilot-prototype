/**
 * Custom Error Classes
 * Structured error handling for the application
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, true, context);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 404, true, { resource, id });
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true);
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ) {
    super(message, 429, true, { retryAfter });
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    originalError?: Error
  ) {
    super(
      `${service} service error: ${message}`,
      502,
      true,
      {
        service,
        originalError: originalError?.message,
      }
    );
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, originalError?: Error) {
    super(
      message,
      500,
      true,
      {
        operation,
        originalError: originalError?.message,
      }
    );
  }
}

/**
 * LLM Error
 */
export class LLMError extends AppError {
  constructor(
    provider: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${provider} error: ${message}`,
      500,
      true,
      { provider, ...context }
    );
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      408,
      true,
      { operation, timeout }
    );
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends AppError {
  constructor(message: string, config?: string) {
    super(
      message,
      500,
      false, // Not operational - requires code fix
      { config }
    );
  }
}

/**
 * Error Handler Utility
 */
export class ErrorHandler {
  /**
   * Check if error is operational (expected) or programming error
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Format error for API response
   */
  static formatError(error: Error): {
    message: string;
    statusCode: number;
    context?: Record<string, unknown>;
  } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        context: error.context,
      };
    }

    // Unknown error - don't expose details
    return {
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: Error, logger?: any): void {
    const isOperational = this.isOperationalError(error);

    if (logger) {
      if (isOperational) {
        logger.warn('Operational error', { error });
      } else {
        logger.error('Programming error', { error });
      }
    } else {
      console.error(isOperational ? 'Operational error:' : 'Programming error:', error);
    }
  }
}

/**
 * Error Utilities
 */
export function wrapError(
  fn: Function,
  errorClass: typeof AppError = AppError
): (...args: any[]) => Promise<any> {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new errorClass(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        false,
        { originalError: error }
      );
    }
  };
}

/**
 * Async error boundary
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  fallback?: (error: Error) => T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (fallback && error instanceof Error) {
      return fallback(error);
    }
    return undefined;
  }
}
