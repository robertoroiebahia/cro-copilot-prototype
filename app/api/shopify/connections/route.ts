/**
 * Shopify Connections API
 *
 * Manage Shopify store connections for a workspace
 *
 * POST /api/shopify/connections - Create new connection
 * GET  /api/shopify/connections?workspaceId=xxx - List connections
 * PUT  /api/shopify/connections - Update connection
 * DELETE /api/shopify/connections?id=xxx - Delete connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { createShopifyMCPClient } from '@/lib/services/shopify/mcp-client';

/**
 * GET - List Shopify connections for a workspace
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

    // Get connections (without decrypted tokens)
    const { data: connections, error: connectionsError } = await supabase
      .from('shopify_connections')
      .select('id, shop_domain, shop_name, currency, timezone, is_active, last_sync_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (connectionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    });
  } catch (error) {
    console.error('Get connections error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new Shopify connection
 */
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
    const { workspaceId, shopDomain, accessToken } = body;

    if (!workspaceId || !shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, shopDomain, accessToken' },
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

    // Validate Shopify credentials by fetching shop info
    console.log('Validating Shopify credentials...');
    let shopInfo;
    try {
      const mcpClient = await createShopifyMCPClient({
        shopDomain,
        accessToken,
      });

      try {
        shopInfo = await mcpClient.getShopInfo();
      } finally {
        await mcpClient.disconnect();
      }
    } catch (error) {
      console.error('Shopify validation error:', error);
      return NextResponse.json(
        {
          error: 'Invalid Shopify credentials',
          details: error instanceof Error ? error.message : 'Could not connect to Shopify store',
        },
        { status: 400 }
      );
    }

    // Encrypt access token
    const encryptedToken = encrypt(accessToken);

    // Create connection
    const { data: connection, error: insertError } = await supabase
      .from('shopify_connections')
      .insert({
        workspace_id: workspaceId,
        shop_domain: shopDomain,
        access_token_encrypted: encryptedToken,
        shop_name: shopInfo?.name || shopDomain,
        shop_email: shopInfo?.email || null,
        currency: shopInfo?.currency || 'USD',
        timezone: shopInfo?.iana_timezone || null,
        is_active: true,
      })
      .select('id, shop_domain, shop_name, currency, is_active, created_at')
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A connection for this shop already exists in this workspace' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create connection', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify connection created successfully',
      connection,
    });
  } catch (error) {
    console.error('Create connection error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update Shopify connection
 */
export async function PUT(request: NextRequest) {
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
    const { connectionId, workspaceId, isActive, accessToken } = body;

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId, workspaceId' },
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

    // Build update object
    const updates: any = {};

    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
    }

    if (accessToken) {
      // Validate new token if provided
      const { data: connection } = await supabase
        .from('shopify_connections')
        .select('shop_domain')
        .eq('id', connectionId)
        .single();

      if (!connection) {
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }

      // Validate credentials
      try {
        const mcpClient = await createShopifyMCPClient({
          shopDomain: connection.shop_domain,
          accessToken,
        });

        try {
          await mcpClient.getShopInfo();
        } finally {
          await mcpClient.disconnect();
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid Shopify credentials' },
          { status: 400 }
        );
      }

      updates.access_token_encrypted = encrypt(accessToken);
    }

    // Update connection
    const { data: updated, error: updateError } = await supabase
      .from('shopify_connections')
      .update(updates)
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .select('id, shop_domain, shop_name, is_active')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection updated successfully',
      connection: updated,
    });
  } catch (error) {
    console.error('Update connection error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove Shopify connection
 */
export async function DELETE(request: NextRequest) {
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

    // Get params
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, workspaceId' },
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

    // Delete connection (cascade will delete related orders)
    const { error: deleteError } = await supabase
      .from('shopify_connections')
      .delete()
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    console.error('Delete connection error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
