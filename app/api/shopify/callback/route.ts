/**
 * Shopify OAuth - Authorization Callback
 *
 * GET /api/shopify/callback?code=xxx&shop=xxx&state=xxx
 *
 * Step 2 of OAuth flow:
 * 1. Shopify redirects back with code + state
 * 2. Verify state token (CSRF protection)
 * 3. Exchange code for access token
 * 4. Fetch shop info
 * 5. Store encrypted token in database
 * 6. Redirect to success page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getShopifyApi, normalizeShopDomain } from '@/lib/services/shopify/oauth';
import { encrypt } from '@/lib/utils/encryption';
import { createShopifyMCPClient } from '@/lib/services/shopify/mcp-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get parameters from Shopify callback
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shopParam = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    // Validate required parameters
    if (!code || !shopParam || !state) {
      console.error('Missing OAuth callback parameters');
      return NextResponse.redirect(
        new URL('/analyze?error=oauth_callback_missing_params', request.url)
      );
    }

    // Normalize shop domain
    const shop = normalizeShopDomain(shopParam);

    // Verify state token exists and is valid
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('shop_domain', shop)
      .eq('provider', 'shopify')
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid or expired OAuth state');
      return NextResponse.redirect(
        new URL('/analyze?error=oauth_invalid_state', request.url)
      );
    }

    // Check if state has expired
    const expiresAt = new Date(oauthState.expires_at);
    if (expiresAt < new Date()) {
      console.error('OAuth state expired');
      await supabase.from('oauth_states').delete().eq('state', state);
      return NextResponse.redirect(
        new URL('/analyze?error=oauth_state_expired', request.url)
      );
    }

    const userId = oauthState.user_id;
    const workspaceId = oauthState.workspace_id;

    // Exchange code for access token manually
    console.log(`Exchanging OAuth code for access token: ${shop}`);
    const shopify = getShopifyApi();

    let accessToken;
    try {
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: shopify.config.apiKey,
          client_secret: shopify.config.apiSecretKey,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      if (!accessToken) {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('Failed to exchange OAuth code:', error);
      return NextResponse.redirect(
        new URL('/analyze?error=oauth_token_exchange_failed', request.url)
      );
    }

    // Fetch shop information using the new access token
    console.log('Fetching shop information...');
    let shopInfo;
    try {
      const mcpClient = await createShopifyMCPClient({
        shopDomain: shop,
        accessToken: accessToken,
      });

      try {
        shopInfo = await mcpClient.getShopInfo();
      } finally {
        await mcpClient.disconnect();
      }
    } catch (error) {
      console.error('Failed to fetch shop info:', error);
      // Continue anyway - we'll use basic info
      shopInfo = {
        name: shop.replace('.myshopify.com', ''),
        currency: 'USD',
      };
    }

    // Encrypt access token
    const encryptedToken = encrypt(session.accessToken);

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('shopify_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('shop_domain', shop)
      .single();

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('shopify_connections')
        .update({
          access_token_encrypted: encryptedToken,
          shop_name: shopInfo?.name || shop,
          shop_email: shopInfo?.email || null,
          currency: shopInfo?.currency || 'USD',
          timezone: shopInfo?.iana_timezone || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);

      console.log(`Updated existing Shopify connection: ${shop}`);
    } else {
      // Create new connection
      await supabase
        .from('shopify_connections')
        .insert({
          workspace_id: workspaceId,
          shop_domain: shop,
          access_token_encrypted: encryptedToken,
          shop_name: shopInfo?.name || shop,
          shop_email: shopInfo?.email || null,
          currency: shopInfo?.currency || 'USD',
          timezone: shopInfo?.iana_timezone || null,
          is_active: true,
        });

      console.log(`Created new Shopify connection: ${shop}`);
    }

    // Delete used state token
    await supabase.from('oauth_states').delete().eq('state', state);

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/analyze/shopify-orders?workspaceId=${workspaceId}&connected=true`,
        request.url
      )
    );
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/analyze?error=${encodeURIComponent('oauth_callback_failed')}`,
        request.url
      )
    );
  }
}
