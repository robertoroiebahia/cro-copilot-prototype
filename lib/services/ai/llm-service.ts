/**
 * Centralized LLM Service
 * Single service for all LLM calls with swappable prompts
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Logger, createLogger, LogLevel } from '../../utils/logger';
import { LLMError } from '../../utils/errors';
import { parseJSONResponse, CostEstimator } from '../../utils/llm';

export type LLMProvider = 'gpt' | 'claude';

export interface LLMRequest {
  prompt: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  images?: string[]; // Array of image URLs or base64 data URLs for vision models
}

export interface LLMResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    provider: LLMProvider;
    model: string;
    tokensUsed?: number;
    estimatedCost?: number;
    processingTime: number;
  };
}

/**
 * Centralized LLM Service
 * Handles all LLM calls regardless of provider
 */
export class LLMService {
  private gptClient: OpenAI;
  private claudeClient: Anthropic;
  private logger: Logger;

  constructor() {
    this.gptClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'llm-service',
    });
  }

  /**
   * Execute LLM request with any prompt
   */
  async execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>> {
    const startTime = Date.now();
    const provider = request.provider || 'gpt';

    this.logger.info('Executing LLM request', {
      provider,
      promptLength: request.prompt.length,
    });

    try {
      if (provider === 'gpt') {
        return await this.executeGPT<T>(request, startTime);
      } else {
        return await this.executeClaude<T>(request, startTime);
      }
    } catch (error) {
      this.logger.error(
        'LLM execution failed',
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          provider,
          model: request.model || 'unknown',
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Execute GPT request
   */
  private async executeGPT<T>(request: LLMRequest, startTime: number): Promise<LLMResponse<T>> {
    // Use GPT-5 Mini which supports vision
    const model = request.model || 'gpt-5-mini';

    // Build user message content
    let userContent: any;
    if (request.images && request.images.length > 0) {
      // Vision request with images - use current format
      userContent = [
        {
          type: 'text',
          text: request.prompt,
        },
        ...request.images.map(imageUrl => ({
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        })),
      ];
    } else {
      // Standard text request
      userContent = request.prompt;
    }

    // GPT-5 Mini only supports default temperature (1), don't set it
    // Vision requests need more tokens for detailed analysis
    const defaultMaxTokens = (request.images && request.images.length > 0) ? 20000 : 4096;

    const requestOptions: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert CRO analyst. Extract atomic, actionable insights.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      // Don't use response_format with vision requests or gpt-5-mini - rely on prompt instructions instead
      response_format: (request.images && request.images.length > 0) || model.includes('gpt-5-mini')
        ? undefined
        : { type: 'json_object' },
      max_completion_tokens: request.maxTokens || defaultMaxTokens,
    };

    // Only add temperature for non-gpt-5-mini models
    if (!model.includes('gpt-5-mini')) {
      requestOptions.temperature = request.temperature || 0.7;
    }

    this.logger.info('Calling OpenAI API', {
      model,
      hasImages: !!(request.images && request.images.length > 0),
      imageCount: request.images?.length || 0,
      hasResponseFormat: !!requestOptions.response_format,
      hasTemperature: requestOptions.temperature !== undefined,
    });

    const completion = await this.gptClient.chat.completions.create(requestOptions);

    this.logger.info('OpenAI API response received', {
      model,
      hasChoices: !!completion.choices?.[0],
      hasMessage: !!completion.choices?.[0]?.message,
      hasContent: !!completion.choices?.[0]?.message?.content,
      contentLength: completion.choices?.[0]?.message?.content?.length || 0,
      finishReason: completion.choices?.[0]?.finish_reason,
      choicesCount: completion.choices?.length || 0,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      this.logger.error('Empty response from GPT', new Error('No content'), {
        model,
        completionObject: JSON.stringify(completion, null, 2),
      });
      throw new Error('No response from GPT');
    }

    const parsed = parseJSONResponse<T>(response);
    const usage = completion.usage;
    const estimatedCost = usage
      ? CostEstimator.calculate(model as any, usage.prompt_tokens, usage.completion_tokens)
      : 0;

    this.logger.info('GPT request completed', {
      model,
      tokens: usage?.total_tokens,
      cost: estimatedCost,
    });

    return {
      success: true,
      data: parsed,
      metadata: {
        provider: 'gpt',
        model,
        tokensUsed: usage?.total_tokens,
        estimatedCost,
        processingTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Execute Claude request
   */
  private async executeClaude<T>(
    request: LLMRequest,
    startTime: number
  ): Promise<LLMResponse<T>> {
    // Use latest Claude Sonnet 4.5 model
    const model = request.model || 'claude-sonnet-4-5-20250929';

    // Build message content
    let messageContent: any;
    if (request.images && request.images.length > 0) {
      // Vision request with images - use current format
      messageContent = [
        ...request.images.map(imageUrl => {
          // Check if it's a base64 data URL
          if (imageUrl.startsWith('data:image/')) {
            // Extract base64 data and media type
            const matches = imageUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
            if (matches) {
              return {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: matches[2],
                },
              };
            }
          }
          // For regular URLs, would need to fetch and convert to base64
          // For now, just include text warning
          return {
            type: 'text' as const,
            text: `[Screenshot URL: ${imageUrl}]`,
          };
        }),
        {
          type: 'text' as const,
          text: request.prompt,
        },
      ];
    } else {
      // Standard text request
      messageContent = request.prompt;
    }

    const message = await this.claudeClient.messages.create({
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    const response = message.content[0];
    if (!response || response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const parsed = parseJSONResponse<T>(response.text);
    const usage = message.usage;
    const estimatedCost = CostEstimator.calculate(
      model.includes('opus') ? 'claude-3-opus' : 'claude-3-sonnet',
      usage.input_tokens,
      usage.output_tokens
    );

    this.logger.info('Claude request completed', {
      model,
      tokens: usage.input_tokens + usage.output_tokens,
      cost: estimatedCost,
    });

    return {
      success: true,
      data: parsed,
      metadata: {
        provider: 'claude',
        model,
        tokensUsed: usage.input_tokens + usage.output_tokens,
        estimatedCost,
        processingTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Create LLM service instance
 */
export function createLLMService(): LLMService {
  return new LLMService();
}

/**
 * Default LLM service instance
 */
export const llmService = createLLMService();
