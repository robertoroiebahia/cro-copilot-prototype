/**
 * Shopify AOV (Average Order Value) Analysis Service
 *
 * Performs clustering analysis on order data to identify:
 * - Order value segments ($0-$50, $50-$100, etc.)
 * - Products frequently bought together (market basket analysis)
 * - Free shipping threshold opportunities
 * - Test ideas to increase AOV
 */

import { createClient } from '@/utils/supabase/server';

export interface OrderCluster {
  cluster_name: string;
  min_value: number;
  max_value: number;
  order_count: number;
  percentage: number;
  avg_order_value: number;
  total_revenue: number;
}

export interface ProductAffinity {
  product_a_id: string;
  product_a_title: string;
  product_b_id: string;
  product_b_title: string;
  co_occurrence_count: number;
  confidence: number;
  lift: number;
}

export interface AOVOpportunity {
  opportunity_type: 'free_shipping' | 'bundle' | 'upsell' | 'cross_sell';
  title: string;
  description: string;
  potential_impact: string;
  priority: number;
  confidence_score: number;
  data_support: any;
}

export interface AOVAnalysisResult {
  clusters: OrderCluster[];
  productAffinities: ProductAffinity[];
  opportunities: AOVOpportunity[];
  summary: {
    totalOrders: number;
    averageOrderValue: number;
    medianOrderValue: number;
    totalRevenue: number;
    currency: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

/**
 * Run comprehensive AOV analysis on Shopify orders
 */
export async function runAOVAnalysis(
  workspaceId: string,
  connectionId: string,
  options?: {
    dateRange?: { startDate?: string; endDate?: string };
    minConfidence?: number;
  }
): Promise<AOVAnalysisResult> {
  const supabase = await createClient();

  // Fetch orders for analysis
  let query = supabase
    .from('shopify_orders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('connection_id', connectionId)
    .eq('financial_status', 'paid'); // Only analyze completed orders

  if (options?.dateRange?.startDate) {
    query = query.gte('shopify_created_at', options.dateRange.startDate);
  }
  if (options?.dateRange?.endDate) {
    query = query.lte('shopify_created_at', options.dateRange.endDate);
  }

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  if (!orders || orders.length === 0) {
    throw new Error('No orders found for analysis. Please sync orders first.');
  }

  // Run analysis components
  const clusters = analyzeOrderClusters(orders);
  const productAffinities = analyzeProductAffinity(orders, options?.minConfidence || 0.3);
  const opportunities = generateAOVOpportunities(orders, clusters, productAffinities);

  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_price), 0);
  const averageOrderValue = totalRevenue / totalOrders;

  // Calculate median
  const sortedPrices = orders.map(o => Number(o.total_price)).sort((a, b) => a - b);
  const medianOrderValue = sortedPrices[Math.floor(sortedPrices.length / 2)] || 0;

  const dateRange = {
    startDate: orders.reduce((min, o) =>
      o.shopify_created_at < min ? o.shopify_created_at : min,
      orders[0].shopify_created_at
    ),
    endDate: orders.reduce((max, o) =>
      o.shopify_created_at > max ? o.shopify_created_at : max,
      orders[0].shopify_created_at
    ),
  };

  return {
    clusters,
    productAffinities,
    opportunities,
    summary: {
      totalOrders,
      averageOrderValue,
      medianOrderValue,
      totalRevenue,
      currency: orders[0]?.currency || 'USD',
      dateRange,
    },
  };
}

/**
 * Cluster orders by value ranges
 */
function analyzeOrderClusters(orders: any[]): OrderCluster[] {
  const clusterRanges = [
    { name: '$0-$25', min: 0, max: 25 },
    { name: '$25-$50', min: 25, max: 50 },
    { name: '$50-$75', min: 50, max: 75 },
    { name: '$75-$100', min: 75, max: 100 },
    { name: '$100-$150', min: 100, max: 150 },
    { name: '$150-$200', min: 150, max: 200 },
    { name: '$200+', min: 200, max: Infinity },
  ];

  const totalOrders = orders.length;

  return clusterRanges.map(range => {
    const ordersInRange = orders.filter(order => {
      const price = Number(order.total_price);
      return price >= range.min && price < range.max;
    });

    const orderCount = ordersInRange.length;
    const totalRevenue = ordersInRange.reduce((sum, order) =>
      sum + Number(order.total_price), 0
    );
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      cluster_name: range.name,
      min_value: range.min,
      max_value: range.max === Infinity ? 999999 : range.max,
      order_count: orderCount,
      percentage: (orderCount / totalOrders) * 100,
      avg_order_value: avgOrderValue,
      total_revenue: totalRevenue,
    };
  }).filter(cluster => cluster.order_count > 0); // Only return non-empty clusters
}

