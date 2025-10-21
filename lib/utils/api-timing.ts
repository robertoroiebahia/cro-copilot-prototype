/**
 * API Response Time Monitoring
 * Tracks and logs slow API endpoints
 */

import { logger } from './logger';
import { trackWarning, trackCriticalError } from './error-tracker';

export interface TimingMetrics {
  route: string;
  method: string;
  duration: number;
  status: number;
  userId?: string;
  timestamp: Date;
}

class APITimingMonitor {
  private metrics: TimingMetrics[] = [];
  private readonly maxMetrics = 10000;
  private readonly slowThreshold = 2000; // 2 seconds
  private readonly verySlowThreshold = 5000; // 5 seconds

  /**
   * Record API timing
   */
  record(metrics: TimingMetrics): void {
    this.metrics.push(metrics);

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow requests
    if (metrics.duration > this.verySlowThreshold) {
      trackCriticalError(`Very slow API response: ${metrics.route}`, {
        ...metrics,
        threshold: this.verySlowThreshold,
      });
    } else if (metrics.duration > this.slowThreshold) {
      trackWarning(`Slow API response: ${metrics.route}`, {
        ...metrics,
        threshold: this.slowThreshold,
      });
    }

    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`API ${metrics.method} ${metrics.route}`, {
        duration: `${metrics.duration}ms`,
        status: metrics.status,
      });
    }
  }

  /**
   * Get slow requests
   */
  getSlowRequests(threshold: number = this.slowThreshold): TimingMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  /**
   * Get statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        slowRequests: 0,
        verySlowRequests: 0,
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / this.metrics.length;

    return {
      total: this.metrics.length,
      avgDuration: Math.round(avgDuration),
      slowRequests: this.metrics.filter(m => m.duration > this.slowThreshold).length,
      verySlowRequests: this.metrics.filter(m => m.duration > this.verySlowThreshold).length,
      byRoute: this.getRouteStats(),
    };
  }

  /**
   * Get statistics by route
   */
  private getRouteStats() {
    const byRoute = new Map<string, { count: number; totalDuration: number }>();

    this.metrics.forEach(m => {
      const existing = byRoute.get(m.route) || { count: 0, totalDuration: 0 };
      byRoute.set(m.route, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + m.duration,
      });
    });

    return Array.from(byRoute.entries())
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10); // Top 10 slowest routes
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(maxAgeMs: number = 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }
}

// Singleton instance
export const apiTimingMonitor = new APITimingMonitor();

// Cleanup every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    apiTimingMonitor.clearOldMetrics();
  }, 60 * 60 * 1000);
}

/**
 * Timing wrapper for API route handlers
 */
export function withTiming<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  route: string
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    const request = args[0] as Request;
    const method = request.method;

    try {
      const response = await handler(...args);
      const duration = Date.now() - start;

      apiTimingMonitor.record({
        route,
        method,
        duration,
        status: response.status,
        timestamp: new Date(),
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      apiTimingMonitor.record({
        route,
        method,
        duration,
        status: 500,
        timestamp: new Date(),
      });

      throw error;
    }
  }) as T;
}

/**
 * Simple timing helper
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`Slow operation: ${label}`, { duration: `${duration}ms` });
    } else {
      logger.debug(`Operation: ${label}`, { duration: `${duration}ms` });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Failed operation: ${label}`, error as Error, { duration: `${duration}ms` });
    throw error;
  }
}
