/**
 * Shopify AOV Analysis API
 *
 * POST /api/shopify/analyze - Run AOV analysis + generate AI insights
 * GET /api/shopify/analyze - Get existing analysis results
 *
 * Follows the universal analysis pattern:
 * Data → Statistical Analysis → AI Insights → Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { runAOVAnalysis, saveAnalysisResults } from '@/lib/services/shopify/aov-analysis';
import { generateShopifyInsights } from '@/lib/services/shopify/shopify-insights';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST - Run new AOV analysis with AI insights
 *
 * This endpoint follows the standard analysis pattern:
 * 1. Run statistical analysis (AOV, clustering, affinity)
 * 2. Generate AI insights from the data
 * 3. Store everything in the database
 * 4. Return results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate input
    const body = await request.json();
    const { workspaceId, connectionId, dateRange, minConfidence } = body;

    if (!workspaceId || !connectionId) {
      return NextResponse.json(
        { error: 'workspaceId and connectionId are required' },
        { status: 400 }
      );
    }

    // 3. Verify workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      console.error('[Shopify Analyze] Workspace access denied:', workspaceError);
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // 4. Verify Shopify connection exists
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Shopify connection not found' },
        { status: 404 }
      );
    }

    console.log('[Shopify Analyze] Starting analysis for workspace:', workspaceId);

    // 5. Run statistical analysis (AOV, clustering, affinity)
    const analysisData = await runAOVAnalysis(workspaceId, connectionId, {
      dateRange,
      minConfidence: minConfidence || 0.3,
    });

    // Add shop domain to summary for AI context
    (analysisData.summary as any).shopDomain = connection.shop_domain;

    // 6. Generate AI insights from analysis data
    console.log('[Shopify Analyze] Generating AI insights...');
    const insightResult = await generateShopifyInsights(
      user.id,
      workspaceId,
      connectionId,
      analysisData
    );

    // 7. Save detailed analysis results to specialized tables
    // (Optional: for querying specific clusters/affinities later)
    await saveAnalysisResults(
      workspaceId,
      connectionId,
      insightResult.analysisId,
      analysisData
    );

    console.log('[Shopify Analyze] Analysis completed successfully');
    console.log(`[Shopify Analyze] Generated ${insightResult.insightCount} insights`);

    // 8. Return results
    return NextResponse.json({
      success: true,
      analysisId: insightResult.analysisId,
      insights: insightResult.insights,
      insightCount: insightResult.insightCount,
      summary: insightResult.summary,
      // Also include raw analysis data for immediate display
      analysisData: {
        clusters: analysisData.clusters,
        productAffinities: analysisData.productAffinities,
        opportunities: analysisData.opportunities,
      },
    });
  } catch (error: any) {
    console.error('[Shopify Analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve existing analysis results
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const connectionId = searchParams.get('connectionId');
    const analysisId = searchParams.get('analysisId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify workspace access
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

    // If specific analysis ID requested
    if (analysisId) {
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('workspace_id', workspaceId)
        .eq('research_type', 'shopify_order_analysis')
        .single();

      if (analysisError || !analysis) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }

      // Fetch AI-generated insights
      const { data: insights, error: insightsError } = await supabase
        .from('insights')
        .select('*')
        .eq('analysis_id', analysisId)
        .eq('workspace_id', workspaceId)
        .order('priority', { ascending: true }); // Show critical/high first

      // Fetch detailed results from specialized tables (optional)
      const [clustersResult, affinitiesResult, opportunitiesResult] = await Promise.all([
        supabase
          .from('order_clusters')
          .select('*')
          .eq('analysis_id', analysisId),
        supabase
          .from('product_affinity')
          .select('*')
          .eq('analysis_id', analysisId),
        supabase
          .from('aov_opportunities')
          .select('*')
          .eq('analysis_id', analysisId),
      ]);

      return NextResponse.json({
        analysis,
        insights: insights || [],
        insightCount: insights?.length || 0,
        // Raw analysis data (optional, for additional context)
        clusters: clustersResult.data || [],
        productAffinities: affinitiesResult.data || [],
        opportunities: opportunitiesResult.data || [],
      });
    }

    // Otherwise, fetch all analyses for workspace/connection
    let query = supabase
      .from('analyses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('research_type', 'shopify_order_analysis')
      .order('created_at', { ascending: false });

    if (connectionId) {
      query = query.eq('input_data->>connectionId', connectionId);
    }

    const { data: analyses, error: analysesError } = await query.limit(10);

    if (analysesError) {
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ analyses: analyses || [] });
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
