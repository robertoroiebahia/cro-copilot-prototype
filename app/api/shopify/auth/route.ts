/**
 * Shopify OAuth - Initiate Authorization
 *
 * GET /api/shopify/auth?shop=mystore.myshopify.com&workspaceId=xxx
 *
 * Step 1 of OAuth flow:
 * 1. User provides shop domain
 * 2. Generate state token for CSRF protection
 * 3. Store state + workspace in session
 * 4. Redirect to Shopify authorization page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeShopDomain, isValidShopDomain, getShopifyApi } from '@/lib/services/shopify/oauth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    // Get parameters
    const { searchParams } = new URL(request.url);
    const shopParam = searchParams.get('shop');
    const workspaceId = searchParams.get('workspaceId');

    if (!shopParam || !workspaceId) {
      return NextResponse.redirect(
        new URL('/analyze?error=missing_parameters', request.url)
      );
    }

    // Verify user has access to workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace || workspace.user_id !== user.id) {
      return NextResponse.redirect(
        new URL('/analyze?error=workspace_access_denied', request.url)
      );
    }

    // Normalize and validate shop domain
    const shop = normalizeShopDomain(shopParam);

    if (!isValidShopDomain(shop)) {
      return NextResponse.redirect(
        new URL('/analyze?error=invalid_shop_domain', request.url)
      );
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state and workspace in database for verification in callback
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    await supabase.from('oauth_states').insert({
      state,
      user_id: user.id,
      workspace_id: workspaceId,
      provider: 'shopify',
      shop_domain: shop,
      expires_at: expiresAt.toISOString(),
    });

    // Get Shopify API client
    const shopify = getShopifyApi();

    // Generate authorization URL
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: '/api/shopify/callback',
      isOnline: false, // Offline token for server-to-server
    });

    // Append state to auth URL
    const fullAuthUrl = `${authUrl}&state=${state}`;

    console.log(`Redirecting to Shopify OAuth for shop: ${shop}`);

    // Redirect to Shopify
    return NextResponse.redirect(fullAuthUrl);
  } catch (error) {
    console.error('Shopify auth initiation error:', error);
    return NextResponse.redirect(
      new URL(
        `/analyze?error=${encodeURIComponent('oauth_failed')}`,
        request.url
      )
    );
  }
}
