/**
 * Firecrawl Service
 * Wrapper for Firecrawl scraping integration
 */

import { FirecrawlConfig, FirecrawlScrapeResult } from '../types/integrations';
import { ExternalServiceError } from '../utils/errors';
import { Logger, createLogger, LogLevel } from '../utils/logger';
import { withRetry } from '../utils/llm';

/**
 * Firecrawl Service Class
 */
export class FirecrawlService {
  private config: FirecrawlConfig;
  private logger: Logger;

  constructor(config: FirecrawlConfig) {
    this.config = {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 0,
      ...config,
    };

    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'firecrawl-service',
    });
  }

  /**
   * Scrape a URL
   */
  async scrape(url: string, options?: Partial<FirecrawlConfig>): Promise<FirecrawlScrapeResult> {
    const mergedOptions = { ...this.config, ...options };

    this.logger.info('Scraping URL', { url, options: mergedOptions });

    try {
      const result = await withRetry(
        async () => this.performScrape(url, mergedOptions),
        {
          maxRetries: mergedOptions.retries || 3,
          initialDelay: 1000,
        }
      );

      this.logger.info('Scrape completed', {
        url,
        hasMarkdown: !!result.markdown,
        hasHtml: !!result.html,
      });

      return result;
    } catch (error) {
      this.logger.error(
        'Scrape failed',
        error instanceof Error ? error : new Error(String(error)),
        { url }
      );

      throw new ExternalServiceError(
        'Firecrawl',
        `Failed to scrape ${url}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Perform actual scrape (to be implemented with actual API)
   */
  private async performScrape(
    url: string,
    options: FirecrawlConfig
  ): Promise<FirecrawlScrapeResult> {
    // This is a placeholder - in production, use the actual Firecrawl client
    // For now, we'll use the existing firecrawl-client.ts

    const { getFirecrawlClient } = await import('./firecrawl-client');
    const client = getFirecrawlClient();

    const response = await client.scrape(url, {
      formats: options.formats as any,
      onlyMainContent: options.onlyMainContent,
      includeTags: options.includeTags,
      excludeTags: options.excludeTags,
      waitFor: options.waitFor,
    });

    if (!response.success) {
      throw new Error(response.error || 'Scrape failed');
    }

    return {
      success: true,
      markdown: response.data?.markdown,
      html: response.data?.html,
      screenshot: response.data?.screenshot,
      metadata: response.data?.metadata,
    };
  }

  /**
   * Batch scrape multiple URLs
   */
  async scrapeBatch(
    urls: string[],
    options?: Partial<FirecrawlConfig>
  ): Promise<FirecrawlScrapeResult[]> {
    this.logger.info('Batch scraping URLs', { count: urls.length });

    const results = await Promise.allSettled(
      urls.map((url) => this.scrape(url, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error('Batch scrape item failed', result.reason, {
          url: urls[index],
        });
        return {
          success: false,
          error: result.reason.message,
        };
      }
    });
  }

  /**
   * Check if service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple scrape of a known good URL
      const result = await this.scrape('https://example.com', {
        timeout: 5000,
      });
      return result.success;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create a Firecrawl service instance
 */
export function createFirecrawlService(config?: Partial<FirecrawlConfig>): FirecrawlService {
  const apiKey = config?.apiKey || process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('Firecrawl API key is required');
  }

  return new FirecrawlService({
    name: 'firecrawl',
    enabled: true,
    apiKey,
    baseUrl: config?.baseUrl || 'https://api.firecrawl.dev',
    timeout: config?.timeout || 30000,
    ...config,
  });
}

/**
 * Default Firecrawl service instance
 */
export const firecrawlService = process.env.FIRECRAWL_API_KEY
  ? createFirecrawlService()
  : null;
