/**
 * Recommendation Generator Service
 * Generates CRO recommendations using AI (GPT or Claude)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { PageAnalysisResult } from '../analysis/page-analyzer';
import type { VisionAnalysisResult } from '@/lib/vision-analysis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface RecommendationRequest {
  pageData: PageAnalysisResult;
  visionAnalysis: VisionAnalysisResult | null;
  visualAnalysis: Record<string, any>;
  url: string;
  llm: 'gpt' | 'claude';
}

export interface RecommendationResult {
  insights: any;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Generates CRO recommendations using the specified LLM
 */
export async function generateRecommendations(
  request: RecommendationRequest
): Promise<RecommendationResult> {
  const { pageData, visionAnalysis, visualAnalysis, url, llm } = request;

  const visionNarrative = buildVisionNarrative(visionAnalysis);
  const visualSummary = buildVisualSummary(visualAnalysis);

  const prompt = buildPrompt(url, pageData, visionNarrative, visualSummary);

  if (llm === 'claude') {
    return await generateWithClaude(prompt);
  } else {
    return await generateWithGPT(prompt);
  }
}

/**
 * Generate recommendations using Claude
 */
async function generateWithClaude(prompt: string): Promise<RecommendationResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
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
 * Generate recommendations using GPT
 */
async function generateWithGPT(prompt: string): Promise<RecommendationResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert CRO analyst. Provide detailed, actionable analysis in valid JSON format.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const outputText = completion.choices[0]?.message?.content || '';
  const insights = parseAIResponse(outputText);

  return {
    insights,
    usage: {
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
    },
  };
}

/**
 * Builds the AI prompt
 */
function buildPrompt(
  url: string,
  pageData: PageAnalysisResult,
  visionNarrative: string,
  visualSummary: string
): string {
  return `
Analyze this DTC landing page for conversion optimization opportunities.

URL: ${url}

=== PAGE CONTENT ===
H1: ${pageData.h1}
Subheadline: ${pageData.subheadline}
Call-to-Actions: ${pageData.ctas.join(', ')}
Headlines: ${pageData.headlines.join(', ')}
Has Reviews: ${pageData.hasReviews}
Has Trust Badges: ${pageData.hasTrustBadges}
Has Urgency: ${pageData.hasUrgency}
Has Social Proof: ${pageData.hasSocialProof}
Meta Title: ${pageData.meta.title}
Meta Description: ${pageData.meta.description}

${visionNarrative}

${visualSummary}

=== ANALYSIS REQUEST ===
Provide a comprehensive CRO analysis in the following JSON format:

{
  "summary": {
    "headline": "One-sentence summary of the main issue",
    "diagnosticTone": "Brief diagnostic overview",
    "confidence": "high|medium|low"
  },
  "recommendations": [
    {
      "id": "unique-id",
      "title": "Clear test title",
      "hypothesis": "If we [change], then [expected outcome] because [reasoning]",
      "impact": "High|Medium|Low",
      "type": "Iterative|Substantial|Disruptive",
      "businessImpact": ["Conversion", "Spend", "Frequency", "Merchandise"],
      "kpi": "Primary metric to track",
      "rationale": "Why this matters",
      "currentState": "What exists now",
      "proposedChange": "What to change",
      "expectedLift": "X-Y%",
      "effort": "Low|Medium|High",
      "priority": "P0|P1|P2"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.
`.trim();
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
    console.error('Failed to parse AI response:', error);

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

/**
 * Builds narrative from vision analysis
 */
function buildVisionNarrative(visionAnalysis: any): string {
  if (!visionAnalysis) {
    return '=== VISUAL ANALYSIS ===\nNo visual analysis available.';
  }

  return `
=== VISUAL ANALYSIS ===
Hero: ${visionAnalysis.hero?.headline || 'N/A'}
CTAs: ${visionAnalysis.ctas?.length || 0} detected
Trust Signals: ${visionAnalysis.trustSignals?.join(', ') || 'None'}
Visual Hierarchy: ${visionAnalysis.visualHierarchy?.join(', ') || 'N/A'}
Responsiveness: ${visionAnalysis.responsiveness?.issues?.length || 0} issues
`.trim();
}

/**
 * Builds summary from visual sections
 */
function buildVisualSummary(visualAnalysis: Record<string, any>): string {
  if (!visualAnalysis || Object.keys(visualAnalysis).length === 0) {
    return '';
  }

  const sections = Object.entries(visualAnalysis)
    .map(([section, data]: [string, any]) => {
      return `${section}: ${data.analysis || 'No analysis'}`;
    })
    .join('\n');

  return `\n=== SECTION ANALYSIS ===\n${sections}`;
}
