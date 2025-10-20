/**
 * AI Collaboration System Types
 * Chat, Manual Entry, Hypothesis Management, and Personalization
 */

// =====================================================
// CHAT SYSTEM
// =====================================================

export interface ChatConversation {
  id: string;
  user_id: string;
  analysis_id?: string;
  title: string;
  context: Record<string, unknown>;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    tokens?: number;
    model?: string;
    [key: string]: unknown;
  };
  created_at: Date;
}

export interface ChatRequest {
  conversation_id?: string; // Optional - creates new conversation if not provided
  message: string;
  context?: {
    analysis_id?: string;
    insights?: unknown[];
    themes?: unknown[];
    hypotheses?: unknown[];
    url?: string;
  };
}

export interface ChatResponse {
  conversation_id: string;
  message: ChatMessage;
  suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
  type: 'refine_insight' | 'add_insight' | 'create_hypothesis' | 'run_analysis' | 'create_experiment';
  label: string;
  description: string;
  data: Record<string, unknown>;
}

// =====================================================
// MANUAL ENTRY & EDITING
// =====================================================

export interface CustomInsight {
  id: string;
  user_id: string;
  analysis_id?: string;

  // Content
  type: 'observation' | 'problem' | 'opportunity' | 'risk';
  category: 'ux' | 'messaging' | 'trust' | 'urgency' | 'value_prop' | 'friction' | 'conversion' | 'engagement';
  title: string;
  description: string;
  evidence: InsightEvidence[];

  // Metadata
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  impact_score: number; // 0-100
  effort_estimate: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';

  location: {
    section: string;
    selector?: string;
    coordinates?: { x: number; y: number };
  };
  tags: string[];

  // Validation
  is_validated: boolean;
  validated_at?: Date;
  validated_by?: string;

  // Source
  source: 'manual' | 'ai_generated' | 'ai_edited';
  original_insight_id?: string;

  created_at: Date;
  updated_at: Date;
}

export interface InsightEvidence {
  type: 'text' | 'image' | 'metric' | 'behavior';
  content: string;
  source?: string;
  timestamp?: Date;
}

export interface InsightValidation {
  id: string;
  insight_id: string;
  insight_type: 'ai_generated' | 'custom';
  user_id: string;
  validation_status: 'validated' | 'rejected' | 'needs_review';
  feedback?: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CreateCustomInsightRequest {
  analysis_id?: string;
  type: CustomInsight['type'];
  category: CustomInsight['category'];
  title: string;
  description: string;
  evidence?: InsightEvidence[];
  severity?: CustomInsight['severity'];
  confidence?: number;
  impact_score?: number;
  effort_estimate?: CustomInsight['effort_estimate'];
  location?: CustomInsight['location'];
  tags?: string[];
}

export interface UpdateCustomInsightRequest extends Partial<CreateCustomInsightRequest> {
  id: string;
}

// =====================================================
// HYPOTHESIS & EXPERIMENT MANAGEMENT
// =====================================================

export interface Experiment {
  id: string;
  user_id: string;
  analysis_id?: string;
  hypothesis_id?: string;

  // Details
  name: string;
  description?: string;
  hypothesis_statement: string; // "If we X, then Y because Z"

  // Configuration
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Metrics
  primary_metric: string;
  secondary_metrics: string[];
  expected_lift_min?: number;
  expected_lift_max?: number;

  // Timeline
  start_date?: Date;
  end_date?: Date;
  duration_days?: number;

  // Results
  actual_lift?: number;
  statistical_significance?: number;
  winner?: 'control' | 'variation' | 'inconclusive';
  results: Record<string, unknown>;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  created_at: Date;
  updated_at: Date;
}

export interface ExperimentVariation {
  id: string;
  experiment_id: string;

  name: string;
  description?: string;
  is_control: boolean;

  // Implementation
  changes: Record<string, unknown>; // { "hero_headline": "New text", "cta_color": "#FF0000" }
  implementation_code?: string;
  screenshots: string[];

  // Traffic allocation
  traffic_percentage: number; // 0-100

  // Results
  conversions: number;
  visitors: number;
  conversion_rate?: number;

  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExperimentRequest {
  name: string;
  hypothesis_statement: string;
  description?: string;
  analysis_id?: string;
  hypothesis_id?: string;
  primary_metric: string;
  secondary_metrics?: string[];
  expected_lift_min?: number;
  expected_lift_max?: number;
  priority?: Experiment['priority'];
}

export interface CreateVariationRequest {
  experiment_id: string;
  name: string;
  description?: string;
  is_control?: boolean;
  changes: Record<string, unknown>;
  implementation_code?: string;
  traffic_percentage?: number;
}

export interface UpdateExperimentResultsRequest {
  experiment_id: string;
  variation_id: string;
  conversions: number;
  visitors: number;
}

// =====================================================
// PERSONALIZATION & USER PREFERENCES
// =====================================================

export interface UserPreferences {
  user_id: string;

  // Analysis Preferences
  default_llm_provider: 'gpt' | 'claude';
  auto_generate_themes: boolean;
  auto_generate_hypotheses: boolean;

  // UI Preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;

  // Notification Preferences
  email_notifications: boolean;
  analysis_complete_notification: boolean;
  experiment_complete_notification: boolean;

  // Industry & Context
  primary_industry?: string;
  business_type?: string;
  company_size?: string;

  // AI Behavior
  ai_temperature: number; // 0-1
  ai_verbosity: 'concise' | 'balanced' | 'detailed';
  ai_personality: 'professional' | 'casual' | 'technical';

  // Custom Settings
  custom_settings: Record<string, unknown>;

  created_at: Date;
  updated_at: Date;
}

export interface AnalysisTemplate {
  id: string;
  user_id: string;

  name: string;
  description?: string;

  // Template Configuration
  config: {
    llmProvider?: 'gpt' | 'claude';
    generateThemes?: boolean;
    generateHypotheses?: boolean;
    customPrompts?: Record<string, string>;
    [key: string]: unknown;
  };

  // Usage tracking
  is_default: boolean;
  use_count: number;
  last_used_at?: Date;

  // Sharing
  is_public: boolean;

  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface UserLearningData {
  id: string;
  user_id: string;

  data_type: 'validated_insight' | 'rejected_insight' | 'experiment_result' | 'preferred_hypothesis' | 'custom_pattern';
  data: Record<string, unknown>;

  // Scoring for ML
  relevance_score?: number;
  frequency_count: number;

  created_at: Date;
  updated_at: Date;
}

export interface UpdatePreferencesRequest extends Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>> {}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  config: AnalysisTemplate['config'];
  is_default?: boolean;
  is_public?: boolean;
}

// =====================================================
// API RESPONSES
// =====================================================

export interface AIAssistantResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  suggested_actions?: SuggestedAction[];
  error?: string;
}

export interface InsightSuggestion {
  type: 'edit' | 'merge' | 'split' | 'delete';
  reason: string;
  suggested_change: Partial<CustomInsight>;
}
