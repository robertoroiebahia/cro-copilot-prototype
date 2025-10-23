-- ============================================================================
-- BILLING & USAGE TRACKING SYSTEM
-- Migration 013
-- Created: October 22, 2025
-- ============================================================================
-- This migration creates the infrastructure for:
-- - Pricing plans and tiers
-- - User subscriptions
-- - Usage tracking per workspace
-- - Feature gating logic
-- ============================================================================

-- ============================================================================
-- PRICING PLANS TABLE
-- ============================================================================
-- Stores the available pricing tiers and their limits
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER, -- Price in cents (e.g., 7900 = $79.00)
  price_annual INTEGER, -- Price in cents (annual billing)

  -- Usage Limits
  limits JSONB NOT NULL DEFAULT '{
    "analyses_per_month": 5,
    "insights_max": 50,
    "themes_max": 10,
    "hypotheses_max": 5,
    "experiments_per_month": 2,
    "workspaces_max": 1,
    "team_members_max": 1,
    "data_retention_days": 7
  }'::jsonb,

  -- Feature Access
  features JSONB NOT NULL DEFAULT '{
    "page_analysis": true,
    "ga4_analysis": true,
    "survey_analysis": false,
    "review_mining": false,
    "onsite_poll": false,
    "heatmap_analysis": false,
    "user_testing": false,
    "manual_insights": false,
    "edit_themes": false,
    "edit_hypotheses": false,
    "csv_export": false,
    "api_access": false,
    "white_label": false,
    "priority_support": false
  }'::jsonb,

  -- Stripe Integration (to be filled later)
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (id, name, description, price_monthly, price_annual, limits, features, display_order) VALUES
(
  'free',
  'Free',
  'Perfect for trying out the platform',
  0,
  0,
  '{
    "analyses_per_month": 5,
    "insights_max": 50,
    "themes_max": 10,
    "hypotheses_max": 5,
    "experiments_per_month": 2,
    "workspaces_max": 1,
    "team_members_max": 1,
    "data_retention_days": 7
  }'::jsonb,
  '{
    "page_analysis": true,
    "ga4_analysis": true,
    "survey_analysis": false,
    "review_mining": false,
    "onsite_poll": false,
    "heatmap_analysis": false,
    "user_testing": false,
    "manual_insights": false,
    "edit_themes": false,
    "edit_hypotheses": false,
    "csv_export": false,
    "api_access": false,
    "white_label": false,
    "priority_support": false
  }'::jsonb,
  1
),
(
  'pro',
  'Pro',
  'For growing teams and agencies',
  7900, -- $79.00
  79000, -- $790.00 annual (2 months free)
  '{
    "analyses_per_month": 50,
    "insights_max": -1,
    "themes_max": -1,
    "hypotheses_max": -1,
    "experiments_per_month": 25,
    "workspaces_max": 3,
    "team_members_max": 3,
    "data_retention_days": 90
  }'::jsonb,
  '{
    "page_analysis": true,
    "ga4_analysis": true,
    "survey_analysis": true,
    "review_mining": true,
    "onsite_poll": true,
    "heatmap_analysis": true,
    "user_testing": true,
    "manual_insights": true,
    "edit_themes": true,
    "edit_hypotheses": true,
    "csv_export": true,
    "api_access": false,
    "white_label": false,
    "priority_support": true
  }'::jsonb,
  2
),
(
  'enterprise',
  'Enterprise',
  'Custom solutions for large organizations',
  NULL, -- Custom pricing
  NULL,
  '{
    "analyses_per_month": -1,
    "insights_max": -1,
    "themes_max": -1,
    "hypotheses_max": -1,
    "experiments_per_month": -1,
    "workspaces_max": -1,
    "team_members_max": -1,
    "data_retention_days": -1
  }'::jsonb,
  '{
    "page_analysis": true,
    "ga4_analysis": true,
    "survey_analysis": true,
    "review_mining": true,
    "onsite_poll": true,
    "heatmap_analysis": true,
    "user_testing": true,
    "manual_insights": true,
    "edit_themes": true,
    "edit_hypotheses": true,
    "csv_export": true,
    "api_access": true,
    "white_label": true,
    "priority_support": true
  }'::jsonb,
  3
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can view pricing plans
CREATE POLICY "Anyone can view pricing plans"
  ON public.pricing_plans
  FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks user subscriptions and billing status
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.pricing_plans(id),

  -- Billing details
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, trialing
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, annual

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Dates
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id) -- One subscription per user
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- USAGE TRACKING TABLE
-- ============================================================================
-- Tracks monthly usage per workspace
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period (YYYY-MM format, e.g., "2025-10")
  period TEXT NOT NULL, -- Format: YYYY-MM

  -- Usage counters
  analyses_count INTEGER NOT NULL DEFAULT 0,
  insights_count INTEGER NOT NULL DEFAULT 0,
  themes_count INTEGER NOT NULL DEFAULT 0,
  hypotheses_count INTEGER NOT NULL DEFAULT 0,
  experiments_count INTEGER NOT NULL DEFAULT 0,

  -- Breakdown by research type
  analyses_by_type JSONB NOT NULL DEFAULT '{
    "page_analysis": 0,
    "ga4_analysis": 0,
    "survey_analysis": 0,
    "review_mining": 0,
    "onsite_poll": 0,
    "heatmap_analysis": 0,
    "user_testing": 0,
    "other": 0
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per workspace per month
  UNIQUE(workspace_id, period)
);

