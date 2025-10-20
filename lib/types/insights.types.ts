// TypeScript types for the Insights Research System
// Based on database schema in migrations 004, 005, and 007

// ============================================================================
// RESEARCH TYPES (Methodologies)
// ============================================================================

export type ResearchType =
  | 'page_analysis'        // Screenshot-based CRO analysis (current)
  | 'ga_analysis'          // Google Analytics data analysis
  | 'survey_analysis'      // Post-purchase surveys, user surveys
  | 'heatmap_analysis'     // Heatmap & session recording analysis
  | 'user_testing'         // Moderated/unmoderated user testing
  | 'competitor_analysis'  // Competitive research
  | 'other';               // Other research methodologies

export const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  page_analysis: 'Page Analysis',
  ga_analysis: 'Google Analytics',
  survey_analysis: 'Survey Analysis',
  heatmap_analysis: 'Heatmap Analysis',
  user_testing: 'User Testing',
  competitor_analysis: 'Competitor Analysis',
  other: 'Other Research',
};

export const RESEARCH_TYPE_ICONS: Record<ResearchType, string> = {
  page_analysis: '📸',
  ga_analysis: '📊',
  survey_analysis: '📋',
  heatmap_analysis: '🔥',
  user_testing: '👥',
  competitor_analysis: '🔍',
  other: '📝',
};

// ============================================================================
// INSIGHTS
// ============================================================================

export interface Evidence {
  quantitative?: {
    metric: string;
    value: string;
    sample_size?: number;
    comparison?: string;
  };
  qualitative?: {
    quotes: string[];
    sources: string[];
  };
}

export interface Source {
  type: 'heatmap' | 'survey' | 'analytics' | 'user_testing' | 'review_analysis';
  name: string;
  date: string;
}

export interface Sources {
  primary: Source;
  supporting?: Source[];
}

export interface Insight {
  id: string;
  analysis_id?: string; // Optional - manual insights may not have analysis_id
  research_type?: ResearchType; // The research methodology used
  insight_id: string; // e.g., "INS-001"
  statement: string;
  segment?: string; // "First-time buyers", "Mobile users"
  location?: string; // "Hero section", "Product details"
  evidence: Evidence;
  sources: Sources;
  growth_pillar?: 'Conversion' | 'Spend' | 'Frequency' | 'Merchandise';
  confidence: 'high' | 'medium' | 'low';
  source_type: 'automated' | 'manual'; // automated: from AI, manual: user-created
  created_at: string;
  updated_at: string;
}

// ============================================================================
// THEMES
// ============================================================================

export interface ConnectedInsight {
  insightId: string;
  relevance: 'primary' | 'supporting' | 'related';
}

export interface BusinessImpact {
  description: string;
  estimatedValue?: {
    metric: string;
    currentValue: string;
    potentialValue: string;
    annualImpact: string;
  };
}

export interface RecommendedAction {
  type: 'quick_fix' | 'strategic' | 'research';
  description: string;
  expectedImpact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

export interface Theme {
  id: string;
  theme_id: string; // e.g., "THM-001"
  name: string;
  statement: string;
  connected_insights: ConnectedInsight[];
  business_impact: BusinessImpact;
  recommended_actions?: RecommendedAction[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HYPOTHESES
// ============================================================================

export interface BasedOnInsight {
  insightId: string;
  weight: number;
}

export interface ExpectedImpact {
  metric: string;
  baseline: string;
  predicted: string;
  lift: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface TestVariant {
  name: string;
  description: string;
}

export interface TestDesign {
  testType: 'A/B' | 'multivariate' | 'sequential';
  variants: TestVariant[];
  successMetrics: string[];
  sampleSize: number;
  duration: string;
}

export interface Hypothesis {
  id: string;
  hypothesis_id: string; // e.g., "HYP-001"
  theme_id?: string;
  statement: string; // "If we [change], then [outcome] because [reasoning]"
  based_on_insights: BasedOnInsight[];
  expected_impact: ExpectedImpact;
  test_design?: TestDesign;
  status: 'draft' | 'approved' | 'testing' | 'validated' | 'invalidated' | 'archived';
  priority?: 'P0' | 'P1' | 'P2';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXPERIMENTS
// ============================================================================

export interface ExperimentVariantResult {
  conversions: number;
  visitors: number;
  conversionRate: string;
}

export interface ExperimentResults {
  control: ExperimentVariantResult;
  treatment: ExperimentVariantResult;
  lift: string;
  statisticalSignificance: string;
  winner: 'control' | 'treatment' | 'inconclusive';
}

export interface Learnings {
  insights: string[];
  nextSteps: string[];
  unexpectedFindings: string[];
}

export interface Experiment {
  id: string;
  experiment_id: string; // e.g., "EXP-001"
  hypothesis_id?: string;
  user_id: string;
  test_spec: {
    name: string;
    description: string;
    variants: TestVariant[];
    successMetrics: string[];
    sampleSize: number;
    duration: string;
    platform?: string;
  };
  results?: ExperimentResults;
  learnings?: Learnings;
  status: 'not_started' | 'running' | 'completed' | 'paused' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

// ============================================================================
// CHAT SYSTEM
// ============================================================================

export interface ChatConversation {
  id: string;
  user_id: string;
  analysis_id?: string;
  title: string;
  context: Record<string, any>;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// CUSTOM INSIGHTS
// ============================================================================

export interface CustomInsight {
  id: string;
  user_id: string;
  analysis_id?: string;
  type: 'observation' | 'problem' | 'opportunity' | 'risk';
  category: 'ux' | 'messaging' | 'trust' | 'urgency' | 'value_prop' | 'friction' | 'conversion' | 'engagement';
  title: string;
  description: string;
  evidence: any[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  impact_score: number; // 0-100
  effort_estimate: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
  location: Record<string, any>;
  tags: string[];
  is_validated: boolean;
  validated_at?: string;
  validated_by?: string;
  source: 'manual' | 'ai_generated' | 'ai_edited';
  original_insight_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
  user_id: string;
  default_llm_provider: 'gpt' | 'claude';
  auto_generate_themes: boolean;
  auto_generate_hypotheses: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  analysis_complete_notification: boolean;
  experiment_complete_notification: boolean;
  primary_industry?: string;
  business_type?: string;
  company_size?: string;
  ai_temperature: number;
  ai_verbosity: 'concise' | 'balanced' | 'detailed';
  ai_personality: 'professional' | 'casual' | 'technical';
  custom_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface InsightWithThemes extends Insight {
  themes?: Theme[];
}

export interface ThemeWithInsights extends Theme {
  insights?: Insight[];
  hypotheses?: Hypothesis[];
}

export interface HypothesisWithRelations extends Hypothesis {
  theme?: Theme;
  insights?: Insight[];
  experiment?: Experiment;
}

export interface ResearchFlowSummary {
  analysisId: string;
  insightsCount: number;
  themesCount: number;
  hypothesesCount: number;
  experimentsCount: number;
  topPriorityTheme?: Theme;
  activeExperiments: number;
}
