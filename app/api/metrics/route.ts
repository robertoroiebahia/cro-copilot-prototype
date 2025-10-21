/**
 * Metrics Endpoint
 * GET /api/metrics
 *
 * Returns performance metrics and error statistics
 * For internal monitoring only - requires auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiTimingMonitor } from '@/lib/utils/api-timing';
import { errorTracker } from '@/lib/utils/error-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    // Get timing statistics
    const timingStats = apiTimingMonitor.getStats();

    // Get error statistics
    const errorStats = errorTracker.getStats();

    // Get slow requests (last 100)
    const slowRequests = apiTimingMonitor.getSlowRequests(2000).slice(-100);

    // Get recent errors (last 50)
    const recentErrors = errorTracker.getRecentErrors(50).map(err => ({
      message: err.message,
      severity: err.severity,
      timestamp: err.timestamp,
      context: err.context,
      // Don't expose stack traces
    }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      timing: timingStats,
      errors: errorStats,
      slowRequests: slowRequests.map(req => ({
        route: req.route,
        method: req.method,
        duration: req.duration,
        status: req.status,
        timestamp: req.timestamp,
      })),
      recentErrors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Metrics unavailable' },
      { status: 500 }
    );
  }
}
