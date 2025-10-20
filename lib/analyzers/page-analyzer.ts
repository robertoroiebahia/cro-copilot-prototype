/**
 * Page Analyzer Module
 * Orchestrates the full analysis pipeline
 */

import { BaseModule } from '../modules/base';
import { ModuleConfig } from '../types/modules';
import { PageAnalyzerInput, PageAnalyzerOutput } from './types';
import { InsightExtractorV2 } from './insight-extractor-v2';

/**
 * Page Analyzer Module
 */
export class PageAnalyzer extends BaseModule<PageAnalyzerInput, PageAnalyzerOutput> {
  private insightExtractor: InsightExtractorV2;

  constructor(llmProvider: 'gpt' | 'claude' = 'gpt') {
    const config: ModuleConfig = {
      name: 'page-analyzer',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      dependencies: [],
    };

    super(config);
    this.insightExtractor = new InsightExtractorV2(llmProvider);
  }

  async validate(input: PageAnalyzerInput): Promise<boolean> {
    return !!(
      input.analysisId &&
      input.userId &&
      input.url &&
      input.content &&
      input.content.markdown
    );
  }

  protected async run(input: PageAnalyzerInput): Promise<PageAnalyzerOutput> {
    this.logger.info('Analyzing page', { url: input.url });

    // Extract insights
    const extractorResult = await this.insightExtractor.execute({
      analysisId: input.analysisId,
      userId: input.userId,
      url: input.url,
      content: input.content,
    });

    if (!extractorResult.success || !extractorResult.data) {
      throw new Error('Insight extraction failed');
    }

    const insights = extractorResult.data.insights;

    // Generate summary
    const summary = {
      totalInsights: insights.length,
      highPriority: insights.filter(
        (i) => i.severity === 'high' || i.severity === 'critical'
      ).length,
      categories: this.categorizeInsights(insights),
    };

    this.logger.info('Page analysis complete', {
      totalInsights: summary.totalInsights,
      highPriority: summary.highPriority,
    });

    return {
      insights,
      summary,
    };
  }

  /**
   * Categorize insights by category
   */
  private categorizeInsights(insights: PageAnalyzerOutput['insights']): Record<string, number> {
    const categories: Record<string, number> = {};

    insights.forEach((insight) => {
      const category = insight.category;
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }
}

/**
 * Create page analyzer
 */
export function createPageAnalyzer(provider?: 'gpt' | 'claude'): PageAnalyzer {
  return new PageAnalyzer(provider);
}
