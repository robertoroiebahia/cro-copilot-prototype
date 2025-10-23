-- ============================================================================
-- BACKFILL USAGE TRACKING DATA
-- This script backfills the usage_tracking table with existing data
-- Run this ONCE to populate historical usage data
-- ============================================================================

-- First, let's see what we're working with
SELECT
  'Current state' as info,
  (SELECT COUNT(*) FROM analyses) as total_analyses,
  (SELECT COUNT(*) FROM insights) as total_insights,
  (SELECT COUNT(*) FROM themes) as total_themes,
  (SELECT COUNT(*) FROM hypotheses) as total_hypotheses,
  (SELECT COUNT(*) FROM experiments) as total_experiments,
  (SELECT COUNT(*) FROM usage_tracking) as usage_records;

-- ============================================================================
-- BACKFILL ANALYSES
-- Group analyses by workspace and period, then insert into usage_tracking
-- ============================================================================

INSERT INTO usage_tracking (workspace_id, user_id, period, analyses_count, insights_count, themes_count, hypotheses_count, experiments_count, analyses_by_type)
SELECT
  workspace_id,
  user_id,
  TO_CHAR(created_at, 'YYYY-MM') as period,
  COUNT(*) as analyses_count,
  0 as insights_count,
  0 as themes_count,
  0 as hypotheses_count,
  0 as experiments_count,
  jsonb_build_object(
    'page_analysis', COUNT(CASE WHEN research_type = 'page_analysis' THEN 1 END),
    'ga4_analysis', COUNT(CASE WHEN research_type = 'ga4_analysis' THEN 1 END),
    'survey_analysis', COUNT(CASE WHEN research_type = 'survey_analysis' THEN 1 END),
    'review_mining', COUNT(CASE WHEN research_type = 'review_mining' THEN 1 END),
    'onsite_poll', COUNT(CASE WHEN research_type = 'onsite_poll' THEN 1 END),
    'heatmap_analysis', COUNT(CASE WHEN research_type = 'heatmap_analysis' THEN 1 END),
    'user_testing', COUNT(CASE WHEN research_type = 'user_testing' THEN 1 END),
    'other', COUNT(CASE WHEN research_type NOT IN ('page_analysis', 'ga4_analysis', 'survey_analysis', 'review_mining', 'onsite_poll', 'heatmap_analysis', 'user_testing') THEN 1 END)
  ) as analyses_by_type
FROM analyses
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id, user_id, TO_CHAR(created_at, 'YYYY-MM')
ON CONFLICT (workspace_id, period)
DO UPDATE SET
  analyses_count = EXCLUDED.analyses_count,
  analyses_by_type = EXCLUDED.analyses_by_type,
  updated_at = NOW();

-- ============================================================================
-- BACKFILL INSIGHTS
-- Update usage_tracking with insights count
-- ============================================================================

WITH insight_counts AS (
  SELECT
    workspace_id,
    TO_CHAR(created_at, 'YYYY-MM') as period,
    COUNT(*) as insight_count
  FROM insights
  WHERE workspace_id IS NOT NULL
  GROUP BY workspace_id, TO_CHAR(created_at, 'YYYY-MM')
)
UPDATE usage_tracking ut
SET
  insights_count = ic.insight_count,
  updated_at = NOW()
FROM insight_counts ic
WHERE ut.workspace_id = ic.workspace_id
  AND ut.period = ic.period;

-- ============================================================================
-- BACKFILL THEMES
-- Update usage_tracking with themes count
-- ============================================================================

WITH theme_counts AS (
  SELECT
    workspace_id,
    TO_CHAR(created_at, 'YYYY-MM') as period,
    COUNT(*) as theme_count
  FROM themes
  WHERE workspace_id IS NOT NULL
  GROUP BY workspace_id, TO_CHAR(created_at, 'YYYY-MM')
)
UPDATE usage_tracking ut
SET
  themes_count = tc.theme_count,
  updated_at = NOW()
FROM theme_counts tc
WHERE ut.workspace_id = tc.workspace_id
  AND ut.period = tc.period;

-- ============================================================================
-- BACKFILL HYPOTHESES
-- Update usage_tracking with hypotheses count
-- ============================================================================

WITH hypothesis_counts AS (
  SELECT
    workspace_id,
    TO_CHAR(created_at, 'YYYY-MM') as period,
    COUNT(*) as hypothesis_count
  FROM hypotheses
  WHERE workspace_id IS NOT NULL
  GROUP BY workspace_id, TO_CHAR(created_at, 'YYYY-MM')
)
UPDATE usage_tracking ut
SET
  hypotheses_count = hc.hypothesis_count,
  updated_at = NOW()
FROM hypothesis_counts hc
WHERE ut.workspace_id = hc.workspace_id
  AND ut.period = hc.period;

-- ============================================================================
-- BACKFILL EXPERIMENTS
-- Update usage_tracking with experiments count
-- ============================================================================

WITH experiment_counts AS (
  SELECT
    workspace_id,
    TO_CHAR(created_at, 'YYYY-MM') as period,
    COUNT(*) as experiment_count
  FROM experiments
  WHERE workspace_id IS NOT NULL
  GROUP BY workspace_id, TO_CHAR(created_at, 'YYYY-MM')
)
UPDATE usage_tracking ut
SET
  experiments_count = ec.experiment_count,
  updated_at = NOW()
FROM experiment_counts ec
WHERE ut.workspace_id = ec.workspace_id
  AND ut.period = ec.period;

-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================

SELECT
  'After backfill' as info,
  (SELECT COUNT(*) FROM analyses) as total_analyses,
  (SELECT COUNT(*) FROM insights) as total_insights,
  (SELECT COUNT(*) FROM themes) as total_themes,
  (SELECT COUNT(*) FROM hypotheses) as total_hypotheses,
  (SELECT COUNT(*) FROM experiments) as total_experiments,
  (SELECT COUNT(*) FROM usage_tracking) as usage_records,
  (SELECT SUM(analyses_count) FROM usage_tracking) as tracked_analyses,
  (SELECT SUM(insights_count) FROM usage_tracking) as tracked_insights;

-- Show usage tracking data
SELECT
  workspace_id,
  period,
  analyses_count,
  insights_count,
  themes_count,
  hypotheses_count,
  experiments_count,
  analyses_by_type
FROM usage_tracking
ORDER BY period DESC, workspace_id;
