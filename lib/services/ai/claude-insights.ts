/**
 * Claude Insights Extractor
 * Extract atomic insights using Anthropic Claude models via centralized LLM service
 */

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
import { PromptBuilder } from '../../utils/llm';
import { Logger, createLogger, LogLevel } from '../../utils/logger';
import { llmService } from './llm-service';
import { buildPageAnalysisPrompt } from './prompts/page-analysis.prompt';

/**
 * Claude Insights Extractor Class
 */
export class ClaudeInsightsExtractor {
  private logger: Logger;
  private model: string;

  constructor(apiKey?: string, model: string = 'claude-sonnet-4-5-20250929') {
    // apiKey parameter kept for backwards compatibility but not used
    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'claude-insights',
    });

    this.model = model;
  }

  /**
   * Extract insights from content using centralized LLM service
   */
  async extract(request: InsightExtractionRequest): Promise<InsightExtractionResponse> {
    try {
      this.logger.info('Extracting insights via LLM service (Claude)', {
        url: request.content.url,
        model: this.model,
        hasScreenshot: !!request.content.screenshot,
      });

      // Build prompt using centralized prompt system
      const prompt = buildPageAnalysisPrompt({
        url: request.content.url,
        markdown: request.content.markdown,
        screenshot: request.content.screenshot,
        context: request.context,
      });

      // Execute via centralized LLM service with screenshot if available
      const llmResponse = await llmService.execute<{ insights: any[] }>({
        prompt,
        provider: 'claude',
        model: this.model,
        temperature: 0.7,
        maxTokens: 4096,
        images: request.content.screenshot ? [request.content.screenshot] : undefined,
      });

      if (!llmResponse.success || !llmResponse.data) {
        throw new Error(llmResponse.error || 'LLM request failed');
      }

      const insights = this.parseInsights(llmResponse.data.insights, request);

      this.logger.info('Insights extracted with Claude', {
        count: insights.length,
        duration: llmResponse.metadata.processingTime,
        tokens: llmResponse.metadata.tokensUsed,
        cost: llmResponse.metadata.estimatedCost,
      });

      return {
        success: true,
        insights,
        metadata: {
          totalInsights: insights.length,
          averageConfidence:
            insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length || 0,
          processingTime: llmResponse.metadata.processingTime,
          tokensUsed: llmResponse.metadata.tokensUsed,
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
   * Build extraction prompt (DEPRECATED - Use prompts/page-analysis.prompt.ts)
   * Kept for backwards compatibility
   */
  private buildPrompt(request: InsightExtractionRequest): string {
    const builder = new PromptBuilder();

    builder
      .section(
        'Task',
        'You are an expert CRO analyst performing VISUAL PAGE ANALYSIS. Analyze this landing page screenshot and content to extract conversion optimization insights based on what you can SEE and READ - NOT data or analytics.'
      )
      .section('Page URL', request.content.url)
      .section('Page Content (Markdown)', request.content.markdown.slice(0, 15000)); // Limit content

    if (request.context) {
      builder.section('Context', JSON.stringify(request.context, null, 2));
    }

    builder
      .section(
        'CRITICAL: Visual Analysis Only',
        `
This is PAGE ANALYSIS - you're analyzing SCREENSHOTS and PAGE CONTENT, NOT analytics data.

Focus on what you can observe visually:
✅ Visual hierarchy and layout
✅ CTA clarity, placement, and design
✅ Trust signals (reviews, testimonials, logos, badges)
✅ Value proposition clarity
✅ Messaging and copy effectiveness
✅ Form design and friction points
✅ Mobile UX and responsive design
✅ Social proof elements
✅ Information architecture
✅ Cognitive load and clarity
✅ Urgency/scarcity elements
✅ Navigation and user flow

❌ DO NOT reference analytics data (bounce rate, conversion rate, etc.)
❌ DO NOT make up metrics you can't see
❌ DO NOT assume backend performance data
      `.trim()
      )
      .section(
        'Insight Extraction Instructions',
        `
Extract individual, actionable CRO insights. Each insight must be:
- **Atomic**: One specific observation about the page
- **Visual**: Based on what you can SEE in the content/screenshot
- **Actionable**: Can be tested or fixed
- **Evidence-based**: Supported by observable elements
- **Impact-focused**: Meaningful for conversion optimization

For each insight, provide ALL of these fields:

REQUIRED FIELDS:
- title: Short descriptive title (max 100 chars) - e.g., "Weak primary CTA contrast"
- statement: Full insight statement following format: "[Customer Segment] [Observation] [Visual Evidence]"
  Example: "Mobile visitors encounter a low-contrast CTA button that blends with the background, reducing visual prominence and click likelihood"
- growth_pillar: Which growth area this impacts
  Options: "conversion", "aov", "frequency", "retention", "acquisition"
- confidence_level: Your confidence in this insight
  Options: "high", "medium", "low"
- priority: Business priority based on impact potential
  Options: "critical", "high", "medium", "low"

EVIDENCE & CONTEXT:
- evidence: {
    quantitative?: { metric: string, value: string, sample_size?: number, comparison?: string },
    qualitative?: { quotes: string[], sources: string[] }
  }
  For visual analysis, use qualitative evidence with observations
- page_location: Array of page sections where observed
  Examples: ["hero"], ["navigation", "header"], ["product_details"], ["cart"], ["checkout"], ["footer"]
- device_type: Which device context this applies to
  Options: "mobile", "desktop", "tablet", "all"

CATEGORIZATION (Optional but recommended):
- customer_segment: Who this affects - e.g., "First-time visitors", "Mobile users", "High-intent shoppers"
- journey_stage: Where in customer journey
  Options: "awareness", "consideration", "decision", "post_purchase"
- friction_type: Type of UX friction observed
  Options: "usability", "trust", "value_perception", "information_gap", "cognitive_load"
- psychology_principle: Psychological principle involved
  Options: "loss_aversion", "social_proof", "scarcity", "authority", "anchoring"
- tags: Array of tags for categorization - e.g., ["#mobile", "#trust", "#cta", "#friction"]
- affected_kpis: Which KPIs this likely impacts - e.g., ["Click-through rate", "Add-to-cart rate", "Form completion"]

ACTIONS & METADATA:
- suggested_actions: Initial recommendations (1-2 sentences)
- validation_status: Always "untested" for new insights
      `.trim()
      )
      .raw(
        `
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "insights": [
    {
      "title": "Weak above-the-fold value proposition",
      "statement": "First-time visitors landing on the homepage see a generic hero headline that doesn't clearly communicate the unique value proposition, creating uncertainty about what makes this product different from competitors",
      "growth_pillar": "conversion",
      "confidence_level": "high",
      "priority": "high",
      "evidence": {
        "qualitative": {
          "quotes": ["Hero headline reads 'Welcome to Our Store'", "No clear differentiation visible in fold"],
          "sources": ["Hero section", "Above-fold content"]
        }
      },
      "page_location": ["hero", "homepage"],
      "device_type": "all",
      "customer_segment": "First-time visitors",
      "journey_stage": "awareness",
      "friction_type": "value_perception",
      "psychology_principle": "anchoring",
      "tags": ["#value_prop", "#messaging", "#hero"],
      "affected_kpis": ["Bounce rate", "Time on page", "Scroll depth"],
      "suggested_actions": "Test a benefit-driven headline that clearly states the unique value proposition. Consider A/B testing specific value claims.",
      "validation_status": "untested"
    }
  ]
}

IMPORTANT:
- Generate 8-15 high-quality insights per page
- Focus on VISUAL observations only
- Do NOT fabricate metrics or data
- Prioritize insights by potential impact
- Be specific about what you observe
- Return ONLY valid JSON (no markdown blocks, no extra text)
      `.trim()
      );

    return builder.build();
  }

  /**
   * Parse and validate insights
   * Maps comprehensive schema to AtomicInsight format
   */
  private parseInsights(rawInsights: any[], request: InsightExtractionRequest): AtomicInsight[] {
    return rawInsights
      .map((raw) => {
        try {
          // Map comprehensive schema to AtomicInsight
          // The new schema uses different field names, so we need to map them
          const insight: AtomicInsight = {
            analysisId: request.analysisId,
            userId: request.userId,
            // Map to closest old types (will be transformed when saving to DB)
            type: this.inferType(raw),
            category: this.inferCategory(raw),
            title: raw.title,
            description: raw.statement, // Use statement as description
            evidence: raw.evidence?.qualitative?.quotes?.map((quote: string) => ({
              type: 'text' as const,
              content: quote,
            })) || [],
            severity: this.mapPriorityToSeverity(raw.priority),
            confidence: this.mapConfidenceToNumber(raw.confidence_level),
            impactScore: this.estimateImpactScore(raw.priority, raw.growth_pillar),
            effortEstimate: 'medium' as EffortEstimate, // Default, can be refined later
            location: {
              section: raw.page_location?.[0] || 'unknown',
            },
            metadata: {
              source: 'ai',
              llmModel: this.model,
              extractedAt: new Date(),
              // Store all comprehensive schema fields in metadata for later use
              comprehensive: {
                statement: raw.statement,
                growth_pillar: raw.growth_pillar,
                confidence_level: raw.confidence_level,
                priority: raw.priority,
                evidence: raw.evidence,
                page_location: raw.page_location,
                device_type: raw.device_type,
                customer_segment: raw.customer_segment,
                journey_stage: raw.journey_stage,
                friction_type: raw.friction_type,
                psychology_principle: raw.psychology_principle,
                tags: raw.tags,
                affected_kpis: raw.affected_kpis,
                suggested_actions: raw.suggested_actions,
                validation_status: raw.validation_status,
              },
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

  /**
   * Helper methods for mapping comprehensive schema to AtomicInsight
   */
  private inferType(raw: any): InsightType {
    if (raw.friction_type) return InsightType.PROBLEM;
    if (raw.psychology_principle) return InsightType.OPPORTUNITY;
    return InsightType.OBSERVATION;
  }

  private inferCategory(raw: any): InsightCategory {
    if (raw.friction_type === 'trust') return InsightCategory.TRUST;
    if (raw.friction_type === 'usability') return InsightCategory.UX;
    if (raw.friction_type === 'value_perception') return InsightCategory.VALUE_PROP;
    if (raw.friction_type === 'information_gap') return InsightCategory.MESSAGING;
    if (raw.friction_type === 'cognitive_load') return InsightCategory.UX;
    if (raw.growth_pillar === 'conversion') return InsightCategory.CONVERSION;
    return InsightCategory.FRICTION;
  }

  private mapPriorityToSeverity(priority: string): InsightSeverity {
    const mapping: Record<string, InsightSeverity> = {
      critical: InsightSeverity.CRITICAL,
      high: InsightSeverity.HIGH,
      medium: InsightSeverity.MEDIUM,
      low: InsightSeverity.LOW,
    };
    return mapping[priority] || InsightSeverity.MEDIUM;
  }

  private mapConfidenceToNumber(confidenceLevel: string): number {
    const mapping: Record<string, number> = {
      high: 85,
      medium: 65,
      low: 40,
    };
    return mapping[confidenceLevel] || 65;
  }

  private estimateImpactScore(priority: string, growthPillar: string): number {
    const priorityScores: Record<string, number> = {
      critical: 90,
      high: 75,
      medium: 55,
      low: 35,
    };
    return priorityScores[priority] || 50;
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
