/**
 * Rate Limiting Utility
 * In-memory rate limiter with sliding window
 *
 * For production with multiple instances, use Upstash Redis:
 * npm install @upstash/ratelimit @upstash/redis
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    const success = validRequests.length < this.limit;

    if (success) {
      // Add current request
      validRequests.push(now);
      this.requests.set(identifier, validRequests);
    }

    // Calculate reset time
    const oldestRequest = validRequests[0] || now;
    const reset = oldestRequest + this.windowMs;

    return {
      success,
      limit: this.limit,
      remaining: Math.max(0, this.limit - validRequests.length),
      reset,
    };
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);

      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiter instance
// 10 requests per minute per user
const limiter = new InMemoryRateLimiter(10, 60000);

// Cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => limiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Rate limit check
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  return limiter.check(identifier);
}

/**
 * Rate limit middleware for API routes
 */
export async function checkRateLimit(
  identifier: string,
  options?: { limit?: number; windowMs?: number }
): Promise<RateLimitResult> {
  if (options) {
    const customLimiter = new InMemoryRateLimiter(options.limit, options.windowMs);
    return customLimiter.check(identifier);
  }

  return rateLimit(identifier);
}

/**
 * TODO: Upgrade to Upstash Redis for production
 *
 * Example Upstash implementation:
 *
 * import { Ratelimit } from '@upstash/ratelimit';
 * import { Redis } from '@upstash/redis';
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * export const ratelimit = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(10, '1 m'),
 *   analytics: true,
 * });
 */
