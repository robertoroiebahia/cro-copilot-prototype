import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { getLatestGA4Analysis } from '@/lib/services/ga4/ga4-analysis';

export const dynamic = 'force-dynamic';

/**
 * Verify user owns workspace
 */
async function verifyWorkspaceOwnership(workspaceId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

/**
 * GET /api/ga4/funnels?workspaceId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&segment=all_users
 *
 * Get funnel data from latest GA4 analysis
 * Note: Ignores startDate/endDate params, returns latest analysis
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get('workspaceId');
    const segment = searchParams.get('segment');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify user owns this workspace
    const ownsWorkspace = await verifyWorkspaceOwnership(workspaceId, user.id);
    if (!ownsWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // Get latest GA4 analysis
    const analysis = await getLatestGA4Analysis(workspaceId);

    if (!analysis) {
      return NextResponse.json(
        { error: 'No GA4 analysis found. Click "Sync Data" to run an analysis.' },
        { status: 404 }
      );
    }

    // Extract funnel data from analysis.metrics
    const funnels = analysis.metrics?.funnels || [];

    // If specific segment requested, filter
    if (segment) {
      const funnel = funnels.find((f: any) =>
        f.segment_label.toLowerCase().replace(/\s+/g, '_') === segment.toLowerCase()
      );

      if (!funnel) {
        return NextResponse.json(
          { error: 'Funnel not found for this segment' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        funnel,
        segment,
        analysisId: analysis.id,
        dateRange: analysis.metrics?.date_range,
      });
    }

    // Return all funnels for segment comparison
    if (funnels.length === 0) {
      return NextResponse.json(
        { error: 'No funnel data in analysis' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      funnel: funnels[0], // Main funnel for single view
      funnels: funnels,   // All funnels for segment comparison
      analysisId: analysis.id,
      dateRange: analysis.metrics?.date_range,
    });
  } catch (error) {
    console.error('Get funnels error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
