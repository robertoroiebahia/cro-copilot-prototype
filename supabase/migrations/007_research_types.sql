-- Migration: Research Types & Manual Insights
-- Date: 2025-10-20
-- Description: Add support for different research methodologies and manual insights

-- ============================================================================
-- ADD RESEARCH TYPE TO ANALYSES
-- Each analysis has a research type (methodology used)
-- ============================================================================

ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS research_type TEXT NOT NULL DEFAULT 'page_analysis'
CHECK (research_type IN ('page_analysis', 'ga_analysis', 'survey_analysis', 'heatmap_analysis', 'user_testing', 'competitor_analysis', 'other'));

CREATE INDEX idx_analyses_research_type ON public.analyses(research_type);

COMMENT ON COLUMN public.analyses.research_type IS 'The research methodology: page_analysis (screenshot CRO), ga_analysis (Google Analytics), survey_analysis, heatmap_analysis, user_testing, competitor_analysis, other';

-- ============================================================================
-- UPDATE INSIGHTS TABLE FOR MANUAL INSIGHTS
-- ============================================================================

-- Make analysis_id nullable (for manual insights not tied to specific analysis)
ALTER TABLE public.insights
ALTER COLUMN analysis_id DROP NOT NULL;

-- Add research_type to insights (so manual insights can specify their methodology)
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS research_type TEXT
CHECK (research_type IN ('page_analysis', 'ga_analysis', 'survey_analysis', 'heatmap_analysis', 'user_testing', 'competitor_analysis', 'other'));

-- Add source_type to distinguish automated vs manual insights
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'automated'
CHECK (source_type IN ('automated', 'manual'));

-- Add indexes
CREATE INDEX idx_insights_research_type ON public.insights(research_type) WHERE research_type IS NOT NULL;
CREATE INDEX idx_insights_source_type ON public.insights(source_type);

-- Update existing insights to inherit research_type from their analysis
UPDATE public.insights i
SET research_type = a.research_type
FROM public.analyses a
WHERE i.analysis_id = a.id
AND i.research_type IS NULL;

COMMENT ON COLUMN public.insights.research_type IS 'The research methodology this insight came from';
COMMENT ON COLUMN public.insights.source_type IS 'automated: from AI analysis, manual: user-created';

-- ============================================================================
-- ANALYSIS NAME FIELD
-- Add optional name field to analyses for better organization
-- ============================================================================

ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.analyses.name IS 'Optional user-friendly name for this analysis';
