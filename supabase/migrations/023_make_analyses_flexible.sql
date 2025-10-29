-- Migration: Make Analyses Table Flexible for Multiple Research Types
-- Date: 2025-10-29
-- Description: Remove NOT NULL constraints from page-analysis-specific columns

-- ============================================================================
-- MAKE PAGE-ANALYSIS COLUMNS NULLABLE
-- These columns are specific to page analysis and shouldn't be required
-- for other research types like Shopify, GA4, surveys, etc.
-- ============================================================================

-- Make url nullable (only needed for page analysis)
ALTER TABLE public.analyses
ALTER COLUMN url DROP NOT NULL;

-- Make metrics nullable (only needed for page analysis)
ALTER TABLE public.analyses
ALTER COLUMN metrics DROP NOT NULL;

-- Make context nullable (only needed for page analysis)
ALTER TABLE public.analyses
ALTER COLUMN context DROP NOT NULL;

COMMENT ON COLUMN public.analyses.url IS 'URL analyzed (only for page_analysis research type)';
COMMENT ON COLUMN public.analyses.metrics IS 'Page metrics (only for page_analysis research type)';
COMMENT ON COLUMN public.analyses.context IS 'Page context (only for page_analysis research type)';

-- The summary column stays NOT NULL as all research types should have a summary
COMMENT ON COLUMN public.analyses.summary IS 'Analysis summary (required for all research types)';
