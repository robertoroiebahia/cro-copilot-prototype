-- ROLLBACK Migration 011: Remove workspace_id from All Tables
-- Date: 2025-10-21
-- Description: Rollback script for migration 011
--
-- WARNING: This rollback script will:
-- - Remove workspace_id columns from all tables
-- - Restore user_id-based RLS policies
-- - NOT delete any workspaces (in case you want to re-run migration)
--
-- IMPORTANT: Only run this if migration 011 failed or needs to be reverted
-- CAUTION: This assumes your data is still intact and just needs columns removed

-- ============================================================================
-- STEP 1: Drop workspace-aware RLS policies
-- ============================================================================

-- ANALYSES
DROP POLICY IF EXISTS "Users can view analyses in their workspaces" ON public.analyses;
DROP POLICY IF EXISTS "Users can create analyses in their workspaces" ON public.analyses;
DROP POLICY IF EXISTS "Users can update analyses in their workspaces" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete analyses in their workspaces" ON public.analyses;

-- INSIGHTS
DROP POLICY IF EXISTS "Users can view insights in their workspaces" ON public.insights;
DROP POLICY IF EXISTS "Users can create insights in their workspaces" ON public.insights;
DROP POLICY IF EXISTS "Users can update insights in their workspaces" ON public.insights;
DROP POLICY IF EXISTS "Users can delete insights in their workspaces" ON public.insights;

-- THEMES
DROP POLICY IF EXISTS "Users can view themes in their workspaces" ON public.themes;
DROP POLICY IF EXISTS "Users can create themes in their workspaces" ON public.themes;
DROP POLICY IF EXISTS "Users can update themes in their workspaces" ON public.themes;
DROP POLICY IF EXISTS "Users can delete themes in their workspaces" ON public.themes;

-- HYPOTHESES
DROP POLICY IF EXISTS "Users can view hypotheses in their workspaces" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can create hypotheses in their workspaces" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update hypotheses in their workspaces" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete hypotheses in their workspaces" ON public.hypotheses;

-- EXPERIMENTS
DROP POLICY IF EXISTS "Users can view experiments in their workspaces" ON public.experiments;
DROP POLICY IF EXISTS "Users can create experiments in their workspaces" ON public.experiments;
DROP POLICY IF EXISTS "Users can update experiments in their workspaces" ON public.experiments;
DROP POLICY IF EXISTS "Users can delete experiments in their workspaces" ON public.experiments;

-- ============================================================================
-- STEP 2: Restore original user_id-based RLS policies
-- ============================================================================

-- ANALYSES
CREATE POLICY "Users can view their own analyses"
  ON public.analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON public.analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON public.analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- INSIGHTS
CREATE POLICY "Users can view their own insights"
  ON public.insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights"
  ON public.insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON public.insights
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
  ON public.insights
  FOR DELETE
  USING (auth.uid() = user_id);

-- THEMES
CREATE POLICY "Users can view their own themes"
  ON public.themes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON public.themes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON public.themes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON public.themes
  FOR DELETE
  USING (auth.uid() = user_id);

-- HYPOTHESES
CREATE POLICY "Users can view their own hypotheses"
  ON public.hypotheses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own hypotheses"
  ON public.hypotheses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hypotheses"
  ON public.hypotheses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hypotheses"
  ON public.hypotheses
  FOR DELETE
  USING (auth.uid() = user_id);

-- EXPERIMENTS
CREATE POLICY "Users can view their own experiments"
  ON public.experiments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own experiments"
  ON public.experiments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiments"
  ON public.experiments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiments"
  ON public.experiments
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Drop indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_analyses_workspace_id;
DROP INDEX IF EXISTS idx_analyses_workspace_user;
DROP INDEX IF EXISTS idx_insights_workspace_id;
DROP INDEX IF EXISTS idx_insights_workspace_analysis;
DROP INDEX IF EXISTS idx_themes_workspace_id;
DROP INDEX IF EXISTS idx_themes_workspace_user;
DROP INDEX IF EXISTS idx_hypotheses_workspace_id;
DROP INDEX IF EXISTS idx_hypotheses_workspace_user;
DROP INDEX IF EXISTS idx_experiments_workspace_id;
DROP INDEX IF EXISTS idx_experiments_workspace_user;

-- ============================================================================
-- STEP 4: Remove workspace_id columns
-- ============================================================================

-- Remove workspace_id from all tables
-- Note: This will fail if there are foreign key constraints, which is expected
-- The migration adds ON DELETE CASCADE, so removing the column should work

ALTER TABLE public.analyses DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.insights DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.themes DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.hypotheses DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.experiments DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 5: Verify rollback success
-- ============================================================================

DO $$
BEGIN
  -- Check if columns were removed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name IN ('analyses', 'insights', 'themes', 'hypotheses', 'experiments')
    AND column_name = 'workspace_id'
  ) THEN
    RAISE WARNING 'Rollback incomplete. Some workspace_id columns still exist.';
  ELSE
    RAISE NOTICE 'Rollback completed successfully. workspace_id columns removed.';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Note: This rollback does NOT delete the workspaces table
-- If you want to completely remove workspaces, run:
-- DROP TABLE IF EXISTS public.workspaces CASCADE;
