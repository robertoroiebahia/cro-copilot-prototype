/**
 * Shopify OAuth Service
 *
 * Handles OAuth flow for Shopify app installation
 */

import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

/**
 * Initialize Shopify API client
 */
export function getShopifyApi() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const hostName = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!apiKey || !apiSecret) {
    throw new Error('Missing Shopify API credentials. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET');
  }

  return shopifyApi({
    apiKey,
    apiSecretKey: apiSecret,
    scopes: [
      'read_orders',
      'read_products',
      'read_customers',
      'read_analytics',
    ],
    hostName: hostName.replace('https://', '').replace('http://', ''),
    apiVersion: ApiVersion.October24, // Use explicit API version
    isEmbeddedApp: false,
  });
}

/**
 * Begin OAuth flow - generate authorization URL
 *
 * @param shop - Shop domain (e.g., "mystore.myshopify.com")
 * @param state - Random state token for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export async function beginOAuth(shop: string, state: string): Promise<string> {
  const shopify = getShopifyApi();

  // Ensure shop has proper format
  const shopDomain = shop.includes('.myshopify.com')
    ? shop
    : `${shop}.myshopify.com`;

  const authRoute = await shopify.auth.begin({
    shop: shopDomain,
    callbackPath: '/api/shopify/callback',
    isOnline: false, // Offline access token for server-to-server
    rawRequest: {
      url: `/api/shopify/auth?shop=${shopDomain}&state=${state}`,
      method: 'GET',
      headers: {},
    },
    rawResponse: {
      statusCode: 302,
      headers: {},
    },
  });

  return authRoute;
}

/**
 * Complete OAuth flow - exchange code for access token
 *
 * @param shop - Shop domain
 * @param code - Authorization code from Shopify
 * @returns Session with access token
 */
export async function completeOAuth(
  shop: string,
  code: string,
  hostName: string
): Promise<Session> {
  const shopify = getShopifyApi();

  const shopDomain = shop.includes('.myshopify.com')
    ? shop
    : `${shop}.myshopify.com`;

  // Build callback URL
  const callbackUrl = `${hostName}/api/shopify/callback?shop=${shopDomain}&code=${code}`;

  const callback = await shopify.auth.callback({
    rawRequest: {
      url: callbackUrl,
      method: 'GET',
      headers: {},
    },
  });

  return callback.session;
}

/**
 * Verify Shopify HMAC signature
 *
 * @param query - Query parameters from Shopify callback
 * @returns True if signature is valid
 */
export async function verifyHmac(query: Record<string, string>): Promise<boolean> {
  const shopify = getShopifyApi();

  try {
    return await shopify.utils.validateHmac(query);
  } catch (error) {
    console.error('HMAC validation error:', error);
    return false;
  }
}

/**
 * Extract shop domain from request
 *
 * @param shopParam - Shop parameter from request
 * @returns Normalized shop domain
 */
export function normalizeShopDomain(shopParam: string): string {
  let shop = shopParam.toLowerCase().trim();

  // Remove protocol if present
  shop = shop.replace(/^https?:\/\//, '');

  // Ensure .myshopify.com suffix
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }

  // Remove trailing slash
  shop = shop.replace(/\/$/, '');

  return shop;
}

/**
 * Validate shop domain format
 *
 * @param shop - Shop domain to validate
 * @returns True if valid Shopify domain
 */
export function isValidShopDomain(shop: string): boolean {
  const shopify = getShopifyApi();

  try {
    return shopify.utils.sanitizeShop(shop, true) !== null;
  } catch {
    return false;
  }
}
