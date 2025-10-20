/**
 * Claude Insights Extractor
 * Extract atomic insights using Anthropic Claude models
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  InsightExtractionRequest,
  InsightExtractionResponse,
  AtomicInsight,
  InsightType,
  InsightCategory,
  InsightSeverity,
  EffortEstimate,
} from '../../types/insights';
import { LLMError } from '../../utils/errors';
import { Logger, createLogger, LogLevel } from '../../utils/logger';
import { PromptBuilder, parseJSONResponse, CostEstimator } from '../../utils/llm';

/**
 * Claude Insights Extractor Class
 */
export class ClaudeInsightsExtractor {
  private client: Anthropic;
  private logger: Logger;
  private model: string;

  constructor(apiKey?: string, model: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'claude-insights',
    });

    this.model = model;
  }

  /**
   * Extract insights from content
   */
  async extract(request: InsightExtractionRequest): Promise<InsightExtractionResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Extracting insights with Claude', {
        url: request.content.url,
        model: this.model,
      });

      const prompt = this.buildPrompt(request);
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const parsed = parseJSONResponse<{ insights: any[] }>(response.text);
      if (!parsed || !parsed.insights) {
        throw new Error('Invalid response format from Claude');
      }

      const insights = this.parseInsights(parsed.insights, request);
      const processingTime = Date.now() - startTime;

      const usage = message.usage;
      const estimatedCost = CostEstimator.calculate(
        this.model.includes('opus') ? 'claude-3-opus' : 'claude-3-sonnet',
        usage.input_tokens,
        usage.output_tokens
      );

      this.logger.info('Insights extracted with Claude', {
        count: insights.length,
        duration: processingTime,
        tokens: usage.input_tokens + usage.output_tokens,
        cost: estimatedCost,
      });

      return {
        success: true,
        insights,
        metadata: {
          totalInsights: insights.length,
          averageConfidence:
            insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length || 0,
          processingTime,
          tokensUsed: usage.input_tokens + usage.output_tokens,
          model: this.model,
        },
      };
    } catch (error) {
      this.logger.error(
        'Claude insight extraction failed',
        error instanceof Error ? error : new Error(String(error))
      );

      throw new LLMError(
        'Anthropic',
        error instanceof Error ? error.message : 'Unknown error',
        { model: this.model }
      );
    }
  }

  /**
   * Build extraction prompt
   */
  private buildPrompt(request: InsightExtractionRequest): string {
    const builder = new PromptBuilder();

    builder
      .section(
        'Task',
        'You are an expert CRO analyst. Analyze this web page and extract atomic insights for conversion rate optimization.'
      )
      .section('Page URL', request.content.url)
      .section('Page Content', request.content.markdown.slice(0, 15000)); // Limit content

    if (request.context) {
      builder.section('Context', JSON.stringify(request.context, null, 2));
    }

    builder
      .section(
        'Instructions',
        `
Extract individual, actionable insights. Each insight should be:
- Atomic: One specific observation
- Actionable: Can be acted upon
- Evidence-based: Supported by what you see
- Impactful: Meaningful for conversion

For each insight, provide:
- type: ${Object.values(InsightType).join(', ')}
- category: ${Object.values(InsightCategory).join(', ')}
- title: Brief description (5-10 words)
- description: Detailed explanation (2-3 sentences)
- evidence: What you observed
- severity: ${Object.values(InsightSeverity).join(', ')}
- confidence: 0-100
- impactScore: 0-100
- effortEstimate: ${Object.values(EffortEstimate).join(', ')}
- location: { section: string, selector?: string }
      `.trim()
      )
      .raw(
        `
Return ONLY a valid JSON object with this structure (no markdown, no explanation):
{
  "insights": [
    {
      "type": "problem",
      "category": "friction",
      "title": "Complex checkout form",
      "description": "The checkout form has 12 required fields which creates significant friction. Research shows each additional field reduces completion by 10%.",
      "evidence": [
        {
          "type": "text",
          "content": "Observed 12 form fields with asterisks marking them as required"
        }
      ],
      "severity": "high",
      "confidence": 85,
      "impactScore": 75,
      "effortEstimate": "medium",
      "location": {
        "section": "checkout",
        "selector": ".checkout-form"
      }
    }
  ]
}
      `.trim()
      );

    return builder.build();
  }

  /**
   * Parse and validate insights
   */
  private parseInsights(rawInsights: any[], request: InsightExtractionRequest): AtomicInsight[] {
    return rawInsights
      .map((raw) => {
        try {
          const insight: AtomicInsight = {
            analysisId: request.analysisId,
            userId: request.userId,
            type: raw.type as InsightType,
            category: raw.category as InsightCategory,
            title: raw.title,
            description: raw.description,
            evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
            severity: raw.severity as InsightSeverity,
            confidence: Number(raw.confidence) || 50,
            impactScore: Number(raw.impactScore) || 50,
            effortEstimate: raw.effortEstimate as EffortEstimate,
            location: raw.location || { section: 'unknown' },
            metadata: {
              source: 'ai',
              llmModel: this.model,
              extractedAt: new Date(),
            },
          };

          return insight;
        } catch (error) {
          this.logger.warn('Failed to parse Claude insight', { raw, error });
          return null;
        }
      })
      .filter((insight): insight is AtomicInsight => insight !== null);
  }
}

/**
 * Create a Claude insights extractor
 */
export function createClaudeInsightsExtractor(
  apiKey?: string,
  model?: string
): ClaudeInsightsExtractor {
  return new ClaudeInsightsExtractor(apiKey, model);
}

/**
 * Default Claude insights extractor
 */
export const claudeInsightsExtractor = process.env.ANTHROPIC_API_KEY
  ? createClaudeInsightsExtractor()
  : null;
