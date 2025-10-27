/**
 * Shopify Order Sync Service
 *
 * Fetches orders from Shopify REST API and stores them in database
 */

import { createClient } from '@/utils/supabase/server';

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

export interface OrderSyncOptions {
  workspaceId: string;
  connectionId: string;
  shopDomain: string;
  accessToken: string;
  dateRange?: {
    startDate?: string; // ISO 8601 format
    endDate?: string;   // ISO 8601 format
  };
  limit?: number;
}

export interface OrderSyncResult {
  success: boolean;
  orderssynced: number;
  ordersFetched: number;
  errors: string[];
  summary: {
    totalRevenue: number;
    avgOrderValue: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

/**
 * Sync orders from Shopify to database
 */
export async function syncShopifyOrders(
  options: OrderSyncOptions
): Promise<OrderSyncResult> {
  const supabase = createClient();
  const errors: string[] = [];
  let ordersSynced = 0;
  let ordersFetched = 0;

  try {
    // Fetch orders from Shopify REST API
    console.log('Fetching orders from Shopify...');

    const limit = options.limit || 250;
    const queryParams = new URLSearchParams({
      limit: String(limit),
      status: 'any',
    });

    if (options.dateRange?.startDate) {
      queryParams.append('created_at_min', options.dateRange.startDate);
    }
    if (options.dateRange?.endDate) {
      queryParams.append('created_at_max', options.dateRange.endDate);
    }

    const ordersResponse = await fetch(
      `https://${options.shopDomain}/admin/api/2024-10/orders.json?${queryParams.toString()}`,
      {
        headers: {
          'X-Shopify-Access-Token': options.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!ordersResponse.ok) {
      throw new Error(`Shopify API error: ${ordersResponse.statusText}`);
    }

    const ordersData = await ordersResponse.json();
    const orders: ShopifyOrder[] = ordersData.orders || [];

    ordersFetched = orders.length;
    console.log(`Fetched ${ordersFetched} orders from Shopify`);

      // Process and store each order
      for (const order of orders) {
        try {
          // Transform Shopify order to database format
          const orderRecord = transformShopifyOrder(order, options);

          // Upsert order (insert or update if exists)
          const { error: upsertError } = await supabase
            .from('shopify_orders')
            .upsert(orderRecord, {
              onConflict: 'workspace_id,shopify_order_id',
            });

          if (upsertError) {
            errors.push(`Failed to store order ${order.order_number}: ${upsertError.message}`);
          } else {
            ordersSynced++;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error processing order ${order.order_number}: ${errorMsg}`);
        }
      }

    // Calculate summary statistics
    const summary = calculateSummary(orders);

    // Update last sync timestamp
    await supabase
      .from('shopify_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', options.connectionId);

    return {
      success: errors.length === 0,
      ordersSynced,
      ordersFetched,
      errors,
      summary,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      ordersSynced,
      ordersFetched,
      errors: [errorMsg],
      summary: {
        totalRevenue: 0,
        avgOrderValue: 0,
        dateRange: {
          start: options.dateRange?.startDate || '',
          end: options.dateRange?.endDate || '',
        },
      },
    };
  }
}

/**
 * Transform Shopify order to database format
 */
function transformShopifyOrder(
  order: ShopifyOrder,
  options: OrderSyncOptions
): any {
  return {
    workspace_id: options.workspaceId,
    connection_id: options.connectionId,
    shopify_order_id: order.id,
    order_number: order.order_number,

    // Customer info
    customer_email: order.email,
    customer_id: order.customer?.id || null,
    customer_first_name: order.customer?.first_name || null,
    customer_last_name: order.customer?.last_name || null,

    // Order details
    total_price: parseFloat(order.total_price),
    subtotal_price: parseFloat(order.subtotal_price),
    total_tax: parseFloat(order.total_tax),
    total_discounts: 0, // Calculate from line items if needed
    shipping_price: 0, // Extract from shipping lines if needed
    currency: order.currency,

    // Status
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,

    // Line items as JSONB
    line_items: order.line_items.map(item => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      title: item.title,
      quantity: item.quantity,
      price: parseFloat(item.price),
    })),

    // Addresses
    shipping_address: order.shipping_address || null,
    billing_address: order.billing_address || null,

    // Timestamps
    shopify_created_at: order.created_at,
    shopify_updated_at: order.updated_at,
  };
}

/**
 * Calculate summary statistics from orders
 */
function calculateSummary(orders: ShopifyOrder[]): OrderSyncResult['summary'] {
  if (orders.length === 0) {
    return {
      totalRevenue: 0,
      avgOrderValue: 0,
      dateRange: {
        start: '',
        end: '',
      },
    };
  }

  const totalRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_price),
    0
  );

  const avgOrderValue = totalRevenue / orders.length;

  // Find date range
  const dates = orders.map(o => new Date(o.created_at).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    dateRange: {
      start: minDate.toISOString(),
      end: maxDate.toISOString(),
    },
  };
}

/**
 * Get order statistics from database
 */
export async function getOrderStatistics(workspaceId: string): Promise<{
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
}> {
  const supabase = createClient();

  // Get aggregated statistics
  const { data, error } = await supabase
    .from('shopify_orders')
    .select('total_price, shopify_created_at')
    .eq('workspace_id', workspaceId);

  if (error || !data || data.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      dateRange: { start: null, end: null },
    };
  }

  const totalRevenue = data.reduce((sum, order) => sum + Number(order.total_price), 0);
  const avgOrderValue = totalRevenue / data.length;

  // Find date range
  const dates = data.map(o => new Date(o.shopify_created_at).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return {
    totalOrders: data.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    dateRange: {
      start: minDate.toISOString(),
      end: maxDate.toISOString(),
    },
  };
}
