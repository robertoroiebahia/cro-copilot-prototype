-- Migration: Comprehensive Research Schema
-- Date: 2025-10-20
-- Description: Enhance insights, themes, and experiments tables with full research-focused fields
-- This is our main selling proposition - being crazy about research!

-- ============================================================================
-- ENHANCED INSIGHTS TABLE
-- ============================================================================

-- Add title field (required)
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add status field for insight lifecycle
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'validated', 'archived'));

-- Add source_url for linking to research docs
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Rename segment to customer_segment for clarity
ALTER TABLE public.insights
RENAME COLUMN segment TO customer_segment;

-- Add journey_stage field
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS journey_stage TEXT
CHECK (journey_stage IN ('awareness', 'consideration', 'decision', 'post_purchase'));

-- Change location from text to array (page_location)
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS page_location TEXT[];

-- Add device_type field
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS device_type TEXT
CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'all'));

-- Update growth_pillar to be required with proper enum
ALTER TABLE public.insights
ALTER COLUMN growth_pillar SET NOT NULL,
ALTER COLUMN growth_pillar SET DEFAULT 'conversion',
ADD CONSTRAINT growth_pillar_check CHECK (growth_pillar IN ('conversion', 'aov', 'frequency', 'retention', 'acquisition'));

-- Add affected_kpis array
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS affected_kpis TEXT[];

-- Add priority field
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- Add current_performance baseline metric
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS current_performance TEXT;

-- Add tags array for categorization
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add friction_type for UX issues
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS friction_type TEXT
CHECK (friction_type IN ('usability', 'trust', 'value_perception', 'information_gap', 'cognitive_load'));

-- Add psychology_principle
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS psychology_principle TEXT
CHECK (psychology_principle IN ('loss_aversion', 'social_proof', 'scarcity', 'authority', 'anchoring'));

-- Add validation_status
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'untested'
CHECK (validation_status IN ('untested', 'testing', 'validated', 'invalidated'));

-- Add suggested_actions text field
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS suggested_actions TEXT;

-- Add created_by user reference
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Rename confidence to confidence_level for clarity
ALTER TABLE public.insights
RENAME COLUMN confidence TO confidence_level;

-- Update existing insights to have a title (copy from statement for now)
UPDATE public.insights
SET title = LEFT(statement, 100)
WHERE title IS NULL;

-- Make title required after backfilling
ALTER TABLE public.insights
ALTER COLUMN title SET NOT NULL;

-- Update existing insights to have created_by from their analysis
UPDATE public.insights i
SET created_by = a.user_id
FROM public.analyses a
WHERE i.analysis_id = a.id
AND i.created_by IS NULL;

-- Copy location to page_location array
UPDATE public.insights
SET page_location = ARRAY[location]
WHERE location IS NOT NULL AND page_location IS NULL;

-- Drop old location column
ALTER TABLE public.insights
DROP COLUMN IF EXISTS location;

-- Indexes for new insights fields
CREATE INDEX idx_insights_title ON public.insights(title);
CREATE INDEX idx_insights_status ON public.insights(status);
CREATE INDEX idx_insights_journey_stage ON public.insights(journey_stage) WHERE journey_stage IS NOT NULL;
CREATE INDEX idx_insights_device_type ON public.insights(device_type) WHERE device_type IS NOT NULL;
CREATE INDEX idx_insights_priority ON public.insights(priority);
CREATE INDEX idx_insights_validation_status ON public.insights(validation_status);
CREATE INDEX idx_insights_created_by ON public.insights(created_by);
CREATE INDEX idx_insights_tags ON public.insights USING GIN (tags);
CREATE INDEX idx_insights_page_location ON public.insights USING GIN (page_location);
CREATE INDEX idx_insights_affected_kpis ON public.insights USING GIN (affected_kpis);

