/**
 * Firecrawl MCP Service
 * Wrapper for Firecrawl MCP tools to provide web scraping and screenshot capabilities
 */

import { startTimer } from '@/lib/utils/timing';

export interface FirecrawlScrapeResult {
  markdown: string;
  screenshot?: string; // base64 encoded PNG
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
  };
  url: string;
  scrapedAt: string;
}

export interface FirecrawlScrapeOptions {
  formats?: Array<'markdown' | 'screenshot' | 'html' | 'links'>;
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  includeTags?: string[];
  excludeTags?: string[];
  mobile?: boolean;
}

export interface FirecrawlBatchResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: FirecrawlScrapeResult[];
  total?: number;
  completed?: number;
  failed?: number;
}

/**
 * Default Firecrawl configuration optimized for e-commerce landing pages
 */
export const DEFAULT_FIRECRAWL_OPTIONS: FirecrawlScrapeOptions = {
  formats: ['markdown', 'screenshot'],
  onlyMainContent: true,
  waitFor: 2000,
  excludeTags: [
    'nav',
    'footer',
    'header[class*="nav"]',
    'div[class*="cookie"]',
    'div[class*="popup"]',
    'script',
    'style',
    'noscript',
  ],
  includeTags: [
    'main',
    'article',
    'section',
    'div[class*="content"]',
    'div[class*="product"]',
    'div[class*="hero"]',
  ],
  mobile: true, // Default to mobile-first analysis
};

export class FirecrawlService {
  private cache = new Map<string, { result: FirecrawlScrapeResult; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Scrape a single URL using Firecrawl MCP
   */
  async scrapePage(
    url: string,
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResult> {
    const timerStop = startTimer('firecrawl.scrape.single');
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
      const mergedOptions = { ...DEFAULT_FIRECRAWL_OPTIONS, ...options };

      // Note: This is a placeholder for the actual MCP call
      // The actual implementation will be handled by the MCP tool
      // which is called directly from the code that uses this service
      const result: FirecrawlScrapeResult = {
        markdown: '',
        screenshot: undefined,
        metadata: {
          title: '',
          description: '',
          sourceURL: url,
        },
        url,
        scrapedAt: new Date().toISOString(),
      };

      // Cache the result
      this.storeInCache(cacheKey, result);

      timerStop({ url, cached: false, success: true });
      return result;
    } catch (error) {
      timerStop({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`❌ Firecrawl scrape failed for ${url}:`, error);
      throw new Error(
        `Firecrawl scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scrape multiple URLs in batch using Firecrawl MCP
   */
  async scrapePagesBatch(
    urls: string[],
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResult[]> {
    const timerStop = startTimer('firecrawl.scrape.batch');

    console.log(`🌐 Firecrawl batch scraping ${urls.length} URLs`);

    try {
      const mergedOptions = { ...DEFAULT_FIRECRAWL_OPTIONS, ...options };

      // For batch operations, we'll scrape each URL individually
      // In a real implementation, you might want to use firecrawl_crawl for better efficiency
      const results = await Promise.all(
        urls.map((url) => this.scrapePage(url, options))
      );

      timerStop({ urlCount: urls.length, success: true });
      return results;
    } catch (error) {
      timerStop({
        urlCount: urls.length,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('❌ Firecrawl batch scrape failed:', error);
      throw new Error(
        `Firecrawl batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map a website to discover all URLs
   */
  async mapWebsite(baseUrl: string, limit: number = 50): Promise<string[]> {
    console.log(`🗺️  Firecrawl mapping website: ${baseUrl}`);

    try {
      // Note: This is a placeholder for the actual MCP call
      // The actual implementation will be handled by the MCP tool
      return [];
    } catch (error) {
      console.error(`❌ Firecrawl map failed for ${baseUrl}:`, error);
      throw new Error(
        `Firecrawl map failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search the web and optionally scrape results
   */
  async searchWeb(
    query: string,
    limit: number = 5,
    scrape: boolean = false
  ): Promise<any[]> {
    console.log(`🔍 Firecrawl searching: ${query}`);

    try {
      // Note: This is a placeholder for the actual MCP call
      // The actual implementation will be handled by the MCP tool
      return [];
    } catch (error) {
      console.error(`❌ Firecrawl search failed for "${query}":`, error);
      throw new Error(
        `Firecrawl search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract structured data from URLs using LLM
   */
  async extractStructuredData(
    urls: string[],
    schema: Record<string, any>,
    prompt?: string
  ): Promise<any[]> {
    console.log(`📊 Firecrawl extracting structured data from ${urls.length} URLs`);

    try {
      // Note: This is a placeholder for the actual MCP call
      // The actual implementation will be handled by the MCP tool
      return [];
    } catch (error) {
      console.error('❌ Firecrawl extract failed:', error);
      throw new Error(
        `Firecrawl extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Cache management
  private createCacheKey(url: string, options: FirecrawlScrapeOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}|${optionsStr}`;
  }

  private getFromCache(key: string): FirecrawlScrapeResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  private storeInCache(key: string, result: FirecrawlScrapeResult): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * Clear the cache (useful for testing or memory management)
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

// Export singleton instance
export const firecrawlService = new FirecrawlService();
