-- Migration: Add Flexible Analysis Fields
-- Date: 2025-10-29
-- Description: Add input_data and insights columns to analyses table to support various research types

-- ============================================================================
-- ADD FLEXIBLE FIELDS TO ANALYSES TABLE
-- ============================================================================

-- Add input_data column for storing varied input parameters (JSONB for flexibility)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS input_data JSONB;

COMMENT ON COLUMN public.analyses.input_data IS 'Flexible input data for different research types (e.g., connectionId for Shopify, propertyId for GA4)';

-- Add insights column for storing analysis-specific insights (separate from formal insights table)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS insights JSONB;

COMMENT ON COLUMN public.analyses.insights IS 'Analysis-specific insights and results (flexible structure per research type)';

-- Update research_type constraint to include shopify_order_analysis
ALTER TABLE public.analyses
DROP CONSTRAINT IF EXISTS analyses_research_type_check;

ALTER TABLE public.analyses
ADD CONSTRAINT analyses_research_type_check
CHECK (research_type IN (
  'page_analysis',
  'ga_analysis',
  'survey_analysis',
  'heatmap_analysis',
  'user_testing',
  'competitor_analysis',
  'review_mining',
  'onsite_poll',
  'shopify_order_analysis',
  'other'
));

-- Also update insights table constraint
ALTER TABLE public.insights
DROP CONSTRAINT IF EXISTS insights_research_type_check;

ALTER TABLE public.insights
ADD CONSTRAINT insights_research_type_check
CHECK (research_type IN (
  'page_analysis',
  'ga_analysis',
  'survey_analysis',
  'heatmap_analysis',
  'user_testing',
  'competitor_analysis',
  'review_mining',
  'onsite_poll',
  'shopify_order_analysis',
  'other'
));
