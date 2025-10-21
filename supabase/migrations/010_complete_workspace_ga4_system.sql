-- Migration: Complete Workspace-Based GA4 Funnel System
-- Date: 2025-10-20
-- Description: Multi-workspace architecture with GA4 funnel tracking
-- This is a standalone migration that creates everything from scratch

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Workspace basics
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,

  -- GA4 Configuration
  ga4_property_id TEXT,
  ga4_refresh_token TEXT, -- Encrypted at application level
  ga4_last_sync_at TIMESTAMPTZ,
  ga4_sync_enabled BOOLEAN DEFAULT false,

  -- Settings
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_active ON public.workspaces(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own workspaces"
  ON public.workspaces
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces"
  ON public.workspaces
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces"
  ON public.workspaces
  FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

-- ============================================================================
-- GA4 RAW EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ga4_raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Event basics
  event_date DATE NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'session_start',
    'view_item',
    'add_to_cart',
    'begin_checkout',
    'purchase'
  )),

  -- Metrics
  event_count INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,

  -- Dimensions
  device_category TEXT CHECK (device_category IN ('mobile', 'desktop', 'tablet')),
  channel TEXT, -- sessionDefaultChannelGroup from GA4
  user_type TEXT CHECK (user_type IN ('new', 'returning')),
  country TEXT,
  landing_page_category TEXT CHECK (landing_page_category IN (
    'homepage',
    'product',
    'collection',
    'blog',
    'other'
  )),
  landing_page_path TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_workspace_id ON public.ga4_raw_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_event_date ON public.ga4_raw_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_event_name ON public.ga4_raw_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_workspace_date ON public.ga4_raw_events(workspace_id, event_date DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_composite ON public.ga4_raw_events(
  workspace_id, event_date, event_name, device_category, channel
);

-- Enable RLS
ALTER TABLE public.ga4_raw_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their workspace GA4 events"
  ON public.ga4_raw_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their workspace GA4 events"
  ON public.ga4_raw_events
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace GA4 events"
  ON public.ga4_raw_events
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workspace GA4 events"
  ON public.ga4_raw_events
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ga4_raw_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ga4_raw_events_updated_at
  BEFORE UPDATE ON public.ga4_raw_events
  FOR EACH ROW
  EXECUTE FUNCTION update_ga4_raw_events_updated_at();

-- ============================================================================
-- GA4 CALCULATED FUNNELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ga4_calculated_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Segment
  segment_type TEXT NOT NULL CHECK (segment_type IN (
    'all_users',
    'device_mobile',
    'device_desktop',
    'device_tablet',
    'channel_direct',
    'channel_email',
    'channel_organic',
    'channel_paid',
    'channel_social',
    'user_new',
    'user_returning',
    'country_us',
    'country_non_us',
    'landing_homepage',
    'landing_product',
    'landing_collection',
    'landing_blog'
  )),
  segment_label TEXT NOT NULL, -- Human-readable label

  -- Funnel data (JSON)
  funnel_data JSONB NOT NULL,
  /* Structure:
  {
    "steps": [
      {
        "name": "Landing",
        "event": "session_start",
        "users": 10000,
        "conversion_rate": 100,
        "drop_off": 0,
        "drop_off_rate": 0
      },
      ...
    ],
    "overall_cvr": 2.5,
    "total_landing_users": 10000,
    "total_purchases": 250
  }
  */

  -- Summary metrics (for quick access)
  total_landing_users INTEGER NOT NULL,
  total_purchases INTEGER NOT NULL,
  overall_cvr NUMERIC(5,2) NOT NULL, -- Overall conversion rate %

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ga4_funnels_workspace_id ON public.ga4_calculated_funnels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ga4_funnels_dates ON public.ga4_calculated_funnels(start_date DESC, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_funnels_segment ON public.ga4_calculated_funnels(segment_type);
CREATE INDEX IF NOT EXISTS idx_ga4_funnels_workspace_segment ON public.ga4_calculated_funnels(
  workspace_id, segment_type, start_date DESC
);

-- Unique constraint: one funnel per workspace/segment/date range
CREATE UNIQUE INDEX IF NOT EXISTS idx_ga4_funnels_unique ON public.ga4_calculated_funnels(
  workspace_id, segment_type, start_date, end_date
);

-- Enable RLS
ALTER TABLE public.ga4_calculated_funnels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their workspace funnels"
  ON public.ga4_calculated_funnels
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their workspace funnels"
  ON public.ga4_calculated_funnels
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace funnels"
  ON public.ga4_calculated_funnels
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workspace funnels"
  ON public.ga4_calculated_funnels
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- GA4 FUNNEL INSIGHTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ga4_funnel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.ga4_calculated_funnels(id) ON DELETE CASCADE,

  -- Insight classification
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'gap_analysis',
    'segment_comparison',
    'drop_off',
    'anomaly',
    'temporal_pattern'
  )),

  -- Insight content
  observation TEXT NOT NULL, -- What's happening (no recommendations)
  data_points JSONB NOT NULL, -- Numbers supporting the observation

  -- Metadata
  impact TEXT NOT NULL CHECK (impact IN ('critical', 'high', 'medium', 'low')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Related segments (for comparisons)
  primary_segment TEXT,
  comparison_segment TEXT,

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ga4_insights_workspace_id ON public.ga4_funnel_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ga4_insights_funnel_id ON public.ga4_funnel_insights(funnel_id);
CREATE INDEX IF NOT EXISTS idx_ga4_insights_type ON public.ga4_funnel_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ga4_insights_impact ON public.ga4_funnel_insights(impact);
CREATE INDEX IF NOT EXISTS idx_ga4_insights_generated ON public.ga4_funnel_insights(generated_at DESC);

-- Enable RLS
ALTER TABLE public.ga4_funnel_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their workspace funnel insights"
  ON public.ga4_funnel_insights
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their workspace funnel insights"
  ON public.ga4_funnel_insights
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace funnel insights"
  ON public.ga4_funnel_insights
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workspace funnel insights"
  ON public.ga4_funnel_insights
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.workspaces IS 'Workspaces (clients/properties) managed by users. Each workspace represents a separate client or GA4 property.';
COMMENT ON COLUMN public.workspaces.ga4_property_id IS 'GA4 Property ID for this workspace';
COMMENT ON COLUMN public.workspaces.ga4_refresh_token IS 'Encrypted Google OAuth refresh token for GA4 access';
COMMENT ON COLUMN public.workspaces.is_active IS 'Whether this workspace is active (for soft deletes)';

COMMENT ON TABLE public.ga4_raw_events IS 'Raw event data synced from GA4 API (workspace-scoped)';
COMMENT ON TABLE public.ga4_calculated_funnels IS 'Pre-calculated funnel data by segment and date range (workspace-scoped)';
COMMENT ON TABLE public.ga4_funnel_insights IS 'AI-generated insights from funnel analysis (workspace-scoped)';

COMMENT ON COLUMN public.ga4_calculated_funnels.funnel_data IS 'Complete funnel data with steps, conversions, and drop-offs';
COMMENT ON COLUMN public.ga4_funnel_insights.observation IS 'AI observation of what is happening (no recommendations)';
COMMENT ON COLUMN public.ga4_funnel_insights.data_points IS 'Supporting data for the observation';