-- Create indexes
CREATE INDEX idx_usage_workspace_period ON public.usage_tracking(workspace_id, period);
CREATE INDEX idx_usage_user_period ON public.usage_tracking(user_id, period);
CREATE INDEX idx_usage_period ON public.usage_tracking(period);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view usage for their workspaces
CREATE POLICY "Users can view usage for their workspaces"
  ON public.usage_tracking
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current period in YYYY-MM format
CREATE OR REPLACE FUNCTION get_current_period()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(NOW(), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_workspace_id UUID,
  p_user_id UUID,
  p_usage_type TEXT, -- 'analyses', 'insights', 'themes', 'hypotheses', 'experiments'
  p_research_type TEXT DEFAULT NULL -- For analyses only
)
RETURNS void AS $$
DECLARE
  v_period TEXT;
  v_column TEXT;
BEGIN
  v_period := get_current_period();
  v_column := p_usage_type || '_count';

  -- Insert or update usage record
  INSERT INTO public.usage_tracking (workspace_id, user_id, period, analyses_count, insights_count, themes_count, hypotheses_count, experiments_count)
  VALUES (
    p_workspace_id,
    p_user_id,
    v_period,
    CASE WHEN p_usage_type = 'analyses' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'insights' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'themes' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'hypotheses' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'experiments' THEN 1 ELSE 0 END
  )
  ON CONFLICT (workspace_id, period)
  DO UPDATE SET
    analyses_count = CASE WHEN p_usage_type = 'analyses' THEN usage_tracking.analyses_count + 1 ELSE usage_tracking.analyses_count END,
    insights_count = CASE WHEN p_usage_type = 'insights' THEN usage_tracking.insights_count + 1 ELSE usage_tracking.insights_count END,
    themes_count = CASE WHEN p_usage_type = 'themes' THEN usage_tracking.themes_count + 1 ELSE usage_tracking.themes_count END,
    hypotheses_count = CASE WHEN p_usage_type = 'hypotheses' THEN usage_tracking.hypotheses_count + 1 ELSE usage_tracking.hypotheses_count END,
    experiments_count = CASE WHEN p_usage_type = 'experiments' THEN usage_tracking.experiments_count + 1 ELSE usage_tracking.experiments_count END,
    analyses_by_type = CASE
      WHEN p_usage_type = 'analyses' AND p_research_type IS NOT NULL THEN
        jsonb_set(
          usage_tracking.analyses_by_type,
          ARRAY[p_research_type],
          to_jsonb(COALESCE((usage_tracking.analyses_by_type->p_research_type)::int, 0) + 1)
        )
      ELSE usage_tracking.analyses_by_type
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has reached limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_workspace_id UUID,
  p_usage_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_usage RECORD;
  v_period TEXT;
  v_limit INTEGER;
  v_current INTEGER;
  v_limit_key TEXT;
  v_count_column TEXT;
BEGIN
  v_period := get_current_period();
  v_count_column := p_usage_type || '_count';
  v_limit_key := p_usage_type || '_' ||
    CASE
      WHEN p_usage_type IN ('analyses', 'experiments') THEN 'per_month'
      ELSE 'max'
    END;

  -- Get user's subscription and plan
  SELECT s.*, p.limits, p.features
  INTO v_subscription
  FROM public.subscriptions s
  JOIN public.pricing_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id
  LIMIT 1;

  -- If no subscription, user is on free plan
  IF NOT FOUND THEN
    SELECT limits, features INTO v_plan
    FROM public.pricing_plans
    WHERE id = 'free';
  ELSE
    SELECT limits, features INTO v_plan
    FROM public.pricing_plans
    WHERE id = v_subscription.plan_id;
  END IF;

  -- Get limit from plan (-1 means unlimited)
  v_limit := (v_plan.limits->v_limit_key)::int;

  -- Get current usage
  SELECT
    CASE
      WHEN p_usage_type = 'analyses' THEN COALESCE(analyses_count, 0)
      WHEN p_usage_type = 'insights' THEN COALESCE(insights_count, 0)
      WHEN p_usage_type = 'themes' THEN COALESCE(themes_count, 0)
      WHEN p_usage_type = 'hypotheses' THEN COALESCE(hypotheses_count, 0)
      WHEN p_usage_type = 'experiments' THEN COALESCE(experiments_count, 0)
    END INTO v_current
  FROM public.usage_tracking
  WHERE workspace_id = p_workspace_id AND period = v_period;

  v_current := COALESCE(v_current, 0);

  -- Return result
  RETURN jsonb_build_object(
    'allowed', (v_limit = -1 OR v_current < v_limit),
    'limit', v_limit,
    'current', v_current,
    'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_current) END,
    'period', v_period
  );
END;
$$ LANGUAGE plpgsql;

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    billing_cycle,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'free',
    'active',
    'monthly',
    NOW(),
    NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create subscription on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Current user subscription with plan details
CREATE OR REPLACE VIEW public.user_subscription_details AS
SELECT
  s.id as subscription_id,
  s.user_id,
  s.plan_id,
  s.status,
  s.billing_cycle,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.cancelled_at,
  p.name as plan_name,
  p.description as plan_description,
  p.price_monthly,
  p.price_annual,
  p.limits,
  p.features,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
JOIN public.pricing_plans p ON s.plan_id = p.id;

-- Grant access to authenticated users
GRANT SELECT ON public.user_subscription_details TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.pricing_plans IS 'Stores available pricing tiers and their limits';
COMMENT ON TABLE public.subscriptions IS 'Tracks user subscriptions and billing status';
COMMENT ON TABLE public.usage_tracking IS 'Tracks monthly usage per workspace';
COMMENT ON FUNCTION increment_usage IS 'Increments usage counter for a workspace';
COMMENT ON FUNCTION check_usage_limit IS 'Checks if user has reached their plan limit';
