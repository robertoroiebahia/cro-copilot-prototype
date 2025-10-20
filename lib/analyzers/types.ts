/**
 * Analyzer Types
 * Shared types for analyzer modules
 */

import { PageContent } from '../types/analysis';
import { AtomicInsight } from '../types/insights';
import { Theme, Hypothesis, Experiment } from '../types/insights-advanced';

/**
 * Analyzer Input Base
 */
export interface AnalyzerInput {
  analysisId: string;
  userId: string;
  url: string;
}

/**
 * Page Analyzer Input
 */
export interface PageAnalyzerInput extends AnalyzerInput {
  content: PageContent;
}

/**
 * Page Analyzer Output
 */
export interface PageAnalyzerOutput {
  insights: AtomicInsight[];
  summary: {
    totalInsights: number;
    highPriority: number;
    categories: Record<string, number>;
  };
}

/**
 * Insight Extractor Input
 */
export interface InsightExtractorInput extends AnalyzerInput {
  content: PageContent;
  options?: {
    maxInsights?: number;
    minConfidence?: number;
  };
}

/**
 * Insight Extractor Output
 */
export interface InsightExtractorOutput {
  insights: AtomicInsight[];
}

/**
 * Theme Clusterer Input
 */
export interface ThemeClustererInput extends AnalyzerInput {
  insights: AtomicInsight[];
  options?: {
    minClusterSize?: number;
    maxClusters?: number;
  };
}

/**
 * Theme Clusterer Output
 */
export interface ThemeClustererOutput {
  themes: Theme[];
}

/**
 * Hypothesis Generator Input
 */
export interface HypothesisGeneratorInput extends AnalyzerInput {
  theme: Theme;
  insights: AtomicInsight[];
  options?: {
    maxHypotheses?: number;
  };
}

/**
 * Hypothesis Generator Output
 */
export interface HypothesisGeneratorOutput {
  hypotheses: Hypothesis[];
}

/**
 * Experiment Planner Input
 */
export interface ExperimentPlannerInput extends AnalyzerInput {
  hypothesis: Hypothesis;
  theme?: Theme;
  insights?: AtomicInsight[];
}

/**
 * Experiment Planner Output
 */
export interface ExperimentPlannerOutput {
  experiment: Experiment;
}
