/**
 * Shopify AOV Analysis API
 *
 * POST /api/shopify/analyze - Run AOV analysis on Shopify orders
 * GET /api/shopify/analyze - Get existing analysis results
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { runAOVAnalysis, saveAnalysisResults } from '@/lib/services/shopify/aov-analysis';

/**
 * POST - Run new AOV analysis
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { workspaceId, connectionId, dateRange, minConfidence } = body;

    if (!workspaceId || !connectionId) {
      return NextResponse.json(
        { error: 'workspaceId and connectionId are required' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      console.error('Workspace access denied:', workspaceError);
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // Verify connection exists
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

    // Run the analysis
    console.log('Starting AOV analysis for workspace:', workspaceId);
    const results = await runAOVAnalysis(workspaceId, connectionId, {
      dateRange,
      minConfidence: minConfidence || 0.3,
    });

    // Create analysis record
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        workspace_id: workspaceId,
        research_type: 'shopify_order_analysis',
        input_data: {
          connectionId,
          dateRange,
          shopDomain: connection.shop_domain,
        },
        summary: results.summary,
        insights: {
          clusters: results.clusters,
          productAffinities: results.productAffinities,
          opportunities: results.opportunities,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error creating analysis record:', analysisError);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      );
    }

    // Save detailed results to specialized tables
    await saveAnalysisResults(
      workspaceId,
      connectionId,
      analysisRecord.id,
      results
    );

    console.log('AOV analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysisId: analysisRecord.id,
      results,
    });
  } catch (error: any) {
    console.error('AOV analysis error:', error);
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

      // Fetch detailed results from specialized tables
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