-- Comments for documentation
COMMENT ON COLUMN public.insights.title IS 'Short descriptive title (max 100 chars)';
COMMENT ON COLUMN public.insights.status IS 'Insight lifecycle: draft, validated, archived';
COMMENT ON COLUMN public.insights.source_url IS 'Link to research doc/test/report';
COMMENT ON COLUMN public.insights.customer_segment IS 'Customer segment (e.g., First-time buyers, Mobile users)';
COMMENT ON COLUMN public.insights.journey_stage IS 'Customer journey stage: awareness, consideration, decision, post_purchase';
COMMENT ON COLUMN public.insights.page_location IS 'Where on page: homepage, pdp, cart, checkout, plp';
COMMENT ON COLUMN public.insights.device_type IS 'Device context: mobile, desktop, tablet, all';
COMMENT ON COLUMN public.insights.affected_kpis IS 'KPIs impacted (e.g., Mobile ATC Rate, CVR, Bounce Rate)';
COMMENT ON COLUMN public.insights.priority IS 'Business priority: critical, high, medium, low';
COMMENT ON COLUMN public.insights.current_performance IS 'Baseline metric (e.g., Mobile ATC: 8.92%)';
COMMENT ON COLUMN public.insights.tags IS 'Tags for categorization (e.g., #mobile, #trust, #friction)';
COMMENT ON COLUMN public.insights.friction_type IS 'Type of UX friction: usability, trust, value_perception, information_gap, cognitive_load';
COMMENT ON COLUMN public.insights.psychology_principle IS 'Psychology principle: loss_aversion, social_proof, scarcity, authority, anchoring';
COMMENT ON COLUMN public.insights.validation_status IS 'Validation state: untested, testing, validated, invalidated';
COMMENT ON COLUMN public.insights.suggested_actions IS 'Initial ideas/recommendations';
COMMENT ON COLUMN public.insights.created_by IS 'User who created this insight';

-- ============================================================================
-- ENHANCED THEMES TABLE
-- ============================================================================

-- Rename name to title
ALTER TABLE public.themes
RENAME COLUMN name TO title;

-- Add status field
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'archived'));

-- Rename statement to theme_statement for clarity
ALTER TABLE public.themes
RENAME COLUMN statement TO theme_statement;

-- Add growth_pillar field
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS growth_pillar TEXT NOT NULL DEFAULT 'conversion'
CHECK (growth_pillar IN ('conversion', 'aov', 'frequency', 'retention', 'acquisition'));

-- Add affected_pages array
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS affected_pages TEXT[];

-- Add current_performance baseline
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS current_performance TEXT;

-- Add opportunity_calculation JSON
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS opportunity_calculation JSONB;

-- Add created_by user reference
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Add user_id for RLS (themes belong to users)
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);

-- Indexes for new themes fields
CREATE INDEX idx_themes_status ON public.themes(status);
CREATE INDEX idx_themes_growth_pillar ON public.themes(growth_pillar);
CREATE INDEX idx_themes_created_by ON public.themes(created_by);
CREATE INDEX idx_themes_user_id ON public.themes(user_id);
CREATE INDEX idx_themes_affected_pages ON public.themes USING GIN (affected_pages);
CREATE INDEX idx_themes_opportunity_calculation ON public.themes USING GIN (opportunity_calculation);

-- Comments for documentation
COMMENT ON COLUMN public.themes.title IS 'Descriptive theme name (max 150 chars)';
COMMENT ON COLUMN public.themes.status IS 'Theme status: active, archived';
COMMENT ON COLUMN public.themes.theme_statement IS '2-3 sentences synthesizing the pattern';
COMMENT ON COLUMN public.themes.growth_pillar IS 'Primary growth area: conversion, aov, frequency, retention, acquisition';
COMMENT ON COLUMN public.themes.affected_pages IS 'Pages/flows impacted (e.g., homepage, pdp, cart)';
COMMENT ON COLUMN public.themes.current_performance IS 'Baseline metrics';
COMMENT ON COLUMN public.themes.opportunity_calculation IS 'Opportunity sizing: can_calculate, method, inputs, scenarios, calculated_by, calculated_at, data_sources';
COMMENT ON COLUMN public.themes.created_by IS 'User who created this theme';
COMMENT ON COLUMN public.themes.user_id IS 'User who owns this theme';

-- Update RLS policies for themes to use user_id
DROP POLICY IF EXISTS "Authenticated users can view themes" ON public.themes;
DROP POLICY IF EXISTS "Authenticated users can create themes" ON public.themes;
DROP POLICY IF EXISTS "Authenticated users can update themes" ON public.themes;

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

-- ============================================================================
-- ENHANCED EXPERIMENTS TABLE
-- ============================================================================

-- Rename experiment_id to experiment_number
ALTER TABLE public.experiments
RENAME COLUMN experiment_id TO experiment_number;

-- Add title field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing experiments to have title from test_spec.name
UPDATE public.experiments
SET title = test_spec->>'name'
WHERE title IS NULL AND test_spec IS NOT NULL;

-- Make title required
ALTER TABLE public.experiments
ALTER COLUMN title SET NOT NULL;

-- Add hypothesis text field (extracted from test_spec or hypothesis_id)
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS hypothesis TEXT;

