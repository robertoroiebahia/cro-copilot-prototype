import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import {
  getFunnelInsights,
  getInsightsByType,
  getCriticalInsights,
  generateFunnelInsights,
} from '@/lib/services/analytics/ga4/funnel-insights';

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
 * GET /api/ga4/insights?workspaceId=xxx&type=gap_analysis&limit=20
 *
 * Get funnel insights
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get('workspaceId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const critical = searchParams.get('critical') === 'true';

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

    let insights;

    if (critical) {
      insights = await getCriticalInsights(workspaceId);
    } else if (type) {
      insights = await getInsightsByType(workspaceId, type as any);
    } else {
      insights = await getFunnelInsights(workspaceId, limit);
    }

    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ga4/insights
 *
 * Generate new insights
 *
 * Body:
 * {
 *   workspaceId: string (required),
 *   startDate: "YYYY-MM-DD",
 *   endDate: "YYYY-MM-DD"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { workspaceId, startDate, endDate } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
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

    const result = await generateFunnelInsights(workspaceId, startDate, endDate);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      insightsCount: result.insightsCount,
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
