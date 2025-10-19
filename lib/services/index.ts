/**
 * Services Index
 * Central export for all business logic services
 */

// Analysis Services
export * from './analysis/page-analyzer';

// Firecrawl Client (replaces Playwright)
export { FirecrawlClient, getFirecrawlClient } from './firecrawl-client';
export type {
  FirecrawlScrapeResponse,
  FirecrawlScrapeOptions,
} from './firecrawl-client';

// AI Services - Export with specific names to avoid conflicts
export {
  generateClaudeRecommendations,
  type RecommendationResult as ClaudeRecommendationResult
} from './ai/claude-recommendations';
export {
  generateGPTRecommendations,
  type RecommendationResult as GPTRecommendationResult
} from './ai/gpt-recommendations';

// Database Repositories
export { AnalysisRepository } from './database/analysis-repository';
export { ProfileRepository } from './database/profile-repository';
