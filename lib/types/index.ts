/**
 * Types Index
 * Central export for all TypeScript types
 */

// Database Types
export * from './database.types';

// Database Insights Types (export specific types to avoid conflicts)
export type {
  InsightsDatabase,
  Insight,
  InsertInsight,
  UpdateInsight,
} from './database-insights.types';

export type {
  Theme as DBTheme,
  InsertTheme,
  UpdateTheme,
  Hypothesis as DBHypothesis,
  InsertHypothesis,
  UpdateHypothesis,
  Experiment as DBExperiment,
  InsertExperiment,
  UpdateExperiment,
} from './database-insights.types';

// Core Types (avoid conflicts with database types)
export type {
  AnalysisInput,
  AnalysisOptions,
  AnalysisStatus,
  AnalysisProgress,
  PageContent,
  AnalysisHeuristics,
  RecommendationPriority,
  RecommendationCategory,
  Recommendation,
  AnalysisResult,
  BatchAnalysisInput,
  BatchAnalysisResult,
} from './analysis';

export type {
  AnalysisMetrics as CoreAnalysisMetrics,
  AnalysisContext as CoreAnalysisContext,
  AnalysisSummary as CoreAnalysisSummary,
} from './analysis';

export * from './insights';
export * from './insights-advanced';

// System Types
export * from './modules';
export * from './integrations';
