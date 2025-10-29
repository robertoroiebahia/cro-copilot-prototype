-- Migration: Add PXL Framework to Hypotheses
-- Date: 2025-10-23
-- Description: Extend hypotheses table with PXL prioritization framework fields

-- ============================================================================
-- Add PXL Framework Columns to Hypotheses Table
-- ============================================================================

-- Research backing
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS research_backed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS research_notes TEXT;

-- Effort estimation
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS effort_design INTEGER CHECK (effort_design BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS effort_dev INTEGER CHECK (effort_dev BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS effort_copy INTEGER CHECK (effort_copy BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS effort_total INTEGER GENERATED ALWAYS AS (
  COALESCE(effort_design, 0) + COALESCE(effort_dev, 0) + COALESCE(effort_copy, 0)
) STORED;

-- Page location
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS above_fold BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS page_location TEXT,
ADD COLUMN IF NOT EXISTS element_location TEXT;

-- Psychology principles
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS psychology_principle TEXT,
ADD COLUMN IF NOT EXISTS psychology_notes TEXT;

-- ============================================================================
-- Add PXL Detail Fields (visible in expanded view)
-- ============================================================================

-- Target details
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS target_url TEXT,
ADD COLUMN IF NOT EXISTS target_pages TEXT[], -- Array of page URLs/patterns
ADD COLUMN IF NOT EXISTS target_audiences TEXT[]; -- Array of audience segments

-- KPIs
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS primary_kpi TEXT,
ADD COLUMN IF NOT EXISTS secondary_kpis TEXT[],
ADD COLUMN IF NOT EXISTS success_criteria JSONB;
/* Structure for success_criteria:
{
  "primary": {
    "metric": "conversion_rate",
    "baseline": "2.3%",
    "target": "3.2%",
    "minimumDetectableEffect": "15%"
  },
  "secondary": [
    {
      "metric": "add_to_cart_rate",
      "baseline": "5.1%",
      "target": "6.5%"
    }
  ]
}
*/

-- Additional context
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS potential_value TEXT, -- "High", "Medium", "Low" or estimated revenue
ADD COLUMN IF NOT EXISTS ease_score INTEGER CHECK (ease_score BETWEEN 1 AND 10);

-- PXL Score (calculated: Potential × Importance × Ease)
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS pxl_score DECIMAL(5, 2);

-- Workspace association
ALTER TABLE public.hypotheses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- Update RLS Policies to Include Workspace
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Authenticated users can create hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Authenticated users can update hypotheses" ON public.hypotheses;

-- New workspace-based policies
CREATE POLICY "Users can view hypotheses in their workspaces"
  ON public.hypotheses
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create hypotheses in their workspaces"
  ON public.hypotheses
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update hypotheses in their workspaces"
  ON public.hypotheses
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete hypotheses in their workspaces"
  ON public.hypotheses
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Add Indexes for PXL Fields
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hypotheses_workspace_id ON public.hypotheses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_research_backed ON public.hypotheses(research_backed);
CREATE INDEX IF NOT EXISTS idx_hypotheses_above_fold ON public.hypotheses(above_fold);
CREATE INDEX IF NOT EXISTS idx_hypotheses_pxl_score ON public.hypotheses(pxl_score DESC);
CREATE INDEX IF NOT EXISTS idx_hypotheses_effort_total ON public.hypotheses(effort_total);
CREATE INDEX IF NOT EXISTS idx_hypotheses_confidence_score ON public.hypotheses(confidence_score DESC);

-- ============================================================================
-- Comments for New Fields
-- ============================================================================

COMMENT ON COLUMN public.hypotheses.research_backed IS 'Is this hypothesis backed by research data?';
COMMENT ON COLUMN public.hypotheses.effort_design IS 'Design effort (1-10 scale)';
COMMENT ON COLUMN public.hypotheses.effort_dev IS 'Development effort (1-10 scale)';
COMMENT ON COLUMN public.hypotheses.effort_copy IS 'Copywriting effort (1-10 scale)';
COMMENT ON COLUMN public.hypotheses.above_fold IS 'Is the element above the fold?';
COMMENT ON COLUMN public.hypotheses.psychology_principle IS 'Psychology principle applied (e.g., "social_proof", "scarcity", "authority")';
COMMENT ON COLUMN public.hypotheses.pxl_score IS 'PXL prioritization score (Potential × Importance × Ease)';
COMMENT ON COLUMN public.hypotheses.target_url IS 'Primary target URL for the test';
COMMENT ON COLUMN public.hypotheses.target_pages IS 'Array of page URLs/patterns where test will run';
COMMENT ON COLUMN public.hypotheses.target_audiences IS 'Target audience segments for the test';
COMMENT ON COLUMN public.hypotheses.primary_kpi IS 'Primary success metric';
COMMENT ON COLUMN public.hypotheses.secondary_kpis IS 'Secondary metrics to track';
