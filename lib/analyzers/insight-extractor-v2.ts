/**
 * Insight Extractor v2
 * Extracts atomic insights from page content using AI
 */

import { BaseModule } from '../modules/base';
import { ModuleConfig } from '../types/modules';
import { InsightExtractorInput, InsightExtractorOutput } from './types';
import { gptInsightsExtractor } from '../services/ai/gpt-insights';
import { claudeInsightsExtractor } from '../services/ai/claude-insights';

/**
 * Insight Extractor Module
 */
export class InsightExtractorV2 extends BaseModule<
  InsightExtractorInput,
  InsightExtractorOutput
> {
  private llmProvider: 'gpt' | 'claude';

  constructor(llmProvider: 'gpt' | 'claude' = 'gpt') {
    const config: ModuleConfig = {
      name: 'insight-extractor-v2',
      version: '2.0.0',
      enabled: true,
      priority: 10,
      dependencies: [],
    };

    super(config);
    this.llmProvider = llmProvider;
  }

  async validate(input: InsightExtractorInput): Promise<boolean> {
    return !!(
      input.analysisId &&
      input.userId &&
      input.content &&
      input.content.markdown
    );
  }

  protected async run(input: InsightExtractorInput): Promise<InsightExtractorOutput> {
    this.logger.info('Extracting insights', {
      url: input.url,
      provider: this.llmProvider,
    });

    const extractor =
      this.llmProvider === 'claude' ? claudeInsightsExtractor : gptInsightsExtractor;

    if (!extractor) {
      throw new Error(`${this.llmProvider} extractor not available (missing API key)`);
    }

    const response = await extractor.extract({
      analysisId: input.analysisId,
      userId: input.userId,
      content: {
        url: input.url,
        markdown: input.content.markdown,
        html: input.content.html,
        screenshot: input.content.screenshot,
      },
      options: {
        llm: this.llmProvider === 'claude' ? 'claude-3-sonnet' : 'gpt-4',
        maxInsights: input.options?.maxInsights,
        minConfidence: input.options?.minConfidence,
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Insight extraction failed');
    }

    this.logger.info('Insights extracted', {
      count: response.insights.length,
      avgConfidence: response.metadata.averageConfidence,
    });

    return {
      insights: response.insights,
    };
  }
}

/**
 * Create insight extractor
 */
export function createInsightExtractor(provider?: 'gpt' | 'claude'): InsightExtractorV2 {
  return new InsightExtractorV2(provider);
}
