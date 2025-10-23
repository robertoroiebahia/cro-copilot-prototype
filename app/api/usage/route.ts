import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get workspace ID from query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // Get current period (YYYY-MM format)
    const currentPeriod = new Date().toISOString().slice(0, 7);

    // Fetch usage data for current period
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('period', currentPeriod)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is fine
      console.error('Error fetching usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    // Return usage data or empty defaults
    const usageData = usage || {
      analyses_count: 0,
      insights_count: 0,
      themes_count: 0,
      hypotheses_count: 0,
      experiments_count: 0,
      analyses_by_type: {
        page_analysis: 0,
        ga4_analysis: 0,
        survey_analysis: 0,
        review_mining: 0,
        onsite_poll: 0,
        heatmap_analysis: 0,
        user_testing: 0,
        other: 0,
      },
    };

    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Unexpected error in usage API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
