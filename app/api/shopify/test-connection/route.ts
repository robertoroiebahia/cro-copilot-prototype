/**
 * Shopify Connection Test API
 *
 * Tests if the Shopify connection has proper scopes and access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decrypt } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get connection ID from query
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const workspaceId = searchParams.get('workspaceId');

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing connectionId or workspaceId' },
        { status: 400 }
      );
    }

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Decrypt token
    let accessToken: string;
    try {
      accessToken = decrypt(connection.access_token_encrypted);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Failed to decrypt access token',
        message: 'The stored token cannot be decrypted. Please reconnect your store.',
      });
    }

    // Test 1: Get shop info (requires no special scopes)
    const shopResponse = await fetch(
      `https://${connection.shop_domain}/admin/api/2024-10/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const tests: any = {
      shop: {
        endpoint: '/admin/api/2024-10/shop.json',
        status: shopResponse.status,
        success: shopResponse.ok,
        scopes_required: 'none',
      },
    };

    if (!shopResponse.ok) {
      const errorText = await shopResponse.text();
      tests.shop.error = errorText;
    } else {
      const shopData = await shopResponse.json();
      tests.shop.data = shopData;
    }

    // Test 2: Get orders (requires read_orders scope)
    const ordersResponse = await fetch(
      `https://${connection.shop_domain}/admin/api/2024-10/orders.json?limit=1`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    tests.orders = {
      endpoint: '/admin/api/2024-10/orders.json',
      status: ordersResponse.status,
      success: ordersResponse.ok,
      scopes_required: 'read_orders',
    };

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      tests.orders.error = errorText;
    } else {
      const ordersData = await ordersResponse.json();
      tests.orders.count = ordersData.orders?.length || 0;
    }

    // Test 3: Get products (requires read_products scope)
    const productsResponse = await fetch(
      `https://${connection.shop_domain}/admin/api/2024-10/products.json?limit=1`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    tests.products = {
      endpoint: '/admin/api/2024-10/products.json',
      status: productsResponse.status,
      success: productsResponse.ok,
      scopes_required: 'read_products',
    };

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      tests.products.error = errorText;
    } else {
      const productsData = await productsResponse.json();
      tests.products.count = productsData.products?.length || 0;
    }

    // Determine overall status
    const allPassed = tests.shop.success && tests.orders.success && tests.products.success;

    return NextResponse.json({
      success: allPassed,
      connection: {
        id: connection.id,
        shop_domain: connection.shop_domain,
        shop_name: connection.shop_name,
        is_active: connection.is_active,
      },
      tests,
      recommendation: allPassed
        ? 'All tests passed! Your connection is working correctly.'
        : 'Some tests failed. You may need to reinstall the app with proper scopes.',
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
