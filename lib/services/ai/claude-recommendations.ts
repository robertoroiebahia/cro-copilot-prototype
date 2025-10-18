/**
 * Claude Sonnet 4.5 CRO Recommendations Generator
 * Full-page analysis with multimodal input
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PageAnalysisResult } from '../analysis/page-analyzer';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface RecommendationResult {
  insights: any;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Generates CRO recommendations using Claude Sonnet 4.5
 */
export async function generateClaudeRecommendations(
  pageData: PageAnalysisResult,
  url: string,
  context?: { trafficSource?: string; productType?: string; pricePoint?: string }
): Promise<RecommendationResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildSystemPrompt(url, context),
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: pageData.screenshots.desktop.fullPage,
            },
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: pageData.screenshots.mobile.fullPage,
            },
          },
          {
            type: 'text',
            text: buildHTMLSection(pageData.compressedHTML),
          },
        ],
      },
    ],
  });

  const outputText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const insights = parseAIResponse(outputText);

  return {
    insights,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Builds the system prompt for CRO analysis
 */
function buildSystemPrompt(
  url: string,
  context?: { trafficSource?: string; productType?: string; pricePoint?: string }
): string {
  let contextSection = '';
  if (context && (context.trafficSource || context.productType || context.pricePoint)) {
    contextSection = `\n\n**Page Context:**\n`;
    if (context.trafficSource) {
      contextSection += `- Traffic Source: ${context.trafficSource}\n`;
    }
    if (context.productType) {
      contextSection += `- Product Type: ${context.productType}\n`;
    }
    if (context.pricePoint) {
      contextSection += `- Price Point: ${context.pricePoint}\n`;
    }
    contextSection += `\nConsider this context when making recommendations. Tailor your analysis to the specific traffic source, product type, and price point provided.`;
  }

  return `You are an expert CRO (Conversion Rate Optimization) analyst specializing in DTC (Direct-to-Consumer) e-commerce and landing pages.

Analyze the following landing page for conversion optimization opportunities:

**URL:** ${url}${contextSection}

You will receive:
1. Desktop full-page screenshot (first image)
2. Mobile full-page screenshot (second image)
3. Compressed HTML source code

**Your Task:**
Provide a comprehensive CRO analysis that identifies specific, actionable opportunities to improve conversion rates. Focus on the entire page experience, not just above-the-fold.

**Analysis Framework:**
- Visual hierarchy and layout effectiveness
- Messaging clarity and value proposition
- Trust signals and social proof
- Call-to-action placement and design
- Mobile responsiveness and usability
- Form friction and checkout flow
- Content structure and scanability
- Cross-device consistency

Provide your analysis in the following JSON format:

\`\`\`json
{
  "summary": {
    "headline": "One-sentence summary of the primary conversion opportunity",
    "diagnosticTone": "2-3 sentence diagnostic overview of the page's current state",
    "confidence": "high|medium|low"
  },
  "recommendations": [
    {
      "id": "unique-identifier",
      "title": "Clear, actionable test title",
      "hypothesis": "If we [specific change], then [expected outcome] because [user psychology/behavior reasoning]",
      "impact": "High|Medium|Low",
      "type": "Iterative|Substantial|Disruptive",
      "businessImpact": ["Conversion", "Spend", "Frequency", "Merchandise"],
      "kpi": "Primary metric to track (e.g., Add-to-Cart Rate, Conversion Rate)",
      "rationale": "Detailed explanation of why this change matters based on CRO principles",
      "currentState": "Specific description of what currently exists",
      "proposedChange": "Detailed specification of the recommended change",
      "expectedLift": "Realistic percentage range (e.g., 5-15%)",
      "effort": "Low|Medium|High",
      "priority": "P0|P1|P2"
    }
  ]
}
\`\`\`

**Important Guidelines:**
- Return ONLY valid JSON, no markdown code blocks
- Prioritize recommendations by impact and effort
- Be specific about changes (colors, copy, placement, etc.)
- Base recommendations on actual CRO data and psychology
- Consider both desktop AND mobile experiences
- Identify quick wins (P0) vs. larger initiatives (P1/P2)`;
}

/**
 * Builds the HTML analysis section
 */
function buildHTMLSection(compressedHTML: string): string {
  return `

**PAGE HTML SOURCE:**

Below is the compressed, rendered HTML of the page (scripts removed, whitespace minimized). Use this to understand the exact content, structure, and elements present on the page:

${compressedHTML}

**END OF HTML SOURCE**

Based on the screenshots and HTML provided above, generate your comprehensive CRO analysis now.`;
}

/**
 * Parses AI response into structured format
 */
function parseAIResponse(outputText: string): any {
  // Remove markdown code blocks
  let cleaned = outputText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse Claude response:', error);

    // Try to extract JSON from the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fall through to fallback
      }
    }

    // Fallback response
    return {
      summary: {
        headline: 'Analysis completed but response formatting had issues.',
        diagnosticTone: 'Please review the analysis manually.',
        confidence: 'medium',
      },
      recommendations: [],
    };
  }
}
