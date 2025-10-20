/**
 * Advanced Insights Types
 * Types for themes, hypotheses, and experiments
 */

import { AtomicInsight } from './insights';

/**
 * Pattern Type
 */
export enum PatternType {
  RECURRING = 'recurring',
  SYSTEMIC = 'systemic',
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
}

/**
 * Theme
 * A cluster of related insights that form a coherent pattern
 */
export interface Theme {
  id?: string;
  analysisId: string;
  userId: string;
  name: string;
  description: string;
  insightIds: string[];
  insights?: AtomicInsight[]; // Populated when needed
  patternType: PatternType;
  priority: number; // 1-10
  businessImpact: string;
  metadata?: {
    clusteringAlgorithm?: string;
    similarityScore?: number;
    keywords?: string[];
    affectedSections?: string[];
    [key: string]: unknown;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Theme Clustering Request
 */
export interface ThemeClusteringRequest {
  analysisId: string;
  userId: string;
  insights: AtomicInsight[];
  options?: {
    algorithm?: 'kmeans' | 'hierarchical' | 'semantic';
    minClusterSize?: number;
    maxClusters?: number;
    similarityThreshold?: number;
  };
}

/**
 * Theme Clustering Response
 */
export interface ThemeClusteringResponse {
  success: boolean;
  themes: Theme[];
  metadata: {
    totalThemes: number;
    averageClusterSize: number;
    processingTime: number;
    algorithm?: string;
  };
  error?: string;
}

/**
 * Hypothesis Status
 */
export enum HypothesisStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  VALIDATED = 'validated',
  INVALIDATED = 'invalidated',
  ARCHIVED = 'archived',
}

/**
 * Success Metric
 */
export interface SuccessMetric {
  name: string;
  baseline: number;
  target: number;
  unit: string;
  priority: 'primary' | 'secondary';
}

/**
 * Hypothesis
 * A testable prediction based on a theme
 */
export interface Hypothesis {
  id?: string;
  themeId: string;
  theme?: Theme; // Populated when needed
  analysisId: string;
  userId: string;
  hypothesis: string; // If we [change], then [metric] will [improve] because [reason]
  rationale: string;
  expectedOutcome: string;
  successMetrics: SuccessMetric[];
  status: HypothesisStatus;
  confidenceLevel: number; // 0-100
  metadata?: {
    framework?: 'LIFT' | 'ICE' | 'PIE' | 'custom';
    reach?: number; // Number of users affected
    estimatedLift?: number; // Expected % improvement
    [key: string]: unknown;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Hypothesis Generation Request
 */
export interface HypothesisGenerationRequest {
  analysisId: string;
  userId: string;
  theme: Theme;
  context?: {
    businessGoals?: string[];
    constraints?: string[];
    targetMetrics?: string[];
  };
  options?: {
    llm?: 'gpt-4' | 'claude-3-opus';
    maxHypotheses?: number;
    framework?: 'LIFT' | 'ICE' | 'PIE';
  };
}

/**
 * Hypothesis Generation Response
 */
export interface HypothesisGenerationResponse {
  success: boolean;
  hypotheses: Hypothesis[];
  metadata: {
    totalHypotheses: number;
    averageConfidence: number;
    processingTime: number;
    model?: string;
  };
  error?: string;
}

/**
 * Experiment Status
 */
export enum ExperimentStatus {
  PLANNED = 'planned',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Experiment Variant
 */
export interface ExperimentVariant {
  name: string;
  description: string;
  changes: {
    element: string;
    type: 'text' | 'image' | 'layout' | 'color' | 'cta' | 'other';
    before: string;
    after: string;
  }[];
  mockup?: string; // Screenshot or design mockup
}

/**
 * Implementation Step
 */
export interface ImplementationStep {
  order: number;
  description: string;
  technical: boolean;
  estimatedTime: string;
  responsible?: string;
}

/**
 * Experiment Results
 */
export interface ExperimentResults {
  variant: 'A' | 'B';
  metrics: {
    name: string;
    value: number;
    unit: string;
    improvement?: number; // % change from baseline
    confidence?: number; // Statistical confidence
  }[];
  sampleSize: number;
  duration: string;
  winner?: 'A' | 'B' | 'inconclusive';
  statisticalSignificance?: number;
}

/**
 * Experiment
 */
export interface Experiment {
  id?: string;
  hypothesisId: string;
  hypothesis?: Hypothesis; // Populated when needed
  analysisId: string;
  userId: string;
  name: string;
  description: string;
  variantA: ExperimentVariant; // Control
  variantB: ExperimentVariant; // Treatment
  implementationPlan: ImplementationStep[];
  successCriteria: SuccessMetric[];
  status: ExperimentStatus;
  results?: ExperimentResults;
  conclusion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Experiment Planning Request
 */
export interface ExperimentPlanningRequest {
  analysisId: string;
  userId: string;
  hypothesis: Hypothesis;
  options?: {
    includeImplementation?: boolean;
    targetPlatform?: 'optimizely' | 'google-optimize' | 'vwo' | 'custom';
  };
}

/**
 * Experiment Planning Response
 */
export interface ExperimentPlanningResponse {
  success: boolean;
  experiment: Experiment;
  metadata?: {
    estimatedDuration?: string;
    requiredSampleSize?: number;
    estimatedCost?: number;
  };
  error?: string;
}

/**
 * Insights Pipeline Result
 * Complete result from insights -> themes -> hypotheses -> experiments
 */
export interface InsightsPipelineResult {
  analysisId: string;
  insights: AtomicInsight[];
  themes: Theme[];
  hypotheses: Hypothesis[];
  experiments?: Experiment[];
  metadata: {
    totalInsights: number;
    totalThemes: number;
    totalHypotheses: number;
    totalExperiments: number;
    processingTime: number;
    stages: {
      insightExtraction: number;
      themeClustering: number;
      hypothesisGeneration: number;
      experimentPlanning?: number;
    };
  };
}
