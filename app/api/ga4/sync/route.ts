import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { syncGA4Data, syncInitialData, syncDailyData } from '@/lib/services/ga4/ga4-sync';
import { calculateStandardFunnels } from '@/lib/services/ga4/funnel-calculator';
import { generateFunnelInsights } from '@/lib/services/ga4/funnel-insights';

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
 * POST /api/ga4/sync
 *
 * Sync GA4 data and calculate funnels
 *
 * Body:
 * {
 *   workspaceId: string (required),
 *   type: "initial" | "daily" | "custom",
 *   startDate?: "YYYY-MM-DD",
 *   endDate?: "YYYY-MM-DD",
 *   generateInsights?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const {
      workspaceId,
      type = 'daily',
      startDate,
      endDate,
      generateInsights = false,
    } = body;

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

    let syncResult;

    // Sync data based on type
    if (type === 'initial') {
      syncResult = await syncInitialData(workspaceId);
    } else if (type === 'daily') {
      syncResult = await syncDailyData(workspaceId);
    } else if (type === 'custom' && startDate && endDate) {
      syncResult = await syncGA4Data(workspaceId, startDate, endDate);
    } else {
      return NextResponse.json(
        { error: 'Invalid sync type or missing dates' },
        { status: 400 }
      );
    }

    if (!syncResult.success) {
      return NextResponse.json(
        { error: syncResult.error || 'Sync failed' },
        { status: 500 }
      );
    }

    // Calculate funnels for standard date ranges
    const funnelResults = await calculateStandardFunnels(workspaceId);

    // Generate insights if requested
    let insightsResult;
    if (generateInsights) {
      // Generate for last 30 days
      const endDate = new Date().toISOString().split('T')[0]!;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;

      insightsResult = await generateFunnelInsights(workspaceId, startDate, endDate);
    }

    return NextResponse.json({
      success: true,
      sync: syncResult,
      funnels: funnelResults,
      insights: insightsResult,
    });
  } catch (error) {
    console.error('GA4 sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
