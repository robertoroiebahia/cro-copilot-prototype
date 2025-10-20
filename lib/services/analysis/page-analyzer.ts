/**
 * Page Analysis Service (REFACTORED for Firecrawl)
 * Extracts content and screenshots from web pages using Firecrawl API
 */

import { startTimer } from '@/lib/utils/timing';
import { getFirecrawlClient, type FirecrawlScrapeOptions } from '@/lib/services/firecrawl-client';

export interface PageAnalysisResult {
  compressedHTML: string; // Markdown content from Firecrawl - ready for AI
  url: string;
  scrapedAt: string;
  method: 'firecrawl-api';
  pageLoadTime: number;
  screenshots?: {
    mobileFullPage?: string; // base64 PNG from Firecrawl
  };
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
  };
}

/**
 * Analyzes a web page and returns markdown content with screenshots using Firecrawl
 *
 * This function now uses Firecrawl API instead of Playwright for:
 * - Better reliability with automatic proxy rotation
 * - Built-in JavaScript rendering
 * - Automatic retry logic
 * - Cloud-based scraping (no browser management)
 */
export async function analyzePage(url: string): Promise<PageAnalysisResult> {
  const startTime = Date.now();
  const overallTimerStop = startTimer('analysis.scraper.total');
  let timerMeta: Record<string, unknown> = { url, method: 'firecrawl-api' };

  console.log(`🌐 Starting Firecrawl analysis for: ${url}`);

  try {
    const firecrawl = getFirecrawlClient();

    // Configure Firecrawl for optimal e-commerce scraping
    const scrapeOptions: FirecrawlScrapeOptions = {
      formats: ['markdown', 'screenshot'],
      onlyMainContent: true,
      waitFor: 2000,
      mobile: true, // Mobile-first for CRO analysis
      removeBase64Images: true, // Remove embedded images to reduce markdown size
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
    };

    console.log(`📝 Scraping with options:`, {
      formats: scrapeOptions.formats,
      mobile: scrapeOptions.mobile,
      onlyMainContent: scrapeOptions.onlyMainContent,
    });

    // Scrape the page using Firecrawl
    const result = await firecrawl.scrape(url, scrapeOptions);

    if (!result.success || !result.data) {
      throw new Error(`Firecrawl returned unsuccessful result: ${result.error || 'No data'}`);
    }

    const { markdown, screenshot, metadata } = result.data;

    // Calculate page load time
    const pageLoadTime = Date.now() - startTime;

    // Log results
    console.log(`✅ Firecrawl scrape completed in ${pageLoadTime}ms`);
    console.log(`📄 Markdown length: ${markdown?.length || 0} characters`);
    console.log(`📸 Screenshot available: ${!!screenshot}`);
    console.log(`📋 Metadata:`, {
      title: metadata?.title,
      statusCode: metadata?.statusCode,
      language: metadata?.language,
    });

    // Construct the result in the expected format
    const analysisResult: PageAnalysisResult = {
      compressedHTML: markdown || '',
      url: metadata?.url || url,
      scrapedAt: new Date().toISOString(),
      method: 'firecrawl-api',
      pageLoadTime,
      screenshots: screenshot
        ? {
            mobileFullPage: screenshot,
          }
        : undefined,
      metadata: metadata
        ? {
            title: metadata.title,
            description: metadata.description,
            language: metadata.language,
          }
        : undefined,
    };

    timerMeta = {
      ...timerMeta,
      pageLoadTime,
      markdownLength: markdown?.length || 0,
      hasScreenshot: !!screenshot,
    };
    overallTimerStop(timerMeta);

    return analysisResult;
  } catch (error) {
    timerMeta = {
      ...timerMeta,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error('❌ Firecrawl analysis error:', error);
    overallTimerStop(timerMeta);

    throw new Error(
      `Failed to analyze page with Firecrawl: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Batch analyze multiple URLs using Firecrawl
 * More efficient than calling analyzePage multiple times due to parallel processing
 */
export async function analyzePagesBatch(
  urls: string[]
): Promise<PageAnalysisResult[]> {
  const overallTimerStop = startTimer('analysis.scraper.batch');
  console.log(`🌐 Starting Firecrawl batch analysis for ${urls.length} URLs`);

  try {
    const firecrawl = getFirecrawlClient();

    const scrapeOptions: FirecrawlScrapeOptions = {
      formats: ['markdown', 'screenshot'],
      onlyMainContent: true,
      waitFor: 2000,
      mobile: true,
      removeBase64Images: true,
      excludeTags: [
        'nav',
        'footer',
        'header[class*="nav"]',
        'div[class*="cookie"]',
        'div[class*="popup"]',
      ],
    };

    // Scrape all URLs in parallel
    const results = await firecrawl.scrapeMultiple(urls, scrapeOptions);

    // Transform results into PageAnalysisResult format
    const analysisResults: PageAnalysisResult[] = results.map((result, index) => {
      const url = urls[index] || '';

      if (!result.success || !result.data) {
        console.warn(`⚠️  Failed to scrape ${url}: ${result.error || 'No data'}`);
        return {
          compressedHTML: '',
          url,
          scrapedAt: new Date().toISOString(),
          method: 'firecrawl-api',
          pageLoadTime: 0,
          metadata: {
            title: 'Failed to scrape',
            description: result.error || 'Unknown error',
          },
        };
      }

      const { markdown, screenshot, metadata } = result.data;

      return {
        compressedHTML: markdown || '',
        url: metadata?.url || url,
        scrapedAt: new Date().toISOString(),
        method: 'firecrawl-api',
        pageLoadTime: 0, // Not tracked in batch mode
        screenshots: screenshot
          ? {
              mobileFullPage: screenshot,
            }
          : undefined,
        metadata: metadata
          ? {
              title: metadata.title,
              description: metadata.description,
              language: metadata.language,
            }
          : undefined,
      };
    });

    const successCount = analysisResults.filter((r) => r.compressedHTML).length;
    console.log(`✅ Batch analysis complete: ${successCount}/${urls.length} successful`);

    overallTimerStop({ urlCount: urls.length, successCount });
    return analysisResults;
  } catch (error) {
    overallTimerStop({
      urlCount: urls.length,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('❌ Firecrawl batch analysis error:', error);
    throw new Error(
      `Failed to batch analyze pages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
