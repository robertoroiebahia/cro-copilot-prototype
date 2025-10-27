-- Migration: Shopify Order Analysis System
-- Date: 2025-10-27
-- Description: Tables for Shopify order data, clustering analysis, and AOV optimization

-- ============================================================================
-- SHOPIFY CONNECTIONS TABLE
-- ============================================================================
-- Store Shopify store connection details per workspace

CREATE TABLE IF NOT EXISTS public.shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- Encrypted access token
  shop_name TEXT,
  shop_email TEXT,
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, shop_domain)
);

-- Enable RLS
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view shopify_connections in their workspace"
  ON public.shopify_connections FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage shopify_connections in their workspace"
  ON public.shopify_connections FOR ALL
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- SHOPIFY ORDERS TABLE
-- ============================================================================
-- Raw Shopify order data

CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.shopify_connections(id) ON DELETE CASCADE,

  -- Shopify identifiers
  shopify_order_id TEXT NOT NULL,
  order_number INTEGER NOT NULL,

  -- Customer info
  customer_email TEXT,
  customer_id TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,

  -- Order details
  total_price DECIMAL(10, 2) NOT NULL,
  subtotal_price DECIMAL(10, 2),
  total_tax DECIMAL(10, 2),
  total_discounts DECIMAL(10, 2) DEFAULT 0,
  shipping_price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Status
  financial_status TEXT,
  fulfillment_status TEXT,

  -- Line items (JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,

  -- Timestamps
  shopify_created_at TIMESTAMPTZ NOT NULL,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on Shopify order ID per workspace
  UNIQUE(workspace_id, shopify_order_id)
);

-- Create indexes for performance
CREATE INDEX idx_shopify_orders_workspace ON public.shopify_orders(workspace_id);
CREATE INDEX idx_shopify_orders_connection ON public.shopify_orders(connection_id);
CREATE INDEX idx_shopify_orders_created ON public.shopify_orders(shopify_created_at);
CREATE INDEX idx_shopify_orders_total_price ON public.shopify_orders(total_price);
CREATE INDEX idx_shopify_orders_customer ON public.shopify_orders(customer_id);

-- Enable RLS
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view orders in their workspace"
  ON public.shopify_orders FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage orders in their workspace"
  ON public.shopify_orders FOR ALL
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- ORDER CLUSTER ANALYSIS TABLE
-- ============================================================================
-- Stores order value clustering results

CREATE TABLE IF NOT EXISTS public.order_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

  -- Cluster definition
  cluster_name TEXT NOT NULL, -- e.g., "$0-$50", "$50-$100"
  min_value DECIMAL(10, 2) NOT NULL,
  max_value DECIMAL(10, 2) NOT NULL,

  -- Cluster statistics
  order_count INTEGER NOT NULL,
  percentage_of_orders DECIMAL(5, 2) NOT NULL,
  total_revenue DECIMAL(12, 2) NOT NULL,
  percentage_of_revenue DECIMAL(5, 2) NOT NULL,
  average_order_value DECIMAL(10, 2) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_order_clusters_workspace ON public.order_clusters(workspace_id);
CREATE INDEX idx_order_clusters_analysis ON public.order_clusters(analysis_id);

-- Enable RLS
ALTER TABLE public.order_clusters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view clusters in their workspace"
  ON public.order_clusters FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- PRODUCT AFFINITY TABLE
-- ============================================================================
-- Stores market basket analysis results (frequently bought together)

CREATE TABLE IF NOT EXISTS public.product_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

  -- Product pair
  product_a_id TEXT NOT NULL,
  product_a_title TEXT NOT NULL,
  product_b_id TEXT NOT NULL,
  product_b_title TEXT NOT NULL,

  -- Market basket metrics
  support DECIMAL(5, 4) NOT NULL, -- % of orders containing both
  confidence DECIMAL(5, 4) NOT NULL, -- % of A orders that also have B
  lift DECIMAL(6, 3) NOT NULL, -- Strength of association

  -- Counts
  pair_count INTEGER NOT NULL, -- Orders with both products
  product_a_count INTEGER NOT NULL, -- Orders with product A
  product_b_count INTEGER NOT NULL, -- Orders with product B
  total_orders INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_product_affinity_workspace ON public.product_affinity(workspace_id);
CREATE INDEX idx_product_affinity_analysis ON public.product_affinity(analysis_id);
CREATE INDEX idx_product_affinity_lift ON public.product_affinity(lift DESC);

-- Enable RLS
ALTER TABLE public.product_affinity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view affinity in their workspace"
  ON public.product_affinity FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- AOV OPPORTUNITIES TABLE
-- ============================================================================
-- Stores prioritized test ideas for AOV optimization

CREATE TABLE IF NOT EXISTS public.aov_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

  -- Opportunity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'free_shipping', 'bundle', 'pricing', 'cross_sell'
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Test details
  test_idea JSONB NOT NULL, -- {what, why, how}
  expected_impact JSONB NOT NULL, -- {metric, baseline, predicted, lift, revenue_impact}

  -- Scores
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 10),
  effort_score INTEGER NOT NULL CHECK (effort_score BETWEEN 1 AND 10),
  revenue_impact_score INTEGER NOT NULL CHECK (revenue_impact_score BETWEEN 1 AND 10),

  -- Statistical readiness
  statistical_readiness JSONB, -- {sample_size_required, test_duration_days, current_sample_size}

  -- Supporting data
  supporting_data JSONB, -- Raw numbers supporting this opportunity

  -- Metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'implemented', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_aov_opportunities_workspace ON public.aov_opportunities(workspace_id);
CREATE INDEX idx_aov_opportunities_analysis ON public.aov_opportunities(analysis_id);
CREATE INDEX idx_aov_opportunities_priority ON public.aov_opportunities(priority);
CREATE INDEX idx_aov_opportunities_status ON public.aov_opportunities(status);

-- Enable RLS
ALTER TABLE public.aov_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view opportunities in their workspace"
  ON public.aov_opportunities FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage opportunities in their workspace"
  ON public.aov_opportunities FOR ALL
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- UPDATE TRIGGER FOR TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_orders_updated_at
  BEFORE UPDATE ON public.shopify_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aov_opportunities_updated_at
  BEFORE UPDATE ON public.aov_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.shopify_connections IS 'Stores Shopify store connection details per workspace';
COMMENT ON TABLE public.shopify_orders IS 'Raw Shopify order data synced via MCP';
COMMENT ON TABLE public.order_clusters IS 'Order value clustering analysis results';
COMMENT ON TABLE public.product_affinity IS 'Market basket analysis - products frequently bought together';
COMMENT ON TABLE public.aov_opportunities IS 'Prioritized AOV optimization test ideas with revenue impact';
