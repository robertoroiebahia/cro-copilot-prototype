/**
 * Firecrawl HTTP Client
 * Direct HTTP API client for Firecrawl scraping service
 * This replaces Playwright with Firecrawl's cloud-based scraping
 */

import { startTimer } from '@/lib/utils/timing';

export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    screenshot?: string; // base64 encoded PNG
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      viewport?: string;
      sourceURL?: string;
      url?: string;
      statusCode?: number;
      [key: string]: any;
    };
  };
  error?: string;
}

export interface FirecrawlScrapeOptions {
  formats?: Array<'markdown' | 'screenshot' | 'html' | 'links'>;
  onlyMainContent?: boolean;
  waitFor?: number;
  includeTags?: string[];
  excludeTags?: string[];
  mobile?: boolean;
  removeBase64Images?: boolean;
}

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v1';
  private cache = new Map<string, { result: FirecrawlScrapeResponse; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'FIRECRAWL_API_KEY environment variable is required. ' +
        'Get your API key from https://firecrawl.dev and add it to .env.local'
      );
    }
    // Log key status (first 8 chars only for security)
    console.log(`🔑 Firecrawl API key loaded: ${this.apiKey.substring(0, 8)}...`);
  }

  /**
   * Scrape a single URL using Firecrawl
   */
  async scrape(
    url: string,
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResponse> {
    const timerStop = startTimer('firecrawl.http.scrape');
    const cacheKey = this.createCacheKey(url, options);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`✓ Firecrawl cache hit: ${url}`);
      timerStop({ url, cached: true });
      return cached;
    }

    console.log(`🌐 Firecrawl scraping: ${url}`);

    try {
      const payload = {
        url,
        formats: options.formats || ['markdown', 'screenshot'],
        onlyMainContent: options.onlyMainContent ?? true,
        waitFor: options.waitFor || 2000,
        includeTags: options.includeTags,
        excludeTags: options.excludeTags,
        mobile: options.mobile ?? true,
        removeBase64Images: options.removeBase64Images ?? false,
      };

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Provide helpful error messages for common issues
        if (response.status === 401) {
          throw new Error(
            `Firecrawl API error (401): Unauthorized - Invalid API key. ` +
            `Please check your FIRECRAWL_API_KEY in .env.local. ` +
            `Get a valid key from https://firecrawl.dev`
          );
        } else if (response.status === 429) {
          throw new Error(
            `Firecrawl API error (429): Rate limit exceeded. ` +
            `Please wait a moment or upgrade your Firecrawl plan.`
          );
        } else if (response.status === 402) {
          throw new Error(
            `Firecrawl API error (402): Payment required. ` +
            `Your Firecrawl credits may be depleted. Check https://firecrawl.dev`
          );
        }

        throw new Error(
          `Firecrawl API error (${response.status}): ${errorData.error || response.statusText}`
        );
      }

      const result: FirecrawlScrapeResponse = await response.json();

      if (!result.success) {
        throw new Error(`Firecrawl scrape failed: ${result.error || 'Unknown error'}`);
      }

      // Cache successful results
      this.storeInCache(cacheKey, result);

      console.log(`✅ Firecrawl scrape completed: ${url}`);
      console.log(`📄 Markdown length: ${result.data?.markdown?.length || 0} chars`);
      console.log(`📸 Screenshot: ${result.data?.screenshot ? 'YES' : 'NO'}`);

      timerStop({ url, cached: false, success: true });
      return result;
    } catch (error) {
      timerStop({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`❌ Firecrawl scrape failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Scrape multiple URLs in parallel
   * Note: For large batches, consider using the crawl endpoint instead
   */
  async scrapeMultiple(
    urls: string[],
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResponse[]> {
    const timerStop = startTimer('firecrawl.http.scrape.batch');
    console.log(`🌐 Firecrawl batch scraping ${urls.length} URLs`);

    try {
      const results = await Promise.all(
        urls.map((url) =>
          this.scrape(url, options).catch((error) => ({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }))
        )
      );

      const successCount = results.filter((r) => r.success).length;
      console.log(`✅ Batch complete: ${successCount}/${urls.length} successful`);

      timerStop({ urlCount: urls.length, successCount });
      return results;
    } catch (error) {
      timerStop({
        urlCount: urls.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Map a website to discover URLs
   */
  async map(baseUrl: string, options: { limit?: number } = {}): Promise<string[]> {
    const timerStop = startTimer('firecrawl.http.map');
    console.log(`🗺️  Firecrawl mapping: ${baseUrl}`);

    try {
      const response = await fetch(`${this.baseUrl}/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url: baseUrl,
          limit: options.limit || 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl map failed: ${response.statusText}`);
      }

      const result = await response.json();
      const urls = result.data?.links || [];

      console.log(`✅ Found ${urls.length} URLs`);
      timerStop({ baseUrl, urlCount: urls.length });
      return urls;
    } catch (error) {
      timerStop({
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search the web using Firecrawl
   */
  async search(
    query: string,
    options: { limit?: number; scrape?: boolean } = {}
  ): Promise<any[]> {
    const timerStop = startTimer('firecrawl.http.search');
    console.log(`🔍 Firecrawl searching: ${query}`);

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: options.limit || 5,
          scrapeOptions: options.scrape
            ? {
                formats: ['markdown'],
                onlyMainContent: true,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl search failed: ${response.statusText}`);
      }

      const result = await response.json();
      const results = result.data || [];

      console.log(`✅ Found ${results.length} results`);
      timerStop({ query, resultCount: results.length });
      return results;
    } catch (error) {
      timerStop({
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Cache management
  private createCacheKey(url: string, options: FirecrawlScrapeOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}|${optionsStr}`;
  }

  private getFromCache(key: string): FirecrawlScrapeResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  private storeInCache(key: string, result: FirecrawlScrapeResponse): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let firecrawlClientInstance: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (!firecrawlClientInstance) {
    firecrawlClientInstance = new FirecrawlClient();
  }
  return firecrawlClientInstance;
}
