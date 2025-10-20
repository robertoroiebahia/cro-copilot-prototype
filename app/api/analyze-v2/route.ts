/**
 * Analysis API v2
 * New modular analysis endpoint using the module system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPageAnalyzer } from '@/lib/analyzers/page-analyzer';
import { createThemeClusterer } from '@/lib/analyzers/theme-clusterer';
import { createHypothesisGenerator } from '@/lib/analyzers/hypothesis-generator';
import { createFirecrawlService } from '@/lib/services/firecrawl';
import { logger } from '@/lib/utils/logger';
import { AppError, ValidationError, ErrorHandler } from '@/lib/utils/errors';

/**
 * POST /api/analyze-v2
 * Analyze a URL and extract insights, themes, and hypotheses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { url, userId, options = {} } = body;

    // Validate input
    if (!url || !userId) {
      throw new ValidationError('URL and userId are required', { url, userId });
    }

    logger.info('Starting analysis v2', { url, userId });

    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Scrape the page
    logger.info('Scraping page', { url });
    const firecrawl = createFirecrawlService();
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    });

    if (!scrapeResult.success || !scrapeResult.markdown) {
      throw new Error('Failed to scrape page');
    }

    // Step 2: Analyze page and extract insights
    logger.info('Extracting insights', { url });
    const analyzer = createPageAnalyzer(options.llmProvider || 'gpt');
    const analysisResult = await analyzer.execute({
      analysisId,
      userId,
      url,
      content: {
        url,
        markdown: scrapeResult.markdown,
        html: scrapeResult.html,
        screenshot: scrapeResult.screenshot,
        metadata: scrapeResult.metadata,
      },
    });

    if (!analysisResult.success || !analysisResult.data) {
      throw new Error('Analysis failed: ' + analysisResult.error?.message);
    }

    const insights = analysisResult.data.insights;
    logger.info('Insights extracted', { count: insights.length });

    // Step 3: Cluster insights into themes (optional)
    let themes: any[] = [];
    if (options.generateThemes && insights.length >= 2) {
      logger.info('Clustering themes', { insightCount: insights.length });
      const clusterer = createThemeClusterer();
      const themeResult = await clusterer.execute({
        analysisId,
        userId,
        url,
        insights,
        options: {
          minClusterSize: 2,
          maxClusters: 5,
        },
      });

      if (themeResult.success && themeResult.data) {
        themes = themeResult.data.themes;
        logger.info('Themes created', { count: themes.length });
      }
    }

    // Step 4: Generate hypotheses (optional)
    let hypotheses: any[] = [];
    if (options.generateHypotheses && themes.length > 0) {
      logger.info('Generating hypotheses', { themeCount: themes.length });
      const generator = createHypothesisGenerator();

      for (const theme of themes.slice(0, 3)) {
        // Top 3 themes
        const hypothesisResult = await generator.execute({
          analysisId,
          userId,
          url,
          theme,
          insights: theme.insights || [],
          options: {
            maxHypotheses: 2,
          },
        });

        if (hypothesisResult.success && hypothesisResult.data) {
          hypotheses.push(...hypothesisResult.data.hypotheses);
        }
      }

      logger.info('Hypotheses generated', { count: hypotheses.length });
    }

    // Prepare response
    const duration = Date.now() - startTime;
    const response = {
      success: true,
      analysisId,
      url,
      insights,
      themes,
      hypotheses,
      summary: analysisResult.data.summary,
      metadata: {
        duration,
        insightCount: insights.length,
        themeCount: themes.length,
        hypothesisCount: hypotheses.length,
        llmProvider: options.llmProvider || 'gpt',
      },
    };

    logger.info('Analysis completed', {
      analysisId,
      duration,
      insights: insights.length,
      themes: themes.length,
      hypotheses: hypotheses.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      'Analysis failed',
      error instanceof Error ? error : new Error(String(error)),
      { duration }
    );

    // Format error for response
    const formattedError =
      error instanceof AppError
        ? ErrorHandler.formatError(error)
        : {
            message: error instanceof Error ? error.message : 'Unknown error',
            statusCode: 500,
          };

    return NextResponse.json(
      {
        success: false,
        error: formattedError.message,
        context: formattedError.context,
      },
      { status: formattedError.statusCode }
    );
  }
}

/**
 * GET /api/analyze-v2
 * Get API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Analysis API v2',
    version: '2.0.0',
    description: 'Modular page analysis with insights, themes, and hypotheses',
    endpoints: {
      POST: {
        description: 'Analyze a URL',
        body: {
          url: 'string (required)',
          userId: 'string (required)',
          options: {
            llmProvider: '"gpt" | "claude" (default: "gpt")',
            generateThemes: 'boolean (default: false)',
            generateHypotheses: 'boolean (default: false)',
          },
        },
        response: {
          analysisId: 'string',
          url: 'string',
          insights: 'AtomicInsight[]',
          themes: 'Theme[]',
          hypotheses: 'Hypothesis[]',
          summary: 'object',
          metadata: 'object',
        },
      },
    },
    example: {
      request: {
        url: 'https://example.com',
        userId: 'user123',
        options: {
          llmProvider: 'gpt',
          generateThemes: true,
          generateHypotheses: true,
        },
      },
    },
  });
}
