import { NextResponse } from 'next/server';
import { getGA4Properties } from '@/lib/services/google-analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/google-analytics/properties
 *
 * Get list of Google Analytics 4 properties for the authenticated user
 */
export async function GET() {
  try {
    const properties = await getGA4Properties();

    return NextResponse.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('Failed to fetch GA4 properties:', error);

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
      { error: 'Failed to fetch Google Analytics properties', details: errorMessage },
      { status: 500 }
    );
  }
}
