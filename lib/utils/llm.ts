/**
 * LLM Utilities
 * Helper functions for working with Language Models
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Token counting utilities
 */
export const TokenCounter = {
  /**
   * Rough estimate for GPT tokens (1 token ~= 4 chars)
   */
  estimateGPT(text: string): number {
    return Math.ceil(text.length / 4);
  },

  /**
   * Rough estimate for Claude tokens (1 token ~= 3.5 chars)
   */
  estimateClaude(text: string): number {
    return Math.ceil(text.length / 3.5);
  },
};

/**
 * Cost estimation utilities
 */
export const CostEstimator = {
  /**
   * GPT-4 Turbo pricing (as of 2024)
   */
  gpt4Turbo: {
    input: 0.01 / 1000, // $0.01 per 1K tokens
    output: 0.03 / 1000, // $0.03 per 1K tokens
  },

  /**
   * GPT-4 pricing
   */
  gpt4: {
    input: 0.03 / 1000,
    output: 0.06 / 1000,
  },

  /**
   * Claude 3 Opus pricing
   */
  claude3Opus: {
    input: 0.015 / 1000,
    output: 0.075 / 1000,
  },

  /**
   * Claude 3 Sonnet pricing
   */
  claude3Sonnet: {
    input: 0.003 / 1000,
    output: 0.015 / 1000,
  },

  /**
   * Calculate cost
   */
  calculate(
    model: 'gpt-4' | 'gpt-4-turbo' | 'claude-3-opus' | 'claude-3-sonnet',
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing =
      model === 'gpt-4'
        ? this.gpt4
        : model === 'gpt-4-turbo'
        ? this.gpt4Turbo
        : model === 'claude-3-opus'
        ? this.claude3Opus
        : this.claude3Sonnet;

    return inputTokens * pricing.input + outputTokens * pricing.output;
  },
};

/**
 * Retry utilities for LLM calls
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Invalid') ||
          error.message.includes('Unauthorized'))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Prompt building utilities
 */
export class PromptBuilder {
  private parts: string[] = [];

  system(text: string): this {
    this.parts.push(`SYSTEM: ${text}`);
    return this;
  }

  user(text: string): this {
    this.parts.push(`USER: ${text}`);
    return this;
  }

  assistant(text: string): this {
    this.parts.push(`ASSISTANT: ${text}`);
    return this;
  }

  section(title: string, content: string): this {
    this.parts.push(`\n## ${title}\n${content}`);
    return this;
  }

  list(items: string[]): this {
    items.forEach((item, i) => {
      this.parts.push(`${i + 1}. ${item}`);
    });
    return this;
  }

  code(code: string, language?: string): this {
    this.parts.push(`\`\`\`${language || ''}\n${code}\n\`\`\``);
    return this;
  }

  json(data: any): this {
    this.parts.push(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
    return this;
  }

  raw(text: string): this {
    this.parts.push(text);
    return this;
  }

  build(): string {
    return this.parts.join('\n\n');
  }
}

/**
 * JSON parsing with fallback
 */
export function parseJSONResponse<T>(
  response: string,
  fallback?: T
): T | undefined {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse the entire response
    return JSON.parse(response);
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return fallback;
  }
}

/**
 * Stream response handler
 */
export async function* streamResponse(
  stream: AsyncIterable<any>
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    const content =
      chunk.choices?.[0]?.delta?.content ||
      chunk.delta?.text ||
      chunk.content?.[0]?.text ||
      '';

    if (content) {
      yield content;
    }
  }
}

/**
 * Truncate text to fit token limit
 */
export function truncateToTokens(
  text: string,
  maxTokens: number,
  model: 'gpt' | 'claude' = 'gpt'
): string {
  const estimator = model === 'gpt'
    ? TokenCounter.estimateGPT
    : TokenCounter.estimateClaude;

  const tokens = estimator(text);
  if (tokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / tokens;
  const maxChars = Math.floor(text.length * ratio * 0.95); // 5% buffer
  return text.slice(0, maxChars) + '...';
}

/**
 * Batch process with rate limiting
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize = 5, delayMs = 1000, onProgress } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, items.length);
    }

    // Delay between batches (except for last batch)
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Extract structured data from LLM response
 */
export function extractStructured<T>(
  response: string,
  schema: {
    required: (keyof T)[];
    optional?: (keyof T)[];
  }
): T | null {
  const parsed = parseJSONResponse<T>(response);
  if (!parsed) {
    return null;
  }

  // Validate required fields
  for (const field of schema.required) {
    const fieldKey = String(field);
    if (typeof parsed === 'object' && parsed !== null && !(fieldKey in parsed)) {
      console.warn(`Missing required field: ${fieldKey}`);
      return null;
    }
  }

  return parsed;
}
