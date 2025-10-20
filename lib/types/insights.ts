/**
 * Insights Types (v1)
 * Basic types for atomic insights extraction
 */

/**
 * Insight Type
 */
export enum InsightType {
  OBSERVATION = 'observation',
  PROBLEM = 'problem',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
}

/**
 * Insight Category
 */
export enum InsightCategory {
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
 * Insight Severity
 */
export enum InsightSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Effort Estimate
 */
export enum EffortEstimate {
  TRIVIAL = 'trivial',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
}

/**
 * Insight Location
 */
export interface InsightLocation {
  section: string; // e.g., "hero", "navigation", "footer", "product-details"
  selector?: string; // CSS selector if available
  coordinates?: {
    x: number;
    y: number;
  };
  screenshot?: string; // Base64 or URL to screenshot
}

/**
 * Insight Evidence
 */
export interface InsightEvidence {
  type: 'text' | 'image' | 'metric' | 'behavior';
  content: string;
  source?: string;
  timestamp?: Date;
}

/**
 * Atomic Insight
 */
export interface AtomicInsight {
  id?: string;
  analysisId?: string;
  userId?: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  evidence: InsightEvidence[];
  severity: InsightSeverity;
  confidence: number; // 0-100
  impactScore: number; // 0-100
  effortEstimate: EffortEstimate;
  location: InsightLocation;
  metadata?: {
    tags?: string[];
    relatedInsights?: string[]; // IDs of related insights
    source?: 'ai' | 'manual' | 'mixed';
    llmModel?: string;
    extractedAt?: Date;
    [key: string]: unknown;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Insight Extraction Request
 */
export interface InsightExtractionRequest {
  analysisId: string;
  userId: string;
  content: {
    url: string;
    markdown: string;
    html?: string;
    screenshot?: string;
  };
  context?: {
    metrics?: Record<string, string>;
    industry?: string;
    businessGoals?: string[];
  };
  options?: {
    llm?: 'gpt-4' | 'claude-3-opus' | 'claude-3-sonnet';
    maxInsights?: number;
    minConfidence?: number;
    categories?: InsightCategory[];
  };
}

/**
 * Insight Extraction Response
 */
export interface InsightExtractionResponse {
  success: boolean;
  insights: AtomicInsight[];
  metadata: {
    totalInsights: number;
    averageConfidence: number;
    processingTime: number;
    tokensUsed?: number;
    model?: string;
  };
  error?: string;
}

/**
 * Insight Filter
 */
export interface InsightFilter {
  analysisId?: string;
  userId?: string;
  type?: InsightType | InsightType[];
  category?: InsightCategory | InsightCategory[];
  severity?: InsightSeverity | InsightSeverity[];
  minConfidence?: number;
  minImpact?: number;
  tags?: string[];
}

/**
 * Insight Sort Options
 */
export interface InsightSortOptions {
  field: 'confidence' | 'impact' | 'severity' | 'createdAt';
  direction: 'asc' | 'desc';
}

/**
 * Insight Query Result
 */
export interface InsightQueryResult {
  insights: AtomicInsight[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
