import { NextRequest, NextResponse } from 'next/server';
import { runGA4Report } from '@/lib/services/google-analytics';

export const dynamic = 'force-dynamic';

/**
 * POST /api/google-analytics/report
 *
 * Run a custom GA4 report
 *
 * Body:
 * {
 *   propertyId: string,
 *   startDate: string (YYYY-MM-DD),
 *   endDate: string (YYYY-MM-DD),
 *   metrics: string[],
 *   dimensions?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, startDate, endDate, metrics, dimensions } = body;

    // Validate required fields
    if (!propertyId || !startDate || !endDate || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, startDate, endDate, metrics' },
        { status: 400 }
      );
    }

    const report = await runGA4Report(
      propertyId,
      { startDate, endDate },
      metrics,
      dimensions
    );

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Failed to run GA4 report:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('No active session')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('No Google OAuth token')) {
      return NextResponse.json(
        { error: 'Google Analytics access not granted. Please sign in with Google.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to run Google Analytics report', details: errorMessage },
      { status: 500 }
    );
  }
}
