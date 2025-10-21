import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { runGA4Analysis } from '@/lib/services/analytics/ga4/ga4-analysis';

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
 * Run GA4 funnel analysis (treated as an analysis, not data sync)
 *
 * Body:
 * {
 *   workspaceId: string (required),
 *   type: "initial" | "daily" | "custom",
 *   startDate?: "YYYY-MM-DD",
 *   endDate?: "YYYY-MM-DD",
 *   generateInsights?: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const {
      workspaceId,
      type = 'daily',
      startDate: customStartDate,
      endDate: customEndDate,
      generateInsights = true,
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

    // Determine date range based on type
    let startDate: string;
    let endDate: string;

    if (type === 'initial') {
      // Last 90 days for initial analysis
      endDate = new Date().toISOString().split('T')[0]!;
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
    } else if (type === 'daily') {
      // Yesterday for daily analysis
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      startDate = yesterday.toISOString().split('T')[0]!;
      endDate = yesterday.toISOString().split('T')[0]!;
    } else if (type === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      return NextResponse.json(
        { error: 'Invalid sync type or missing dates' },
        { status: 400 }
      );
    }

    // Run GA4 analysis (fetches data, calculates funnels, stores as analysis, generates insights)
    const analysisResult = await runGA4Analysis(
      workspaceId,
      user.id,
      startDate,
      endDate,
      generateInsights
    );

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: analysisResult.error || 'Analysis failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysisId: analysisResult.analysisId,
      funnels: analysisResult.funnels,
      insights: analysisResult.insights,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('GA4 analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
