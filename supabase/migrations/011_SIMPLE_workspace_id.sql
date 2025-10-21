-- Migration 011: Add workspace_id to All Tables (SIMPLE VERSION)
-- Works with actual table relationships

-- ============================================================================
-- STEP 1: Ensure workspaces table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
    RAISE EXCEPTION 'Workspaces table does not exist. Run migration 010 first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create default workspaces for existing users
-- ============================================================================

INSERT INTO public.workspaces (user_id, name, description, is_active)
SELECT
  p.id as user_id,
  'Default Workspace' as name,
  'Automatically created workspace' as description,
  true as is_active
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ANALYSES: Has user_id, straightforward
-- ============================================================================

ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.analyses a
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.user_id = a.user_id
  ORDER BY w.created_at ASC LIMIT 1
)
WHERE workspace_id IS NULL AND user_id IS NOT NULL;

ALTER TABLE public.analyses ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_id ON public.analyses(workspace_id);

DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

CREATE POLICY "Users can view analyses in their workspaces" ON public.analyses FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can create analyses in their workspaces" ON public.analyses FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update analyses in their workspaces" ON public.analyses FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete analyses in their workspaces" ON public.analyses FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- INSIGHTS: Linked via analysis_id
-- ============================================================================

ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.insights i
SET workspace_id = (
  SELECT a.workspace_id FROM public.analyses a WHERE a.id = i.analysis_id
)
WHERE workspace_id IS NULL AND analysis_id IS NOT NULL;

ALTER TABLE public.insights ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insights_workspace_id ON public.insights(workspace_id);

DROP POLICY IF EXISTS "Users can view their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can create their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can delete their own insights" ON public.insights;

CREATE POLICY "Users can view insights in their workspaces" ON public.insights FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can create insights in their workspaces" ON public.insights FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update insights in their workspaces" ON public.insights FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete insights in their workspaces" ON public.insights FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- THEMES: Check if it has user_id
-- ============================================================================

DO $$
BEGIN
  -- Add workspace_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.themes
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Try to backfill from user_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'user_id'
  ) THEN
    UPDATE public.themes t
    SET workspace_id = (
      SELECT w.id FROM public.workspaces w
      WHERE w.user_id = t.user_id
      ORDER BY w.created_at ASC LIMIT 1
    )
    WHERE workspace_id IS NULL;
  ELSE
    -- If no user_id, try via analysis_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'analysis_id'
    ) THEN
      UPDATE public.themes t
      SET workspace_id = (
        SELECT a.workspace_id FROM public.analyses a WHERE a.id = t.analysis_id
      )
      WHERE workspace_id IS NULL;
    END IF;
  END IF;

  -- Make NOT NULL
  ALTER TABLE public.themes ALTER COLUMN workspace_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON public.themes(workspace_id);
END $$;

DROP POLICY IF EXISTS "Users can view their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can create their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can update their own themes" ON public.themes;
DROP POLICY IF EXISTS "Users can delete their own themes" ON public.themes;

CREATE POLICY "Users can view themes in their workspaces" ON public.themes FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can create themes in their workspaces" ON public.themes FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update themes in their workspaces" ON public.themes FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete themes in their workspaces" ON public.themes FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- HYPOTHESES: Linked via theme_id
-- ============================================================================

DO $$
BEGIN
  -- Add workspace_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hypotheses' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.hypotheses
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Backfill via theme_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hypotheses' AND column_name = 'theme_id'
  ) THEN
    UPDATE public.hypotheses h
    SET workspace_id = (
      SELECT t.workspace_id FROM public.themes t WHERE t.id = h.theme_id
    )
    WHERE workspace_id IS NULL AND theme_id IS NOT NULL;
  END IF;

  -- For hypotheses without theme_id, can't backfill - will need workspace_id on insert
  -- Make NOT NULL
  ALTER TABLE public.hypotheses ALTER COLUMN workspace_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_id ON public.hypotheses(workspace_id);
END $$;

DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can create their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

CREATE POLICY "Users can view hypotheses in their workspaces" ON public.hypotheses FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can create hypotheses in their workspaces" ON public.hypotheses FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update hypotheses in their workspaces" ON public.hypotheses FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete hypotheses in their workspaces" ON public.hypotheses FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- EXPERIMENTS: Check structure
-- ============================================================================

DO $$
BEGIN
  -- Add workspace_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experiments' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.experiments
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Try to backfill from user_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experiments' AND column_name = 'user_id'
  ) THEN
    UPDATE public.experiments e
    SET workspace_id = (
      SELECT w.id FROM public.workspaces w
      WHERE w.user_id = e.user_id
      ORDER BY w.created_at ASC LIMIT 1
    )
    WHERE workspace_id IS NULL;
  ELSE
    -- Try via hypothesis_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'experiments' AND column_name = 'hypothesis_id'
    ) THEN
      UPDATE public.experiments e
      SET workspace_id = (
        SELECT h.workspace_id FROM public.hypotheses h WHERE h.id = e.hypothesis_id
      )
      WHERE workspace_id IS NULL;
    END IF;
  END IF;

  -- Make NOT NULL
  ALTER TABLE public.experiments ALTER COLUMN workspace_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_experiments_workspace_id ON public.experiments(workspace_id);
END $$;

DROP POLICY IF EXISTS "Users can view their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can create their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can update their own experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can delete their own experiments" ON public.experiments;

CREATE POLICY "Users can view experiments in their workspaces" ON public.experiments FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can create experiments in their workspaces" ON public.experiments FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can update experiments in their workspaces" ON public.experiments FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete experiments in their workspaces" ON public.experiments FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- ============================================================================
-- VERIFY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 011 completed successfully!';
  RAISE NOTICE 'Added workspace_id to: analyses, insights, themes, hypotheses, experiments';
END $$;
