/**
 * Error Tracking Utility
 * Structured error logging for beta monitoring
 * Can be upgraded to Sentry/LogRocket later
 */

import { logger } from './logger';

export interface ErrorContext {
  userId?: string;
  workspaceId?: string;
  analysisId?: string;
  url?: string;
  apiRoute?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface TrackedError {
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  private readonly maxErrors = 1000; // Keep last 1000 errors in memory

  /**
   * Track an error
   */
  track(
    error: Error | string,
    severity: TrackedError['severity'] = 'medium',
    context?: ErrorContext
  ): void {
    const trackedError: TrackedError = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      timestamp: new Date(),
      severity,
    };

    // Add to in-memory store
    this.errors.push(trackedError);

    // Keep only last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console with appropriate level
    const logContext = {
      ...context,
      severity,
      errorType: typeof error === 'object' ? error.constructor.name : 'Error',
    };

    if (severity === 'critical' || severity === 'high') {
      logger.error(trackedError.message, error instanceof Error ? error : undefined, logContext);
    } else {
      logger.warn(trackedError.message, logContext);
    }

    // In production, you would send to external service here
    if (process.env.NODE_ENV === 'production' && (severity === 'critical' || severity === 'high')) {
      // TODO: Send to Sentry/LogRocket/Custom endpoint
      this.sendToExternalService(trackedError);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): TrackedError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: TrackedError['severity']): TrackedError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get error statistics
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentErrors = this.errors.filter(e => e.timestamp.getTime() > oneHourAgo);
    const last24Hours = this.errors.filter(e => e.timestamp.getTime() > oneDayAgo);

    return {
      total: this.errors.length,
      lastHour: recentErrors.length,
      last24Hours: last24Hours.length,
      bySeverity: {
        critical: this.getErrorsBySeverity('critical').length,
        high: this.getErrorsBySeverity('high').length,
        medium: this.getErrorsBySeverity('medium').length,
        low: this.getErrorsBySeverity('low').length,
      },
    };
  }

  /**
   * Clear old errors (call periodically)
   */
  clearOldErrors(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.errors = this.errors.filter(e => e.timestamp.getTime() > cutoff);
  }

  /**
   * Send to external service (placeholder)
   */
  private sendToExternalService(error: TrackedError): void {
    // TODO: Implement when Sentry is added
    // For now, just log that we would send it
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ErrorTracker] Would send to external service:', error.message);
    }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Cleanup old errors every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    errorTracker.clearOldErrors();
  }, 60 * 60 * 1000);
}

/**
 * Convenience functions
 */
export function trackError(error: Error | string, context?: ErrorContext): void {
  errorTracker.track(error, 'medium', context);
}

export function trackCriticalError(error: Error | string, context?: ErrorContext): void {
  errorTracker.track(error, 'critical', context);
}

export function trackWarning(message: string, context?: ErrorContext): void {
  errorTracker.track(message, 'low', context);
}
