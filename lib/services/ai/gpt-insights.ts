/**
 * GPT Insights Extractor
 * Extract atomic insights using OpenAI GPT models
 */

import OpenAI from 'openai';
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
import { PromptBuilder, parseJSONResponse, TokenCounter, CostEstimator } from '../../utils/llm';

/**
 * GPT Insights Extractor Class
 */
export class GPTInsightsExtractor {
  private client: OpenAI;
  private logger: Logger;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-4-turbo') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'gpt-insights',
    });

    this.model = model;
  }

  /**
   * Extract insights from content
   */
  async extract(request: InsightExtractionRequest): Promise<InsightExtractionResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Extracting insights', {
        url: request.content.url,
        model: this.model,
      });

      const prompt = this.buildPrompt(request);
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert CRO analyst. Extract atomic, actionable insights from web pages.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from GPT');
      }

      const parsed = parseJSONResponse<{ insights: any[] }>(response);
      if (!parsed || !parsed.insights) {
        throw new Error('Invalid response format');
      }

      const insights = this.parseInsights(parsed.insights, request);
      const processingTime = Date.now() - startTime;

      const usage = completion.usage;
      const estimatedCost = usage
        ? CostEstimator.calculate(
            this.model as any,
            usage.prompt_tokens,
            usage.completion_tokens
          )
        : 0;

      this.logger.info('Insights extracted', {
        count: insights.length,
        duration: processingTime,
        tokens: usage?.total_tokens,
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
          tokensUsed: usage?.total_tokens,
          model: this.model,
        },
      };
    } catch (error) {
      this.logger.error(
        'Insight extraction failed',
        error instanceof Error ? error : new Error(String(error))
      );

      throw new LLMError(
        'OpenAI',
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
        'Analyze this web page and extract atomic insights for conversion rate optimization.'
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
Return a JSON object with this structure:
{
  "insights": [
    {
      "type": "problem",
      "category": "friction",
      "title": "Complex checkout form",
      "description": "The checkout form has 12 required fields...",
      "evidence": [
        {
          "type": "text",
          "content": "Observed 12 form fields with asterisks"
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
          this.logger.warn('Failed to parse insight', { raw, error });
          return null;
        }
      })
      .filter((insight): insight is AtomicInsight => insight !== null);
  }
}

/**
 * Create a GPT insights extractor
 */
export function createGPTInsightsExtractor(apiKey?: string, model?: string): GPTInsightsExtractor {
  return new GPTInsightsExtractor(apiKey, model);
}

/**
 * Default GPT insights extractor
 */
export const gptInsightsExtractor = process.env.OPENAI_API_KEY
  ? createGPTInsightsExtractor()
  : null;
