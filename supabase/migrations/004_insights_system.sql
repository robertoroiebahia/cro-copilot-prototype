-- Migration: Insights System Tables
-- Date: 2025-10-20
-- Description: Add support for insights → themes → hypotheses → experiments workflow

-- ============================================================================
-- INSIGHTS TABLE
-- Stores atomic observations with evidence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to source analysis
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

  -- Insight identifier (e.g., "INS-001", "INS-002")
  insight_id TEXT NOT NULL UNIQUE,

  -- Core insight data
  statement TEXT NOT NULL, -- "[Segment] + [Observation] + [Evidence]"
  segment TEXT, -- Customer segment (e.g., "First-time buyers", "Mobile users")
  location TEXT, -- Where on page (e.g., "Hero section", "Product details")

  -- Evidence supporting the insight
  evidence JSONB NOT NULL,
  /* Structure:
  {
    "quantitative": {
      "metric": "conversion_rate",
      "value": "45%",
      "sample_size": 340,
      "comparison": "35% industry average"
    },
    "qualitative": {
      "quotes": ["Customer quote 1", "Customer quote 2"],
      "sources": ["Post-Purchase Survey", "User Testing Session #5"]
    }
  }
  */

  -- Research sources
  sources JSONB NOT NULL,
  /* Structure:
  {
    "primary": {
      "type": "heatmap|survey|analytics|user_testing|review_analysis",
      "name": "Exit Survey Q3",
      "date": "2025-10-15"
    },
    "supporting": [
      {
        "type": "analytics",
        "name": "GA4 Mobile Conversion",
        "date": "2025-10-01"
      }
    ]
  }
  */

  -- Metadata
  growth_pillar TEXT, -- "Conversion|Spend|Frequency|Merchandise"
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for insights
CREATE INDEX idx_insights_analysis_id ON public.insights(analysis_id);
CREATE INDEX idx_insights_insight_id ON public.insights(insight_id);
CREATE INDEX idx_insights_confidence ON public.insights(confidence);
CREATE INDEX idx_insights_segment ON public.insights(segment) WHERE segment IS NOT NULL;
CREATE INDEX idx_insights_evidence ON public.insights USING GIN (evidence);
CREATE INDEX idx_insights_sources ON public.insights USING GIN (sources);

-- RLS for insights
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for their analyses"
  ON public.insights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = insights.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create insights for their analyses"
  ON public.insights
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = insights.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update insights for their analyses"
  ON public.insights
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = insights.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete insights for their analyses"
  ON public.insights
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = insights.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- THEMES TABLE
-- Stores clustered patterns from 2-5 related insights
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Theme identifier (e.g., "THM-001", "THM-002")
  theme_id TEXT NOT NULL UNIQUE,

  -- Core theme data
  name TEXT NOT NULL, -- Short name (e.g., "Pre-Purchase Anxiety Blocks Mobile Conversion")
  statement TEXT NOT NULL, -- 2-3 sentences synthesizing the pattern

  -- Connected insights
  connected_insights JSONB NOT NULL,
  /* Structure:
  [
    {
      "insightId": "INS-037",
      "relevance": "primary|supporting|related"
    },
    {
      "insightId": "INS-041",
      "relevance": "primary"
    }
  ]
  */

  -- Business impact
  business_impact JSONB NOT NULL,
  /* Structure:
  {
    "description": "Mobile users abandon at checkout due to trust concerns",
    "estimatedValue": {
      "metric": "conversion_rate",
      "currentValue": "2.3%",
      "potentialValue": "3.8%",
      "annualImpact": "$2.4M"
    }
  }
  */

  -- Recommended actions
  recommended_actions JSONB,
  /* Structure:
  [
    {
      "type": "quick_fix|strategic|research",
      "description": "Add trust badges above checkout button",
      "expectedImpact": "medium",
      "effort": "low"
    }
  ]
  */

  -- Metadata
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for themes
CREATE INDEX idx_themes_theme_id ON public.themes(theme_id);
CREATE INDEX idx_themes_priority ON public.themes(priority);
CREATE INDEX idx_themes_connected_insights ON public.themes USING GIN (connected_insights);
CREATE INDEX idx_themes_business_impact ON public.themes USING GIN (business_impact);

-- RLS for themes
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- For now, themes are visible to all authenticated users (cross-user learning)
-- You can restrict this later if needed
CREATE POLICY "Authenticated users can view themes"
  ON public.themes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create themes"
  ON public.themes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update themes"
  ON public.themes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- HYPOTHESES TABLE
