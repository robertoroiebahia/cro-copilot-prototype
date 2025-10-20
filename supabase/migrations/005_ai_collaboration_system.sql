-- AI Collaboration System
-- Chat, Manual Entry, Hypothesis Management, and Personalization

-- =====================================================
-- CHAT SYSTEM
-- =====================================================

-- Chat Conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id TEXT, -- Link to analysis if chat is about specific analysis
  title TEXT NOT NULL DEFAULT 'New Conversation',
  context JSONB DEFAULT '{}', -- Store relevant context (insights, themes, etc.)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_analysis ON chat_conversations(analysis_id);
CREATE INDEX idx_chat_conversations_status ON chat_conversations(status);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store tokens, model, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- =====================================================
-- MANUAL ENTRY & EDITING SYSTEM
-- =====================================================

-- Custom Insights (User-created or AI-edited)
CREATE TABLE custom_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id TEXT, -- Optional link to analysis

  -- Insight Content
  type TEXT NOT NULL CHECK (type IN ('observation', 'problem', 'opportunity', 'risk')),
  category TEXT NOT NULL CHECK (category IN ('ux', 'messaging', 'trust', 'urgency', 'value_prop', 'friction', 'conversion', 'engagement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',

  -- Metadata
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  impact_score INTEGER DEFAULT 50 CHECK (impact_score >= 0 AND impact_score <= 100),
  effort_estimate TEXT DEFAULT 'medium' CHECK (effort_estimate IN ('trivial', 'small', 'medium', 'large', 'xlarge')),

  location JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Validation
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_generated', 'ai_edited')),
  original_insight_id UUID, -- If edited from AI insight

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_insights_user ON custom_insights(user_id);
CREATE INDEX idx_custom_insights_analysis ON custom_insights(analysis_id);
CREATE INDEX idx_custom_insights_validated ON custom_insights(is_validated);
CREATE INDEX idx_custom_insights_source ON custom_insights(source);

-- Insight Validations (Track validation history)
CREATE TABLE insight_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL, -- Can reference any insight
  insight_type TEXT NOT NULL CHECK (insight_type IN ('ai_generated', 'custom')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  validation_status TEXT NOT NULL CHECK (validation_status IN ('validated', 'rejected', 'needs_review')),
  feedback TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insight_validations_insight ON insight_validations(insight_id, insight_type);
CREATE INDEX idx_insight_validations_user ON insight_validations(user_id);

-- =====================================================
-- HYPOTHESIS & EXPERIMENT MANAGEMENT
-- =====================================================

-- Experiments (A/B Tests)
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id TEXT,
  hypothesis_id UUID, -- Link to hypothesis if generated from one

  -- Experiment Details
  name TEXT NOT NULL,
  description TEXT,
  hypothesis_statement TEXT NOT NULL, -- "If we X, then Y because Z"

  -- Configuration
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Metrics
  primary_metric TEXT NOT NULL, -- e.g., "conversion_rate"
  secondary_metrics TEXT[] DEFAULT '{}',
  expected_lift_min INTEGER,
  expected_lift_max INTEGER,

  -- Timeline
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_days INTEGER,

  -- Results
  actual_lift NUMERIC,
  statistical_significance NUMERIC,
  winner TEXT CHECK (winner IN ('control', 'variation', 'inconclusive')),
  results JSONB DEFAULT '{}',

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiments_user ON experiments(user_id);
CREATE INDEX idx_experiments_analysis ON experiments(analysis_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_hypothesis ON experiments(hypothesis_id);

-- Experiment Variations
CREATE TABLE experiment_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- "Control", "Variation A", etc.
  description TEXT,
  is_control BOOLEAN DEFAULT FALSE,

  -- Implementation
  changes JSONB NOT NULL DEFAULT '{}', -- { "hero_headline": "New text", "cta_color": "#FF0000" }
  implementation_code TEXT,
  screenshots TEXT[], -- URLs to screenshots

  -- Traffic allocation
  traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),

  -- Results
  conversions INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  conversion_rate NUMERIC,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiment_variations_experiment ON experiment_variations(experiment_id);

-- =====================================================
-- PERSONALIZATION & USER PREFERENCES
-- =====================================================

-- User Preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Analysis Preferences
  default_llm_provider TEXT DEFAULT 'gpt' CHECK (default_llm_provider IN ('gpt', 'claude')),
  auto_generate_themes BOOLEAN DEFAULT TRUE,
  auto_generate_hypotheses BOOLEAN DEFAULT TRUE,

  -- UI Preferences
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',

  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  analysis_complete_notification BOOLEAN DEFAULT TRUE,
  experiment_complete_notification BOOLEAN DEFAULT TRUE,

  -- Industry & Context
  primary_industry TEXT,
  business_type TEXT,
  company_size TEXT,

  -- AI Behavior
  ai_temperature NUMERIC DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 1),
  ai_verbosity TEXT DEFAULT 'balanced' CHECK (ai_verbosity IN ('concise', 'balanced', 'detailed')),
  ai_personality TEXT DEFAULT 'professional' CHECK (ai_personality IN ('professional', 'casual', 'technical')),

  -- Custom Settings
  custom_settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analysis Templates (Custom Workflows)
CREATE TABLE analysis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Template Configuration
  config JSONB NOT NULL DEFAULT '{}', -- { llmProvider, generateThemes, customPrompts, etc. }

  -- Usage tracking
  is_default BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_templates_user ON analysis_templates(user_id);
CREATE INDEX idx_analysis_templates_public ON analysis_templates(is_public);

-- Learning Data (AI learns from user patterns)
CREATE TABLE user_learning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  data_type TEXT NOT NULL CHECK (data_type IN ('validated_insight', 'rejected_insight', 'experiment_result', 'preferred_hypothesis', 'custom_pattern')),

  data JSONB NOT NULL DEFAULT '{}',

  -- Scoring for ML
  relevance_score NUMERIC,
  frequency_count INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_learning_data_user ON user_learning_data(user_id);
CREATE INDEX idx_user_learning_data_type ON user_learning_data(data_type);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Chat Conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Custom Insights
ALTER TABLE custom_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom insights"
  ON custom_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom insights"
  ON custom_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom insights"
  ON custom_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom insights"
  ON custom_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Insight Validations
ALTER TABLE insight_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own validations"
  ON insight_validations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own validations"
  ON insight_validations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Experiments
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiments"
  ON experiments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own experiments"
  ON experiments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiments"
  ON experiments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiments"
  ON experiments FOR DELETE
  USING (auth.uid() = user_id);

-- Experiment Variations
ALTER TABLE experiment_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variations of own experiments"
  ON experiment_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_variations.experiment_id
      AND experiments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create variations for own experiments"
  ON experiment_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_id
      AND experiments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update variations of own experiments"
  ON experiment_variations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_variations.experiment_id
      AND experiments.user_id = auth.uid()
    )
  );

-- User Preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Analysis Templates
ALTER TABLE analysis_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates and public templates"
  ON analysis_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create own templates"
  ON analysis_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON analysis_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON analysis_templates FOR DELETE
  USING (auth.uid() = user_id);

-- User Learning Data
ALTER TABLE user_learning_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning data"
  ON user_learning_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert learning data"
  ON user_learning_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_insights_updated_at
  BEFORE UPDATE ON custom_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiment_variations_updated_at
  BEFORE UPDATE ON experiment_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_templates_updated_at
  BEFORE UPDATE ON analysis_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_data_updated_at
  BEFORE UPDATE ON user_learning_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update chat conversation updated_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();