/**
 * Analyze which products are frequently bought together
 * Uses market basket analysis (association rules)
 */
function analyzeProductAffinity(orders: any[], minConfidence: number = 0.3): ProductAffinity[] {
  // Build product co-occurrence matrix
  const productPairs = new Map<string, {
    productA: { id: string; title: string };
    productB: { id: string; title: string };
    count: number;
  }>();

  const productCounts = new Map<string, number>();

  // Count individual products and pairs
  orders.forEach(order => {
    const items = order.line_items || [];

    // Count individual products
    items.forEach((item: any) => {
      const count = productCounts.get(item.product_id) || 0;
      productCounts.set(item.product_id, count + 1);
    });

    // Count pairs (combinations)
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        // Create consistent key (alphabetical order)
        const key = [itemA.product_id, itemB.product_id].sort().join('|');

        const existing = productPairs.get(key);
        if (existing) {
          existing.count++;
        } else {
          productPairs.set(key, {
            productA: { id: itemA.product_id, title: itemA.title },
            productB: { id: itemB.product_id, title: itemB.title },
            count: 1,
          });
        }
      }
    }
  });

  // Calculate confidence and lift for each pair
  const totalOrders = orders.length;
  const affinities: ProductAffinity[] = [];

  productPairs.forEach((pair, key) => {
    const countA = productCounts.get(pair.productA.id) || 0;
    const countB = productCounts.get(pair.productB.id) || 0;

    // Confidence: P(B|A) = count(A,B) / count(A)
    const confidence = pair.count / Math.max(countA, countB);

    // Lift: P(A,B) / (P(A) * P(B))
    const probAB = pair.count / totalOrders;
    const probA = countA / totalOrders;
    const probB = countB / totalOrders;
    const lift = probAB / (probA * probB);

    // Only include if confidence meets threshold and lift > 1 (positive correlation)
    if (confidence >= minConfidence && lift > 1 && pair.count >= 2) {
      affinities.push({
        product_a_id: pair.productA.id,
        product_a_title: pair.productA.title,
        product_b_id: pair.productB.id,
        product_b_title: pair.productB.title,
        co_occurrence_count: pair.count,
        confidence: confidence,
        lift: lift,
      });
    }
  });

  // Sort by lift (strongest associations first)
  return affinities.sort((a, b) => b.lift - a.lift).slice(0, 20); // Top 20
}

/**
 * Generate actionable AOV optimization opportunities
 */
