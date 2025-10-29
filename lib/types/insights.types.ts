// TypeScript types for the Insights Research System
// Based on comprehensive database schema (migration 008)
// This is our main selling proposition - being crazy about research!

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
  | 'review_mining'        // Customer review analysis
  | 'onsite_poll'          // On-site poll analysis
  | 'other';               // Other research methodologies

export const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  page_analysis: 'Page Analysis',
  ga_analysis: 'Google Analytics',
  survey_analysis: 'Survey Analysis',
  heatmap_analysis: 'Heatmap Analysis',
  user_testing: 'User Testing',
  competitor_analysis: 'Competitor Analysis',
  review_mining: 'Review Mining',
  onsite_poll: 'On-Site Poll',
  other: 'Other Research',
};

export const RESEARCH_TYPE_ICONS: Record<ResearchType, string> = {
  page_analysis: 'PA',
  ga_analysis: 'GA',
  survey_analysis: 'SV',
  heatmap_analysis: 'HM',
  user_testing: 'UT',
  competitor_analysis: 'CA',
  review_mining: 'RM',
  onsite_poll: 'OP',
  other: 'OR',
};

// ============================================================================
// ENUMS FOR INSIGHTS
// ============================================================================

export type InsightStatus = 'draft' | 'validated' | 'archived';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type JourneyStage = 'awareness' | 'consideration' | 'decision' | 'post_purchase';
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'all';
export type GrowthPillar = 'conversion' | 'aov' | 'frequency' | 'retention' | 'acquisition';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type FrictionType = 'usability' | 'trust' | 'value_perception' | 'information_gap' | 'cognitive_load';
export type PsychologyPrinciple = 'loss_aversion' | 'social_proof' | 'scarcity' | 'authority' | 'anchoring';
export type ValidationStatus = 'untested' | 'testing' | 'validated' | 'invalidated';

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

  // Core identification
  insight_id: string; // e.g., "INS-001"
  title: string; // Short descriptive title (max 100 chars)
  status: InsightStatus; // draft, validated, archived

  // Analysis connection
  analysis_id?: string; // Optional - manual insights may not have analysis_id
  research_type: ResearchType; // The research methodology used
  source_type: 'automated' | 'manual'; // automated: from AI, manual: user-created
  source_url?: string; // Link to research doc/test/report

  // Insight content
  statement: string; // [Segment] + [Observation] + [Evidence]

  // Context
  customer_segment?: string; // "First-time buyers", "Mobile users"
  journey_stage?: JourneyStage; // awareness, consideration, decision, post_purchase
  page_location?: string[]; // homepage, pdp, cart, checkout, plp
  device_type?: DeviceType; // mobile, desktop, tablet, all

  // Evidence
  evidence: Evidence;
  sources: Sources;

  // Business impact
  growth_pillar: GrowthPillar; // conversion, aov, frequency, retention, acquisition
  affected_kpis?: string[]; // ["Mobile ATC Rate", "CVR", "Bounce Rate"]
  current_performance?: string; // "Mobile ATC: 8.92%"

  // Assessment
  confidence_level: ConfidenceLevel; // high, medium, low
  priority: Priority; // critical, high, medium, low
  validation_status: ValidationStatus; // untested, testing, validated, invalidated

  // Categorization
  tags?: string[]; // ["#mobile", "#trust", "#pre-purchase"]
  friction_type?: FrictionType; // usability, trust, value_perception, etc.
  psychology_principle?: PsychologyPrinciple; // loss_aversion, social_proof, etc.

  // Actions
  suggested_actions?: string; // Initial ideas/recommendations

  // Metadata
  created_by?: string; // User ID who created this
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

export interface OpportunityCalculation {
  can_calculate: boolean;
  method: 'manual' | 'automated';
  inputs?: {
    affected_metric: string;
    baseline_value: number;
    expected_lift_min: number;
    expected_lift_max: number;
    monthly_volume: number;
    conversion_rate: number;
    aov: number;
  };
  scenarios?: {
    conservative: string;
    moderate: string;
    aggressive: string;
  };
  calculated_by?: string; // User UUID
  calculated_at?: string; // ISO timestamp
  data_sources?: string[]; // ["GA4", "Shopify"]
}

export type ThemeStatus = 'active' | 'archived';

