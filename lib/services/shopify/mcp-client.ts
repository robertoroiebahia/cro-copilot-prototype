/**
 * Shopify MCP Client
 *
 * Handles connection to Shopify via Model Context Protocol (MCP)
 * Uses the official Shopify MCP server to access store data
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ShopifyMCPConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyOrder {
  id: string;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  line_items: Array<{
    id: string;
    product_id: string;
    variant_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address: any;
  billing_address: any;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
  }>;
}

/**
 * Create and configure Shopify MCP client
 */
export class ShopifyMCPClient {
  private client: Client | null = null;
  private config: ShopifyMCPConfig;

  constructor(config: ShopifyMCPConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2024-01',
    };
  }

  /**
   * Initialize MCP connection to Shopify
   */
  async connect(): Promise<void> {
    // Create MCP client
    this.client = new Client({
      name: 'cro-copilot-shopify',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    // Create transport for Shopify MCP server
    // Note: In production, you'd configure this based on your MCP server setup
    // For now, we'll use a stub that needs to be configured
    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y',
        '@shopify/dev-mcp',
        '--shop', this.config.shopDomain,
        '--token', this.config.accessToken,
      ],
    });

    await this.client.connect(transport);
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Fetch orders from Shopify via MCP
   *
   * @param params Query parameters (limit, created_at_min, etc.)
   * @returns Array of Shopify orders
   */
  async getOrders(params?: {
    limit?: number;
    created_at_min?: string;
    created_at_max?: string;
    status?: 'open' | 'closed' | 'cancelled' | 'any';
  }): Promise<ShopifyOrder[]> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      limit: String(params?.limit || 250),
      status: params?.status || 'any',
      ...(params?.created_at_min && { created_at_min: params.created_at_min }),
      ...(params?.created_at_max && { created_at_max: params.created_at_max }),
    });

    // Use MCP tool to fetch orders
    const result = await this.client.callTool({
      name: 'shopify_admin_api_call',
      arguments: {
        endpoint: `orders.json?${queryParams.toString()}`,
        method: 'GET',
      },
    });

    if (!result.content || result.content.length === 0) {
      throw new Error('No response from Shopify MCP server');
    }

    // Parse response
    const responseText = result.content[0]?.text || '{}';
    const parsed = JSON.parse(responseText);
    return parsed.orders || [];
  }

  /**
   * Fetch products from Shopify via MCP
   */
  async getProducts(params?: {
    limit?: number;
    product_type?: string;
  }): Promise<ShopifyProduct[]> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    const queryParams = new URLSearchParams({
      limit: String(params?.limit || 250),
      ...(params?.product_type && { product_type: params.product_type }),
    });

    const result = await this.client.callTool({
      name: 'shopify_admin_api_call',
      arguments: {
        endpoint: `products.json?${queryParams.toString()}`,
        method: 'GET',
      },
    });

    if (!result.content || result.content.length === 0) {
      throw new Error('No response from Shopify MCP server');
    }

    const responseText = result.content[0]?.text || '{}';
    const parsed = JSON.parse(responseText);
    return parsed.products || [];
  }

  /**
   * Get store information
   */
  async getShopInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    const result = await this.client.callTool({
      name: 'shopify_admin_api_call',
      arguments: {
        endpoint: 'shop.json',
        method: 'GET',
      },
    });

    if (!result.content || result.content.length === 0) {
      throw new Error('No response from Shopify MCP server');
    }

    const responseText = result.content[0]?.text || '{}';
    const parsed = JSON.parse(responseText);
    return parsed.shop || null;
  }
}

/**
 * Factory function to create and connect Shopify MCP client
 */
export async function createShopifyMCPClient(
  config: ShopifyMCPConfig
): Promise<ShopifyMCPClient> {
  const client = new ShopifyMCPClient(config);
  await client.connect();
  return client;
}
