import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { getAllFunnels, getFunnel } from '@/lib/services/ga4/funnel-calculator';

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
 * Get calculated funnels for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get('workspaceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const segment = searchParams.get('segment');

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

    // Get specific segment or all
    if (segment) {
      const funnel = await getFunnel(workspaceId, segment as any, startDate, endDate);

      if (!funnel) {
        return NextResponse.json(
          { error: 'Funnel not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        funnel,
        segment,
      });
    } else {
      const funnels = await getAllFunnels(workspaceId, startDate, endDate);

      return NextResponse.json({
        success: true,
        funnels,
        count: funnels.length,
      });
    }
  } catch (error) {
    console.error('Get funnels error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
