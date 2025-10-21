/**
 * API Response Utilities
 * User-friendly error messages and consistent response format
 */

import { NextResponse } from 'next/server';
import { trackError, trackCriticalError } from './error-tracker';

export interface APIError {
  error: string;
  message: string;
  code: string;
  userMessage: string;
  details?: Record<string, any>;
}

export interface APISuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  UNAUTHORIZED: "Please log in to continue",
  FORBIDDEN: "You don't have permission to access this resource",
  INVALID_TOKEN: "Your session has expired. Please log in again",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again",

  // Database errors
  DATABASE_ERROR: "We're experiencing technical difficulties. Please try again in a few moments",
  QUERY_TIMEOUT: "This operation is taking too long. Please try again with fewer items",
  CONNECTION_ERROR: "We're having trouble connecting to our database. Please try again shortly",

  // AI API errors
  OPENAI_ERROR: "Our AI service is temporarily unavailable. Please try again in a moment",
  OPENAI_RATE_LIMIT: "Our AI service is experiencing high demand. Please try again in a few minutes",
  ANTHROPIC_ERROR: "Our AI service is temporarily unavailable. Please try again in a moment",
  AI_TIMEOUT: "The AI analysis is taking longer than expected. Please try again",

  // Firecrawl errors
  FIRECRAWL_ERROR: "We're having trouble analyzing this page. Please try a different URL",
  SCREENSHOT_FAILED: "We couldn't capture a screenshot of this page",

  // Validation errors
  INVALID_INPUT: "Please check your input and try again",
  MISSING_REQUIRED_FIELD: "Please fill in all required fields",
  INVALID_URL: "Please enter a valid URL",
  INVALID_WORKSPACE: "This workspace doesn't exist or you don't have access",

  // Generic
  INTERNAL_SERVER_ERROR: "Something went wrong on our end. We're looking into it",
  NOT_FOUND: "We couldn't find what you're looking for",
  SERVICE_UNAVAILABLE: "This service is temporarily unavailable. Please try again shortly",
};

/**
 * Create user-friendly error response
 */
export function errorResponse(
  error: Error | string,
  status: number = 500,
  code?: string,
  details?: Record<string, any>
): NextResponse<APIError> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = code || inferErrorCode(errorMessage, status);
  const userMessage = (ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_SERVER_ERROR) as string;

  // Track error
  if (status >= 500) {
    trackCriticalError(errorMessage, { status, code: errorCode, ...details });
  } else if (status >= 400) {
    trackError(errorMessage, { status, code: errorCode, ...details });
  }

  const response: APIError = {
    error: errorMessage,
    message: errorMessage,  // For backwards compatibility
    code: errorCode,
    userMessage,
  };

  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<APISuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Infer error code from error message or status
 */
function inferErrorCode(errorMessage: string, status: number): string {
  const lowerMessage = errorMessage.toLowerCase();

  // Authentication
  if (status === 401 || lowerMessage.includes('unauthorized')) {
    return 'UNAUTHORIZED';
  }
  if (status === 403 || lowerMessage.includes('forbidden')) {
    return 'FORBIDDEN';
  }

  // Rate limiting
  if (status === 429 || lowerMessage.includes('rate limit')) {
    return 'RATE_LIMIT_EXCEEDED';
  }

  // Database
  if (lowerMessage.includes('timeout')) {
    return 'QUERY_TIMEOUT';
  }
  if (lowerMessage.includes('database') || lowerMessage.includes('postgres')) {
    return 'DATABASE_ERROR';
  }
  if (lowerMessage.includes('connection')) {
    return 'CONNECTION_ERROR';
  }

  // AI APIs
  if (lowerMessage.includes('openai')) {
    if (lowerMessage.includes('rate')) {
      return 'OPENAI_RATE_LIMIT';
    }
    return 'OPENAI_ERROR';
  }
  if (lowerMessage.includes('anthropic') || lowerMessage.includes('claude')) {
    return 'ANTHROPIC_ERROR';
  }

  // Firecrawl
  if (lowerMessage.includes('firecrawl') || lowerMessage.includes('screenshot')) {
    return 'FIRECRAWL_ERROR';
  }

  // Validation
  if (status === 400) {
    if (lowerMessage.includes('url')) {
      return 'INVALID_URL';
    }
    if (lowerMessage.includes('required')) {
      return 'MISSING_REQUIRED_FIELD';
    }
    return 'INVALID_INPUT';
  }

  // Generic
  if (status === 404) {
    return 'NOT_FOUND';
  }
  if (status === 503) {
    return 'SERVICE_UNAVAILABLE';
  }

  return 'INTERNAL_SERVER_ERROR';
}

/**
 * Handle API errors with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors (4xx)
      if (error instanceof Error && error.message.includes('40')) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
