/**
 * Subscription API
 * GET /api/subscription - Get current user's subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Try to get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('user_subscription_details')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // If no subscription found, return default free plan
    if (!subscription) {
      return NextResponse.json({
        user_id: user.id,
        plan_id: 'free',
        plan_name: 'Free',
        status: 'active',
        features: {
          page_analysis: true,
          ga4_analysis: true,
          survey_analysis: false,
          review_mining: false,
          onsite_poll: false,
          heatmap_analysis: false,
          user_testing: false,
          manual_insights: false,
          edit_themes: false,
          edit_hypotheses: false,
          csv_export: false,
          api_access: false,
          white_label: false,
          priority_support: false,
        },
        limits: {
          analyses_per_month: 5,
          insights_max: 50,
          themes_max: 10,
          hypotheses_max: 5,
          experiments_per_month: 2,
          workspaces_max: 1,
          team_members_max: 1,
          data_retention_days: 7,
        },
      });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Unexpected error in subscription API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
