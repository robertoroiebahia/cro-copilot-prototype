/**
 * Analysis Types
 * Core types for page analysis and conversion optimization
 */

/**
 * Analysis Input
 */
export interface AnalysisInput {
  url: string;
  userId: string;
  options?: AnalysisOptions;
}

/**
 * Analysis Options
 */
export interface AnalysisOptions {
  llm?: 'gpt-4' | 'gpt-4-turbo' | 'claude-3-opus' | 'claude-3-sonnet';
  includeScreenshots?: boolean;
  extractInsights?: boolean;
  generateThemes?: boolean;
  generateHypotheses?: boolean;
  cache?: boolean;
  timeout?: number;
}

/**
 * Analysis Status
 */
export enum AnalysisStatus {
  PENDING = 'pending',
  SCRAPING = 'scraping',
  ANALYZING = 'analyzing',
  EXTRACTING_INSIGHTS = 'extracting_insights',
  CLUSTERING_THEMES = 'clustering_themes',
  GENERATING_HYPOTHESES = 'generating_hypotheses',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Analysis Progress
 */
export interface AnalysisProgress {
  status: AnalysisStatus;
  progress: number; // 0-100
  stage: string;
  message?: string;
  timestamp: Date;
}

/**
 * Page Content
 */
export interface PageContent {
  url: string;
  title?: string;
  description?: string;
  markdown: string;
  html?: string;
  screenshot?: string;
  metadata?: {
    language?: string;
    charset?: string;
    viewport?: string;
    statusCode?: number;
  };
}

/**
 * Analysis Metrics
 */
export interface AnalysisMetrics {
  visitors: string;
  addToCarts: string;
  purchases: string;
  aov: string;
  conversionRate?: string;
  bounceRate?: string;
}

/**
 * Analysis Context
 */
export interface AnalysisContext {
  trafficSource: string;
  productType: string;
  pricePoint: string;
  targetAudience?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

/**
 * Analysis Heuristics
 */
export interface AnalysisHeuristics {
  clarity: number; // 0-100
  trust: number; // 0-100
  urgency: number; // 0-100
  friction: number; // 0-100
  valueProposition: number; // 0-100
  overall: number; // 0-100
}

/**
 * Analysis Summary
 */
export interface AnalysisSummary {
  headline: string;
  diagnosticTone: 'direct' | 'optimistic' | 'urgent';
  confidence: 'low' | 'medium' | 'high';
  heuristics?: AnalysisHeuristics;
  keyFindings?: string[];
}

/**
 * Recommendation Priority
 */
export enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Recommendation Category
 */
export enum RecommendationCategory {
  UX = 'ux',
  MESSAGING = 'messaging',
  TRUST = 'trust',
  URGENCY = 'urgency',
  VALUE_PROP = 'value_prop',
  FRICTION = 'friction',
  CONVERSION = 'conversion',
  ENGAGEMENT = 'engagement',
}

/**
 * Recommendation
 */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  impact: 'low' | 'medium' | 'high';
  effort: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
  rationale: string;
  implementation?: string;
  examples?: string[];
}

/**
 * Analysis Result
 */
export interface AnalysisResult {
  id: string;
  url: string;
  userId: string;
  status: AnalysisStatus;
  content: PageContent;
  metrics?: AnalysisMetrics;
  context?: AnalysisContext;
  summary: AnalysisSummary;
  recommendations: Recommendation[];
  insights?: string[]; // Insight IDs
  themes?: string[]; // Theme IDs
  hypotheses?: string[]; // Hypothesis IDs
  usage?: {
    tokensUsed: number;
    estimatedCost: number;
    duration: number;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Batch Analysis Input
 */
export interface BatchAnalysisInput {
  urls: string[];
  userId: string;
  options?: AnalysisOptions;
}

/**
 * Batch Analysis Result
 */
export interface BatchAnalysisResult {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  results: AnalysisResult[];
  startedAt: Date;
  completedAt?: Date;
}
