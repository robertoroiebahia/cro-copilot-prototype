-- Migration 011: Add workspace_id to All Tables (FIXED VERSION)
-- Date: 2025-10-21
-- Description: Complete workspace architecture - adds workspace_id to all user data tables
-- FIX: Removed user_id references from insights table (doesn't have that column)

-- ============================================================================
-- STEP 1: Ensure workspaces table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
    RAISE EXCEPTION 'Workspaces table does not exist. Please run migration 010 first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create default workspaces for all existing users
-- ============================================================================

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

ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id for existing analyses
UPDATE public.analyses a
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = a.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.analyses
ALTER COLUMN workspace_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_id ON public.analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_user ON public.analyses(workspace_id, user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

-- Create workspace-aware RLS policies
CREATE POLICY "Users can view analyses in their workspaces"
  ON public.analyses FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create analyses in their workspaces"
  ON public.analyses FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can update analyses in their workspaces"
  ON public.analyses FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete analyses in their workspaces"
  ON public.analyses FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 4: Add workspace_id to INSIGHTS table (FIXED)
-- ============================================================================

ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill from analyses table (insights are ALWAYS linked to analyses)
UPDATE public.insights i
SET workspace_id = (
  SELECT a.workspace_id
  FROM public.analyses a
  WHERE a.id = i.analysis_id
)
WHERE workspace_id IS NULL;

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

-- Create workspace-aware RLS policies
CREATE POLICY "Users can view insights in their workspaces"
  ON public.insights FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create insights in their workspaces"
  ON public.insights FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can update insights in their workspaces"
  ON public.insights FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete insights in their workspaces"
  ON public.insights FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 5: Add workspace_id to THEMES table
-- ============================================================================

ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.themes t
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = t.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

ALTER TABLE public.themes
ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON public.themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_workspace_user ON public.themes(workspace_id, user_id);

DROP POLICY IF EXISTS "Users can view their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can create their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can update their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can delete their own themes" ON public.themes;

CREATE POLICY "Users can view themes in their workspaces"
  ON public.themes FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create themes in their workspaces"
  ON public.themes FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can update themes in their workspaces"
  ON public.themes FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete themes in their workspaces"
  ON public.themes FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 6: Add workspace_id to HYPOTHESES table
-- ============================================================================

ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.hypotheses h
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = h.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

ALTER TABLE public.hypotheses
ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_id ON public.hypotheses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_user ON public.hypotheses(workspace_id, user_id);

DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can create their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

CREATE POLICY "Users can view hypotheses in their workspaces"
  ON public.hypotheses FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create hypotheses in their workspaces"
  ON public.hypotheses FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can update hypotheses in their workspaces"
  ON public.hypotheses FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete hypotheses in their workspaces"
  ON public.hypotheses FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 7: Add workspace_id to EXPERIMENTS table
-- ============================================================================

ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.experiments e
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.user_id = e.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

ALTER TABLE public.experiments
ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_experiments_workspace_id ON public.experiments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experiments_workspace_user ON public.experiments(workspace_id, user_id);

DROP POLICY IF EXISTS "Users can view their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can create their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can update their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can delete their own experiments" ON public.experiments;

CREATE POLICY "Users can view experiments in their workspaces"
  ON public.experiments FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create experiments in their workspaces"
  ON public.experiments FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can update experiments in their workspaces"
  ON public.experiments FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete experiments in their workspaces"
  ON public.experiments FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 8: Verify migration success
-- ============================================================================

DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
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