export interface Theme {
  id: string;

  // Core identification
  theme_id: string; // e.g., "THM-001"
  title: string; // Descriptive theme name (max 150 chars)
  status: ThemeStatus; // active, archived
  theme_statement: string; // 2-3 sentences synthesizing the pattern

  // Connected data
  connected_insights: ConnectedInsight[];

  // Business impact
  business_impact: BusinessImpact;
  growth_pillar: GrowthPillar; // conversion, aov, frequency, retention, acquisition
  affected_pages?: string[]; // ["homepage", "pdp", "cart"]
  current_performance?: string; // Baseline metrics
  opportunity_calculation?: OpportunityCalculation;

  // Actions
  recommended_actions?: RecommendedAction[];

  // Assessment
  priority: Priority; // critical, high, medium, low

  // Metadata
  created_by?: string; // User ID
  user_id?: string; // Owner user ID
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

export type HypothesisStatus = 'draft' | 'approved' | 'testing' | 'validated' | 'invalidated' | 'archived';
export type HypothesisPriority = 'P0' | 'P1' | 'P2';

export interface Hypothesis {
  id: string;
  hypothesis_id: string; // e.g., "HYP-001"
  theme_id?: string;
  workspace_id?: string;
  statement: string; // "If we [change], then [outcome] because [reasoning]"
  based_on_insights: BasedOnInsight[];
  expected_impact: ExpectedImpact;
  test_design?: TestDesign;
  status: HypothesisStatus;
  priority?: HypothesisPriority;

  // PXL Framework fields
  research_backed?: boolean;
  research_notes?: string;
  effort_design?: number; // 1-10 scale
  effort_dev?: number; // 1-10 scale
  effort_copy?: number; // 1-10 scale
  effort_total?: number; // Calculated sum
  above_fold?: boolean;
  page_location?: string;
  element_location?: string;
  psychology_principle?: string;
  psychology_notes?: string;

  // Target details
  target_url?: string;
  target_pages?: string[];
  target_audiences?: string[];

  // KPIs
  primary_kpi?: string;
  secondary_kpis?: string[];
  success_criteria?: any;

  // Scores
  confidence_score?: number; // 1-10
  potential_value?: string; // "High", "Medium", "Low"
  ease_score?: number; // 1-10
  pxl_score?: number; // Calculated: (Potential × Confidence × Ease) normalized

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

export type ExperimentStatus = 'draft' | 'queued' | 'not_started' | 'running' | 'reviewing' | 'completed' | 'paused' | 'cancelled' | 'archived';
export type ExperimentResult = 'win' | 'loss' | 'inconclusive' | 'null';
export type ActionTaken = 'implemented' | 'saved' | 'iterate' | 'archived';

export interface Experiment {
  id: string;

  // Core identification
  experiment_number: string; // e.g., "EXP-001", "45-1-R-PDP-Test"
  title: string; // Experiment name (max 150 chars)
  status: ExperimentStatus;

  // Hypothesis connection
  hypothesis_id?: string;
  hypothesis?: string; // If [change] then [expected result] because [reason]

  // Test specification
  test_spec: {
    name: string;
    description: string;
    variants: TestVariant[];
    successMetrics: string[];
    sampleSize: number;
    duration: string;
    platform?: string;
  };

  // Context
  page_location?: string[]; // Pages/flows tested
  device_target?: DeviceType; // mobile, desktop, all
  growth_pillar: GrowthPillar;

  // Metrics
  primary_kpi?: string; // CVR, ATC Rate, etc.
  secondary_kpis?: string[]; // Additional metrics to track
  expected_impact?: any; // JSON structure for predicted impact
  actual_impact?: any; // JSON structure for measured impact

  // Results
  results?: ExperimentResults;
  result?: ExperimentResult; // win, loss, inconclusive, null

  // Learnings
  learnings?: Learnings;
  takeaway?: string; // Key learning from test
  customer_learning?: string; // What we learned about customers
  action_taken?: ActionTaken; // implemented, saved, iterate, archived

  // Metadata
  user_id: string;
  test_platform?: string; // VWO, Optimizely, Fermat, etc.
  test_url?: string; // Link to test in platform
  created_at: string;
  start_date?: string;
  end_date?: string;
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
