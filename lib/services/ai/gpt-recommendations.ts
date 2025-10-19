/**
 * GPT-5-nano CRO Recommendations Generator
 * Full-page analysis with multimodal input
 */

import OpenAI from 'openai';
import type { PageAnalysisResult } from '../analysis/page-analyzer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RecommendationResult {
  insights: any;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Generates CRO recommendations using GPT-5-nano
 */
export async function generateGPTRecommendations(
  pageData: PageAnalysisResult,
  url: string,
  context?: { trafficSource?: string; productType?: string; pricePoint?: string }
): Promise<RecommendationResult> {
  const mobileImageUrl = buildOpenAIImageRef(pageData.screenshots.mobile.fullPage);

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildSystemPrompt(url, context),
          },
          {
            type: 'input_image',
            image_url: mobileImageUrl,
            detail: 'high',
          },
          {
            type: 'input_text',
            text: buildHTMLSection(pageData.compressedHTML),
          },
        ],
      },
    ],
    max_output_tokens: 16000,
  });

  const outputText = extractResponseText(response);

  const insights = parseAIResponse(outputText);

  return {
    insights,
    usage: {
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    },
  };
}

function buildOpenAIImageRef(source: string | undefined | null): string {
  if (!source) {
    throw new Error('OpenAI image source not provided');
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }

  if (source.startsWith('data:image')) {
    return source;
  }

  return `data:image/jpeg;base64,${source}`;
}

/**
 * Extract text from GPT response
 */
function extractResponseText(response: Awaited<ReturnType<typeof openai.responses.create>>): string {
  if ('output_text' in response && typeof response.output_text === 'string') {
    return response.output_text;
  }

  const outputArray =
    'output' in response && Array.isArray((response as any).output) ? (response as any).output : [];

  for (const item of outputArray) {
    if (!item) continue;

    if (item.type === 'output_text' && typeof item.text === 'string') {
      return item.text;
    }

    if (item.type === 'message') {
      const content = Array.isArray((item as any).content) ? (item as any).content : [];
      for (const part of content) {
        if (part && (part.type === 'output_text' || part.type === 'text') && typeof part.text === 'string') {
          return part.text;
        }
      }
    }
  }

  return '';
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
1. Mobile full-page screenshot (first image)
2. Compressed HTML source code

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
    console.error('Failed to parse GPT response:', error);

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