function generateAOVOpportunities(
  orders: any[],
  clusters: OrderCluster[],
  affinities: ProductAffinity[]
): AOVOpportunity[] {
  const opportunities: AOVOpportunity[] = [];

  // Calculate key metrics
  const sortedPrices = orders.map(o => Number(o.total_price)).sort((a, b) => a - b);
  const avgOrderValue = orders.reduce((sum, o) => sum + Number(o.total_price), 0) / orders.length;
  const medianOrderValue = sortedPrices[Math.floor(sortedPrices.length / 2)] || 0;

  // Free shipping threshold opportunity
  const shippingOrders = orders.filter(o => o.shipping_price && Number(o.shipping_price) > 0);
  const avgShipping = shippingOrders.length > 0
    ? shippingOrders.reduce((sum, o) => sum + Number(o.shipping_price), 0) / shippingOrders.length
    : 0;

  // Find the optimal free shipping threshold (around 75th percentile)
  const p75Index = Math.floor(sortedPrices.length * 0.75);
  const suggestedThreshold = Math.ceil((sortedPrices[p75Index] || 0) / 10) * 10; // Round to nearest $10

  const ordersNearThreshold = orders.filter(o => {
    const price = Number(o.total_price);
    return price >= suggestedThreshold * 0.8 && price < suggestedThreshold;
  }).length;

  if (avgShipping > 0 && ordersNearThreshold > orders.length * 0.1) {
    opportunities.push({
      opportunity_type: 'free_shipping',
      title: `Test Free Shipping Threshold at $${suggestedThreshold}`,
      description: `${ordersNearThreshold} orders (${((ordersNearThreshold / orders.length) * 100).toFixed(1)}%) are within 20% of $${suggestedThreshold}. A free shipping offer could push these customers to add more items.`,
      potential_impact: `Estimated ${((ordersNearThreshold * (suggestedThreshold - avgOrderValue)) / orders.length).toFixed(0)} increase in average order value`,
      priority: ordersNearThreshold > orders.length * 0.15 ? 1 : 2,
      confidence_score: Math.min(0.95, 0.6 + (ordersNearThreshold / orders.length)),
      data_support: {
        currentAvgShipping: avgShipping.toFixed(2),
        suggestedThreshold,
        ordersAffected: ordersNearThreshold,
        percentageOfOrders: ((ordersNearThreshold / orders.length) * 100).toFixed(1),
      },
    });
  }

  // Product bundling opportunities (from affinity analysis)
  if (affinities.length > 0) {
    const topBundles = affinities.slice(0, 3);
    topBundles.forEach((affinity, index) => {
      opportunities.push({
        opportunity_type: 'bundle',
        title: `Bundle: "${affinity.product_a_title}" + "${affinity.product_b_title}"`,
        description: `These products were bought together ${affinity.co_occurrence_count} times with ${(affinity.confidence * 100).toFixed(0)}% confidence. Create a bundle to increase cart value.`,
        potential_impact: `Lift score of ${affinity.lift.toFixed(2)}x indicates strong purchasing correlation`,
        priority: index === 0 ? 1 : (index === 1 ? 2 : 3),
        confidence_score: Math.min(0.95, affinity.confidence * 1.2),
        data_support: {
          coOccurrences: affinity.co_occurrence_count,
          confidence: affinity.confidence,
          lift: affinity.lift,
        },
      });
    });
  }

  // Upsell opportunity based on clusters
  if (clusters.length === 0) {
    return opportunities.sort((a, b) => a.priority - b.priority);
  }

  const largestCluster = clusters.reduce((max, c) =>
    c.order_count > (max?.order_count || 0) ? c : max
  );

  if (largestCluster && largestCluster.avg_order_value < avgOrderValue * 1.2) {
    const targetIncrease = Math.ceil((avgOrderValue * 1.15 - largestCluster.avg_order_value) / 5) * 5;
    opportunities.push({
      opportunity_type: 'upsell',
      title: `Upsell to ${largestCluster.cluster_name} Segment`,
      description: `${largestCluster.order_count} customers (${largestCluster.percentage.toFixed(0)}%) ordered in the ${largestCluster.cluster_name} range. Show them premium options or accessories at checkout.`,
      potential_impact: `Increasing just 20% of these orders by $${targetIncrease} would add $${(largestCluster.order_count * 0.2 * targetIncrease).toFixed(0)} in revenue`,
      priority: 2,
      confidence_score: 0.65,
      data_support: {
        clusterName: largestCluster.cluster_name,
        orderCount: largestCluster.order_count,
        avgOrderValue: largestCluster.avg_order_value.toFixed(2),
        targetIncrease,
      },
    });
  }

  // Sort by priority
  return opportunities.sort((a, b) => a.priority - b.priority);
}

/**
 * Store analysis results in database
 */
export async function saveAnalysisResults(
  workspaceId: string,
  connectionId: string,
  analysisId: string,
  results: AOVAnalysisResult
): Promise<void> {
  const supabase = await createClient();

  // Store clusters
  const clusterInserts = results.clusters.map(cluster => ({
    analysis_id: analysisId,
    workspace_id: workspaceId,
    connection_id: connectionId,
    ...cluster,
  }));

  const { error: clusterError } = await supabase
    .from('order_clusters')
    .insert(clusterInserts);

  if (clusterError) {
    console.error('Error saving clusters:', clusterError);
  }

  // Store product affinities
  const affinityInserts = results.productAffinities.map(affinity => ({
    analysis_id: analysisId,
    workspace_id: workspaceId,
    connection_id: connectionId,
    ...affinity,
  }));

  if (affinityInserts.length > 0) {
    const { error: affinityError } = await supabase
      .from('product_affinity')
      .insert(affinityInserts);

    if (affinityError) {
      console.error('Error saving affinities:', affinityError);
    }
  }

  // Store opportunities
  const opportunityInserts = results.opportunities.map(opp => ({
    analysis_id: analysisId,
    workspace_id: workspaceId,
    connection_id: connectionId,
    ...opp,
  }));

  const { error: oppError } = await supabase
    .from('aov_opportunities')
    .insert(opportunityInserts);

  if (oppError) {
    console.error('Error saving opportunities:', oppError);
  }
}
