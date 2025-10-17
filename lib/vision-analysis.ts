import OpenAI from 'openai';
import {
  VISION_ANALYSIS_SYSTEM_PROMPT,
  VISION_ANALYSIS_USER_TEMPLATE,
} from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry + pricing guard rails keep each analysis under the $0.50 target while
// avoiding hard failures on occasional 429s from the Vision API.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MODEL = 'gpt-5';
// Capping output tokens encourages concise results and bounds worst-case cost.
const MAX_OUTPUT_TOKENS = 1500;

export type VisionAnalysisStatus = 'ok' | 'unreadable';
export type ProminenceLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface VisionHeroSummary {
  headline: string | null;
  subheadline: string | null;
  cta: {
    text: string | null;
    styleClues: string[];
  };
  supportingElements: string[];
}

export interface VisionCTAInsight {
  text: string;
  prominence: ProminenceLevel;
  locationHint: string;
}

export interface VisionResponsiveness {
  issues: string[];
  overallRisk: 'low' | 'medium' | 'high';
}

export interface VisionPerformanceSignals {
  heavyMedia: boolean;
  notes: string | null;
}

export interface VisionDifferences {
  notes: string[];
  flagged: boolean;
}

export interface VisionAnalysisResult {
  status: VisionAnalysisStatus;
  hero: VisionHeroSummary;
  ctas: VisionCTAInsight[];
  trustSignals: string[];
  visualHierarchy: string[];
  responsiveness: VisionResponsiveness;
  performanceSignals: VisionPerformanceSignals;
  differences: VisionDifferences;
  confidence: ConfidenceLevel;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedUsd: number;
  };
}

export interface AnalyzeAboveFoldParams {
  desktopImageBase64: string;
  mobileImageBase64: string;
}

export class VisionAnalysisError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'VisionAnalysisError';
  }
}

export async function analyzeAboveFold({
  desktopImageBase64,
  mobileImageBase64,
}: AnalyzeAboveFoldParams): Promise<VisionAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new VisionAnalysisError('OPENAI_API_KEY is not configured');
  }

  try {
    const response = await withRetry(() =>
      openai.responses.create({
        model: MODEL,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  VISION_ANALYSIS_SYSTEM_PROMPT.trim(),
                  '',
                  VISION_ANALYSIS_USER_TEMPLATE({ context: 'comparison' }),
                ].join('\n'),
              },
              {
                type: 'input_image',
                image_url: `data:image/png;base64,${desktopImageBase64}`,
              },
              {
                type: 'input_image',
                image_url: `data:image/png;base64,${mobileImageBase64}`,
              },
            ],
          },
        ],
        reasoning: {
          effort: 'minimal',
        },
        text: {
          verbosity: 'low',
        },
        max_output_tokens: MAX_OUTPUT_TOKENS,
      }),
    );

    if ('status' in response && response.status === 'incomplete') {
      const reason =
        ('incomplete_details' in response && response.incomplete_details?.reason) || 'unknown';
      console.error('GPT-5 vision response incomplete:', response);
      throw new VisionAnalysisError(`Vision model stopped early (reason: ${reason}).`);
    }

    const messageContent = extractResponseText(response);
    if (!messageContent) {
      console.error('GPT-5 vision response without content:', response);
      throw new VisionAnalysisError('Empty response from GPT-5');
    }

    const parsed = parseVisionResponse(messageContent);
    const validated = validateVisionResult(parsed);

    if (response.usage) {
      const {
        input_tokens = 0,
        output_tokens = 0,
      } = response.usage;
      validated.cost = {
        inputTokens: input_tokens,
        outputTokens: output_tokens,
        estimatedUsd: estimateVisionCostUSD(input_tokens, output_tokens),
      };
    }

    return validated;
  } catch (error: any) {
    if (error instanceof VisionAnalysisError) {
      throw error;
    }
    if (error && typeof error === 'object' && 'response' in error && error.response?.data) {
      console.error('GPT-5 vision raw error payload:', error.response.data);
    }
    throw new VisionAnalysisError(error?.message || 'Vision analysis failed', error);
  }
}

function parseVisionResponse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new VisionAnalysisError('Failed to parse GPT-5 response as JSON', error);
  }
}

function validateVisionResult(data: any): VisionAnalysisResult {
  if (!data || typeof data !== 'object') {
    throw new VisionAnalysisError('GPT-5 response is not an object');
  }

  const status = data.status;
  if (status !== 'ok' && status !== 'unreadable') {
    throw new VisionAnalysisError('Invalid status in GPT-5 response');
  }

  const hero = ensureObject(data.hero, 'hero');
  const heroSummary: VisionHeroSummary = {
    headline: ensureNullableString(hero.headline, 'hero.headline'),
    subheadline: ensureNullableString(hero.subheadline, 'hero.subheadline'),
    cta: {
      text: ensureNullableString(hero.cta?.text, 'hero.cta.text'),
      styleClues: ensureStringArray(hero.cta?.styleClues ?? [], 'hero.cta.styleClues'),
    },
    supportingElements: ensureStringArray(hero.supportingElements ?? [], 'hero.supportingElements'),
  };

  const result: VisionAnalysisResult = {
    status,
    hero: heroSummary,
    ctas: ensureCTAArray(data.ctas ?? []),
    trustSignals: ensureStringArray(data.trustSignals ?? [], 'trustSignals'),
    visualHierarchy: ensureStringArray(data.visualHierarchy ?? [], 'visualHierarchy').slice(0, 3),
    responsiveness: ensureResponsiveness(data.responsiveness),
    performanceSignals: ensurePerformanceSignals(data.performanceSignals),
    differences: ensureDifferences(data.differences),
    confidence: ensureConfidence(data.confidence),
  };

  return result;
}

