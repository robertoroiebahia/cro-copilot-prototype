-- Index Audit and Optimization for Beta
-- Ensures all foreign keys and frequently queried columns have indexes

-- ============================================================================
-- CRITICAL FOREIGN KEY INDEXES
-- ============================================================================

-- Insights table
CREATE INDEX IF NOT EXISTS idx_insights_workspace_id ON public.insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_id ON public.insights(analysis_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);

-- Analyses table
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_id ON public.analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_research_type ON public.analyses(research_type);

-- Themes table
CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON public.themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_at ON public.themes(created_at DESC);

-- Hypotheses table
CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_id ON public.hypotheses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_theme_id ON public.hypotheses(theme_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_created_at ON public.hypotheses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON public.hypotheses(status);

-- Experiments table
CREATE INDEX IF NOT EXISTS idx_experiments_workspace_id ON public.experiments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experiments_hypothesis_id ON public.experiments(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_experiments_created_at ON public.experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.experiments(status);

-- Workspaces table
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces(created_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Get insights for a workspace filtered by status (common query)
CREATE INDEX IF NOT EXISTS idx_insights_workspace_status ON public.insights(workspace_id, status);

-- Get analyses for a workspace by research type (common query)
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_research_type ON public.analyses(workspace_id, research_type);

-- Get experiments for a workspace by status (common query)
CREATE INDEX IF NOT EXISTS idx_experiments_workspace_status ON public.experiments(workspace_id, status);

-- Get hypotheses for a workspace by status (common query)
CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_status ON public.hypotheses(workspace_id, status);

-- ============================================================================
-- GA4 RAW EVENTS TABLE (if it exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_workspace_id ON public.ga4_raw_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_analysis_id ON public.ga4_raw_events(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_event_name ON public.ga4_raw_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_event_date ON public.ga4_raw_events(event_date DESC);

-- ============================================================================
-- GA4 FUNNEL INSIGHTS TABLE (if it exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ga4_funnel_insights_workspace_id ON public.ga4_funnel_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ga4_funnel_insights_analysis_id ON public.ga4_funnel_insights(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ga4_funnel_insights_insight_type ON public.ga4_funnel_insights(insight_type);

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE public.insights;
ANALYZE public.analyses;
ANALYZE public.themes;
ANALYZE public.hypotheses;
ANALYZE public.experiments;
ANALYZE public.workspaces;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_insights_workspace_id IS 'Critical for filtering insights by workspace';
COMMENT ON INDEX idx_analyses_workspace_research_type IS 'Composite index for common workspace + research type queries';
COMMENT ON INDEX idx_experiments_workspace_status IS 'Composite index for filtering experiments by workspace and status';
