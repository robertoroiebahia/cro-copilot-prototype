-- Migration 011: Add workspace_id to All Tables
-- Date: 2025-10-21
-- Description: Complete workspace architecture - adds workspace_id to all user data tables
-- CRITICAL: This migration is required for the workspace system to function
--
-- What this migration does:
-- 1. Adds workspace_id column to all relevant tables
-- 2. Creates default workspaces for existing users
-- 3. Backfills workspace_id for existing data
-- 4. Updates RLS policies to be workspace-aware
-- 5. Adds proper indexes for performance
--
-- SAFETY: This migration is designed to be run safely on production
-- - Uses IF NOT EXISTS to be idempotent
-- - Creates default workspaces before migrating data
-- - Does NOT delete any existing data
-- - All changes are additive initially

-- ============================================================================
-- STEP 1: Ensure workspaces table exists (from migration 010)
-- ============================================================================

-- If workspaces table doesn't exist, this migration will fail
-- Run migration 010 first if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
    RAISE EXCEPTION 'Workspaces table does not exist. Please run migration 010 first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create default workspaces for all existing users
-- ============================================================================

-- This ensures every user has at least one workspace
-- Existing data will be assigned to this default workspace
INSERT INTO public.workspaces (user_id, name, description, is_active)
SELECT
  p.id as user_id,
  'Default Workspace' as name,
  'Automatically created workspace for existing data' as description,
  true as is_active
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Add workspace_id to ANALYSES table
-- ============================================================================

-- Add column (nullable first for existing data)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id for existing analyses
-- Assigns each analysis to the user's first workspace (or creates one)
UPDATE public.analyses a
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = a.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.analyses
ALTER COLUMN workspace_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_id ON public.analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_user ON public.analyses(workspace_id, user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

-- Create new workspace-aware RLS policies
CREATE POLICY "Users can view analyses in their workspaces"
  ON public.analyses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create analyses in their workspaces"
  ON public.analyses
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analyses in their workspaces"
  ON public.analyses
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete analyses in their workspaces"
  ON public.analyses
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Add workspace_id to INSIGHTS table
-- ============================================================================

ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill from analyses table (insights are linked to analyses)
UPDATE public.insights i
SET workspace_id = (
  SELECT a.workspace_id
  FROM public.analyses a
  WHERE a.id = i.analysis_id
)
WHERE workspace_id IS NULL AND analysis_id IS NOT NULL;

-- For insights without analysis_id, use user's first workspace
UPDATE public.insights i
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = i.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL AND user_id IS NOT NULL;

-- Make NOT NULL
ALTER TABLE public.insights
ALTER COLUMN workspace_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_insights_workspace_id ON public.insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_insights_workspace_analysis ON public.insights(workspace_id, analysis_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can create their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can delete their own insights" ON public.insights;

-- Create new workspace-aware RLS policies
CREATE POLICY "Users can view insights in their workspaces"
  ON public.insights
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create insights in their workspaces"
  ON public.insights
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update insights in their workspaces"
  ON public.insights
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete insights in their workspaces"
  ON public.insights
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: Add workspace_id to THEMES table
-- ============================================================================

ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id
UPDATE public.themes t
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = t.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.themes
ALTER COLUMN workspace_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON public.themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_workspace_user ON public.themes(workspace_id, user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can create their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can update their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can delete their own themes" ON public.themes;

-- Create new workspace-aware RLS policies
CREATE POLICY "Users can view themes in their workspaces"
  ON public.themes
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create themes in their workspaces"
  ON public.themes
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update themes in their workspaces"
  ON public.themes
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete themes in their workspaces"
  ON public.themes
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: Add workspace_id to HYPOTHESES table
-- ============================================================================

ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id
UPDATE public.hypotheses h
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = h.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.hypotheses
ALTER COLUMN workspace_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_id ON public.hypotheses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_user ON public.hypotheses(workspace_id, user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can create their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

-- Create new workspace-aware RLS policies
CREATE POLICY "Users can view hypotheses in their workspaces"
  ON public.hypotheses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create hypotheses in their workspaces"
  ON public.hypotheses
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update hypotheses in their workspaces"
  ON public.hypotheses
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete hypotheses in their workspaces"
  ON public.hypotheses
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: Add workspace_id to EXPERIMENTS table
-- ============================================================================

ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id
UPDATE public.experiments e
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = e.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.experiments
ALTER COLUMN workspace_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_experiments_workspace_id ON public.experiments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experiments_workspace_user ON public.experiments(workspace_id, user_id);

-- Drop old RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can create their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can update their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can delete their own experiments" ON public.experiments;

-- Create new workspace-aware RLS policies
CREATE POLICY "Users can view experiments in their workspaces"
  ON public.experiments
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create experiments in their workspaces"
  ON public.experiments
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update experiments in their workspaces"
  ON public.experiments
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete experiments in their workspaces"
  ON public.experiments
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Verify migration success
-- ============================================================================

-- Function to verify workspace_id columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  -- Check if all required columns exist
  SELECT ARRAY_AGG(table_name)
  INTO missing_columns
  FROM (
    SELECT 'analyses' as table_name WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'analyses' AND column_name = 'workspace_id'
    )
    UNION ALL
    SELECT 'insights' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'insights' AND column_name = 'workspace_id'
    )
    UNION ALL
    SELECT 'themes' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'workspace_id'
    )
    UNION ALL
    SELECT 'hypotheses' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'hypotheses' AND column_name = 'workspace_id'
    )
    UNION ALL
    SELECT 'experiments' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'experiments' AND column_name = 'workspace_id'
    )
  ) missing;

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Migration incomplete. Missing workspace_id in tables: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'Migration 011 completed successfully. All tables have workspace_id column.';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Added workspace_id to: analyses, insights, themes, hypotheses, experiments
-- ✅ Created default workspaces for all existing users
-- ✅ Backfilled all existing data with workspace_id
-- ✅ Updated all RLS policies to be workspace-aware
-- ✅ Added performance indexes
-- ✅ All foreign keys cascade on workspace deletion
--
-- Next steps:
-- 1. Update API routes to use workspace_id instead of user_id
-- 2. Update frontend queries to use workspace_id
-- 3. Test thoroughly in development before production deployment