function ensureObject(value: any, field: string): Record<string, any> {
  if (!value || typeof value !== 'object') {
    throw new VisionAnalysisError(`Missing or invalid ${field}`);
  }
  return value;
}

function ensureNullableString(value: any, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new VisionAnalysisError(`Expected ${field} to be a string or null`);
  }
  return value;
}

function ensureStringArray(value: any, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new VisionAnalysisError(`Expected ${field} to be an array`);
  }
  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new VisionAnalysisError(`Expected ${field}[${index}] to be a string`);
    }
    return item;
  });
}

function ensureCTAArray(value: any): VisionCTAInsight[] {
  if (!Array.isArray(value)) {
    throw new VisionAnalysisError('Expected ctas to be an array');
  }

  return value.map((cta, index) => {
    if (!cta || typeof cta !== 'object') {
      throw new VisionAnalysisError(`Expected ctas[${index}] to be an object`);
    }

    const text = ensureNullableString(cta.text, `ctas[${index}].text`);

    if (!['high', 'medium', 'low'].includes(cta.prominence)) {
      throw new VisionAnalysisError(`Invalid ctas[${index}].prominence value`);
    }

    return {
      text: text ?? '',
      prominence: cta.prominence,
      locationHint: typeof cta.locationHint === 'string' ? cta.locationHint : 'unspecified',
    } as VisionCTAInsight;
  });
}

function ensureResponsiveness(value: any): VisionResponsiveness {
  if (!value || typeof value !== 'object') {
    throw new VisionAnalysisError('Missing responsiveness section');
  }

  if (!['low', 'medium', 'high'].includes(value.overallRisk)) {
    throw new VisionAnalysisError('Invalid responsiveness.overallRisk value');
  }

  return {
    issues: ensureStringArray(value.issues ?? [], 'responsiveness.issues'),
    overallRisk: value.overallRisk,
  };
}

function ensurePerformanceSignals(value: any): VisionPerformanceSignals {
  if (!value || typeof value !== 'object') {
    throw new VisionAnalysisError('Missing performanceSignals section');
  }

  if (typeof value.heavyMedia !== 'boolean') {
    throw new VisionAnalysisError('performanceSignals.heavyMedia must be boolean');
  }

  const notes = value.notes ?? null;
  if (notes !== null && typeof notes !== 'string') {
    throw new VisionAnalysisError('performanceSignals.notes must be string or null');
  }

  return {
    heavyMedia: value.heavyMedia,
    notes,
  };
}

function ensureDifferences(value: any): VisionDifferences {
  if (!value || typeof value !== 'object') {
    throw new VisionAnalysisError('Missing differences section');
  }

  if (typeof value.flagged !== 'boolean') {
    throw new VisionAnalysisError('differences.flagged must be boolean');
  }

  return {
    flagged: value.flagged,
    notes: ensureStringArray(value.notes ?? [], 'differences.notes'),
  };
}

function ensureConfidence(value: any): ConfidenceLevel {
  if (!['low', 'medium', 'high'].includes(value)) {
    throw new VisionAnalysisError('Invalid confidence value');
  }
  return value;
}

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    if (attempt >= MAX_RETRIES || (status && status !== 429)) {
      throw error;
    }

    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, attempt + 1);
  }
}

function extractResponseText(response: Awaited<ReturnType<typeof openai.responses.create>>): string | null {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  const outputArray = Array.isArray(response.output) ? response.output : [];
  for (const item of outputArray) {
    if (!item) continue;

    if (item.type === 'output_text' && typeof item.text === 'string') {
      if (item.text.trim().length > 0) {
        return item.text;
      }
    }

    if (
      (item.type === 'json' || item.type === 'json_object') &&
      item instanceof Object &&
      'json' in item &&
      item.json
    ) {
      const stringified = typeof item.json === 'string' ? item.json : JSON.stringify(item.json);
      if (stringified.trim().length > 0) {
        return stringified;
      }
    }

    if (item.type === 'message') {
      const content = Array.isArray((item as any).content) ? (item as any).content : [];
      for (const part of content) {
        if (
          part &&
          (part.type === 'output_text' || part.type === 'text') &&
          typeof part.text === 'string'
        ) {
          const trimmed = part.text.trim();
          if (trimmed.length > 0) {
            return trimmed;
          }
        }

        if (
          part &&
          (part.type === 'json' || part.type === 'json_object') &&
          part.json
        ) {
          const stringified =
            typeof part.json === 'string' ? part.json : JSON.stringify(part.json);
          if (stringified.trim().length > 0) {
            return stringified;
          }
        }
      }
    }
  }

  return null;
}

function estimateVisionCostUSD(inputTokens: number, outputTokens: number): number {
  // Estimated pricing for GPT-5 (subject to change): $0.01 per 1K prompt tokens, $0.03 per 1K completion tokens.
  const promptCost = (inputTokens / 1000) * 0.01;
  const completionCost = (outputTokens / 1000) * 0.03;
  const total = promptCost + completionCost;
  return Number(total.toFixed(4));
}
