-- Add count parameter to increment_usage function
-- This allows incrementing by more than 1 in a single call (e.g., when saving multiple insights)

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_workspace_id UUID,
  p_user_id UUID,
  p_usage_type TEXT,
  p_research_type TEXT DEFAULT NULL,
  p_count INTEGER DEFAULT 1  -- New parameter with default value of 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period TEXT;
BEGIN
  v_period := get_current_period();

  INSERT INTO public.usage_tracking (workspace_id, user_id, period, analyses_count, insights_count, themes_count, hypotheses_count, experiments_count)
  VALUES (
    p_workspace_id,
    p_user_id,
    v_period,
    CASE WHEN p_usage_type = 'analyses' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'insights' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'themes' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'hypotheses' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'experiments' THEN p_count ELSE 0 END
  )
  ON CONFLICT (workspace_id, period)
  DO UPDATE SET
    analyses_count = CASE WHEN p_usage_type = 'analyses' THEN usage_tracking.analyses_count + p_count ELSE usage_tracking.analyses_count END,
    insights_count = CASE WHEN p_usage_type = 'insights' THEN usage_tracking.insights_count + p_count ELSE usage_tracking.insights_count END,
    themes_count = CASE WHEN p_usage_type = 'themes' THEN usage_tracking.themes_count + p_count ELSE usage_tracking.themes_count END,
    hypotheses_count = CASE WHEN p_usage_type = 'hypotheses' THEN usage_tracking.hypotheses_count + p_count ELSE usage_tracking.hypotheses_count END,
    experiments_count = CASE WHEN p_usage_type = 'experiments' THEN usage_tracking.experiments_count + p_count ELSE usage_tracking.experiments_count END,
    -- Note: For analyses_by_type, we still only increment by 1 per call since research_type is singular
    analyses_by_type = CASE
      WHEN p_usage_type = 'analyses' AND p_research_type IS NOT NULL THEN
        jsonb_set(
          usage_tracking.analyses_by_type,
          ARRAY[p_research_type],
          to_jsonb(COALESCE((usage_tracking.analyses_by_type->p_research_type)::int, 0) + p_count)
        )
      ELSE usage_tracking.analyses_by_type
    END,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION increment_usage(UUID, UUID, TEXT, TEXT, INTEGER) IS
  'Increments usage tracking for a workspace. The p_count parameter allows incrementing by more than 1 (useful for bulk operations like saving multiple insights).';
