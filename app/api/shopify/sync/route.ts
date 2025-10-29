/**
 * Shopify Order Sync API
 *
 * POST /api/shopify/sync
 * Triggers order sync from Shopify via MCP
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncShopifyOrders } from '@/lib/services/shopify/order-sync';
import { decrypt } from '@/lib/utils/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workspaceId, connectionId, dateRange, limit } = body;

    if (!workspaceId || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, connectionId' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace || workspace.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // Get Shopify connection details
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

    if (!connection.is_active) {
      return NextResponse.json(
        { error: 'Shopify connection is inactive' },
        { status: 400 }
      );
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decrypt(connection.access_token_encrypted);
    } catch (decryptError) {
      console.error('Failed to decrypt access token:', decryptError);
      return NextResponse.json(
        {
          error: 'Failed to decrypt access token. Please reconnect your Shopify store.',
          details: decryptError instanceof Error ? decryptError.message : 'Decryption failed'
        },
        { status: 500 }
      );
    }

    // Sync orders
    console.log(`Starting Shopify order sync for workspace ${workspaceId}...`);
    const result = await syncShopifyOrders({
      workspaceId,
      connectionId,
      shopDomain: connection.shop_domain,
      accessToken,
      dateRange,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Order sync completed with errors',
          details: result.errors,
          partialResult: {
            ordersSynced: result.ordersSynced,
            ordersFetched: result.ordersFetched,
          },
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Orders synced successfully',
      result: {
        ordersSynced: result.ordersSynced,
        ordersFetched: result.ordersFetched,
        summary: result.summary,
      },
    });
  } catch (error) {
    console.error('Shopify sync error:', error);

    // Log stack trace for debugging
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify/sync?workspaceId=xxx
 * Get sync status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get workspaceId from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId parameter' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace || workspace.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // Get Shopify connections
    const { data: connections, error: connectionsError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (connectionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    // Get order statistics
    const { count: orderCount } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // Get latest analysis
    const { data: latestAnalysis } = await supabase
      .from('analyses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('research_type', 'shopify_order_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      connections: connections || [],
      orderCount: orderCount || 0,
      latestAnalysis: latestAnalysis || null,
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