-- Add page_location array
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS page_location TEXT[];

-- Add device_target field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS device_target TEXT
CHECK (device_target IN ('mobile', 'desktop', 'all'));

-- Add growth_pillar field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS growth_pillar TEXT NOT NULL DEFAULT 'conversion'
CHECK (growth_pillar IN ('conversion', 'aov', 'frequency', 'retention', 'acquisition'));

-- Add primary_kpi field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS primary_kpi TEXT;

-- Add secondary_kpis array
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS secondary_kpis TEXT[];

-- Add expected_impact JSON
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS expected_impact JSONB;

-- Add actual_impact JSON
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS actual_impact JSONB;

-- Add result enum
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS result TEXT
CHECK (result IN ('win', 'loss', 'inconclusive', 'null'));

-- Add takeaway text field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS takeaway TEXT;

-- Add customer_learning text field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS customer_learning TEXT;

-- Add action_taken enum
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS action_taken TEXT
CHECK (action_taken IN ('implemented', 'saved', 'iterate', 'archived'));

-- Rename started_at to start_date and completed_at to end_date
ALTER TABLE public.experiments
RENAME COLUMN started_at TO start_date;

ALTER TABLE public.experiments
RENAME COLUMN completed_at TO end_date;

-- Add test_platform field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS test_platform TEXT;

-- Add test_url field
ALTER TABLE public.experiments
ADD COLUMN IF NOT EXISTS test_url TEXT;

-- Indexes for new experiments fields
CREATE INDEX idx_experiments_title ON public.experiments(title);
CREATE INDEX idx_experiments_growth_pillar ON public.experiments(growth_pillar);
CREATE INDEX idx_experiments_device_target ON public.experiments(device_target) WHERE device_target IS NOT NULL;
CREATE INDEX idx_experiments_primary_kpi ON public.experiments(primary_kpi) WHERE primary_kpi IS NOT NULL;
CREATE INDEX idx_experiments_result ON public.experiments(result) WHERE result IS NOT NULL;
CREATE INDEX idx_experiments_action_taken ON public.experiments(action_taken) WHERE action_taken IS NOT NULL;
CREATE INDEX idx_experiments_page_location ON public.experiments USING GIN (page_location);
CREATE INDEX idx_experiments_secondary_kpis ON public.experiments USING GIN (secondary_kpis);
CREATE INDEX idx_experiments_expected_impact ON public.experiments USING GIN (expected_impact);
CREATE INDEX idx_experiments_actual_impact ON public.experiments USING GIN (actual_impact);

-- Comments for documentation
COMMENT ON COLUMN public.experiments.experiment_number IS 'Experiment identifier (e.g., EXP-001, 45-1-R-PDP-Test)';
COMMENT ON COLUMN public.experiments.title IS 'Experiment name (max 150 chars)';
COMMENT ON COLUMN public.experiments.hypothesis IS 'If [change] then [expected result] because [reason]';
COMMENT ON COLUMN public.experiments.page_location IS 'Pages/flows tested (e.g., homepage, pdp, cart)';
COMMENT ON COLUMN public.experiments.device_target IS 'Device targeting: mobile, desktop, all';
COMMENT ON COLUMN public.experiments.growth_pillar IS 'Primary growth area: conversion, aov, frequency, retention, acquisition';
COMMENT ON COLUMN public.experiments.primary_kpi IS 'Primary success metric (e.g., CVR, ATC Rate)';
COMMENT ON COLUMN public.experiments.secondary_kpis IS 'Additional metrics to track';
COMMENT ON COLUMN public.experiments.expected_impact IS 'Predicted impact on metrics';
COMMENT ON COLUMN public.experiments.actual_impact IS 'Measured impact on metrics';
COMMENT ON COLUMN public.experiments.result IS 'Test outcome: win, loss, inconclusive, null';
COMMENT ON COLUMN public.experiments.takeaway IS 'Key learning from test';
COMMENT ON COLUMN public.experiments.customer_learning IS 'What we learned about customers';
COMMENT ON COLUMN public.experiments.action_taken IS 'Next step: implemented, saved, iterate, archived';
COMMENT ON COLUMN public.experiments.start_date IS 'Test start date';
COMMENT ON COLUMN public.experiments.end_date IS 'Test end date';
COMMENT ON COLUMN public.experiments.test_platform IS 'Testing platform (e.g., VWO, Optimizely, Fermat)';
COMMENT ON COLUMN public.experiments.test_url IS 'Link to test in platform';