-- Stores testable predictions based on themes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Hypothesis identifier (e.g., "HYP-001", "HYP-002")
  hypothesis_id TEXT NOT NULL UNIQUE,

  -- Link to theme
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,

  -- Hypothesis statement
  statement TEXT NOT NULL,
  /* Format: "If we [change], then [outcome] because [reasoning]"
     Example: "If we add trust badges to mobile checkout, then conversion will increase by 15-25% because first-time buyers are concerned about security"
  */

  -- Supporting insights
  based_on_insights JSONB NOT NULL,
  /* Structure:
  [
    {
      "insightId": "INS-037",
      "weight": 0.6
    },
    {
      "insightId": "INS-041",
      "weight": 0.4
    }
  ]
  */

  -- Expected impact
  expected_impact JSONB NOT NULL,
  /* Structure:
  {
    "metric": "conversion_rate",
    "baseline": "2.3%",
    "predicted": "3.2%",
    "lift": "15-25%",
    "confidence": "medium"
  }
  */

  -- Test design
  test_design JSONB,
  /* Structure:
  {
    "testType": "A/B|multivariate|sequential",
    "variants": [
      {
        "name": "Control",
        "description": "Current state"
      },
      {
        "name": "Treatment",
        "description": "Add trust badges"
      }
    ],
    "successMetrics": ["conversion_rate", "add_to_cart_rate"],
    "sampleSize": 10000,
    "duration": "2 weeks"
  }
  */

  -- Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'testing', 'validated', 'invalidated', 'archived')),
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hypotheses
CREATE INDEX idx_hypotheses_hypothesis_id ON public.hypotheses(hypothesis_id);
CREATE INDEX idx_hypotheses_theme_id ON public.hypotheses(theme_id);
CREATE INDEX idx_hypotheses_status ON public.hypotheses(status);
CREATE INDEX idx_hypotheses_priority ON public.hypotheses(priority);
CREATE INDEX idx_hypotheses_based_on_insights ON public.hypotheses USING GIN (based_on_insights);

-- RLS for hypotheses
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hypotheses"
  ON public.hypotheses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create hypotheses"
  ON public.hypotheses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update hypotheses"
  ON public.hypotheses
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- EXPERIMENTS TABLE
-- Stores A/B test specifications and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Experiment identifier (e.g., "EXP-001", "EXP-002")
  experiment_id TEXT NOT NULL UNIQUE,

  -- Link to hypothesis
  hypothesis_id UUID REFERENCES public.hypotheses(id) ON DELETE SET NULL,

  -- User who created the experiment
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Test specification
  test_spec JSONB NOT NULL,
  /* Structure:
  {
    "name": "Mobile Trust Badge Test",
    "description": "Add security badges to mobile checkout",
    "variants": [...],
    "successMetrics": [...],
    "sampleSize": 10000,
    "duration": "2 weeks",
    "platform": "VWO|Optimizely|Google Optimize|Custom"
  }
  */

  -- Results
  results JSONB,
  /* Structure:
  {
    "control": {
      "conversions": 230,
      "visitors": 10000,
      "conversionRate": "2.3%"
    },
    "treatment": {
      "conversions": 320,
      "visitors": 10000,
      "conversionRate": "3.2%"
    },
    "lift": "39%",
    "statisticalSignificance": "99%",
    "winner": "treatment"
  }
  */

  -- Learnings extracted
  learnings JSONB,
  /* Structure:
  {
    "insights": ["New insight 1", "New insight 2"],
    "nextSteps": ["Action 1", "Action 2"],
    "unexpectedFindings": ["Finding 1"]
  }
  */

  -- Metadata
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'running', 'completed', 'paused', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for experiments
CREATE INDEX idx_experiments_experiment_id ON public.experiments(experiment_id);
CREATE INDEX idx_experiments_hypothesis_id ON public.experiments(hypothesis_id);
CREATE INDEX idx_experiments_user_id ON public.experiments(user_id);
CREATE INDEX idx_experiments_status ON public.experiments(status);
CREATE INDEX idx_experiments_results ON public.experiments USING GIN (results);

-- RLS for experiments
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

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
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER set_insights_updated_at
  BEFORE UPDATE ON public.insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_themes_updated_at
  BEFORE UPDATE ON public.themes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.insights IS 'Atomic observations with evidence from page analysis';
COMMENT ON TABLE public.themes IS 'Clustered patterns from 2-5 related insights';
COMMENT ON TABLE public.hypotheses IS 'Testable predictions based on themes';
COMMENT ON TABLE public.experiments IS 'A/B test specifications and results';

COMMENT ON COLUMN public.insights.insight_id IS 'Unique identifier like INS-001, INS-002';
COMMENT ON COLUMN public.insights.statement IS 'Format: [Segment] + [Observation] + [Evidence]';
COMMENT ON COLUMN public.insights.evidence IS 'Quantitative and qualitative evidence supporting the insight';

COMMENT ON COLUMN public.themes.theme_id IS 'Unique identifier like THM-001, THM-002';
COMMENT ON COLUMN public.themes.connected_insights IS 'Array of insight IDs with relevance weights';

COMMENT ON COLUMN public.hypotheses.hypothesis_id IS 'Unique identifier like HYP-001, HYP-002';
COMMENT ON COLUMN public.hypotheses.statement IS 'Format: If [change], then [outcome] because [reasoning]';

COMMENT ON COLUMN public.experiments.experiment_id IS 'Unique identifier like EXP-001, EXP-002';
COMMENT ON COLUMN public.experiments.status IS 'Experiment lifecycle status';
