/**
 * Analysis API v2
 * New modular analysis endpoint using the module system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createPageAnalyzer } from '@/lib/analyzers/page-analyzer';
import { createThemeClusterer } from '@/lib/analyzers/theme-clusterer';
import { createHypothesisGenerator } from '@/lib/analyzers/hypothesis-generator';
import { createFirecrawlService } from '@/lib/services/firecrawl';
import { logger } from '@/lib/utils/logger';
import { AppError, ValidationError, ErrorHandler } from '@/lib/utils/errors';
import { rateLimit } from '@/lib/utils/rate-limit';
import { validateWorkspaceAccess } from '@/lib/utils/workspace-validation';

/**
 * POST /api/analyze-v2
 * Analyze a URL and extract insights, themes, and hypotheses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ✅ Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Rate limit check
    const rateLimitResult = await rateLimit(user.id);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: user.id });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url, workspaceId, options = {} } = body;
    const userId = user.id; // ✅ Use authenticated user ID

    // Validate input
    if (!url) {
      throw new ValidationError('URL is required', { url });
    }

    // ✅ Validate workspaceId
    if (!workspaceId) {
      return NextResponse.json(
        {
          error: 'Workspace ID is required',
          code: 'WORKSPACE_REQUIRED',
          message: 'Please select a workspace to continue',
        },
        { status: 400 }
      );
    }

    // ✅ Verify workspace belongs to user
    const validation = await validateWorkspaceAccess(workspaceId, userId);
    if (!validation.valid) {
      return validation.error!;
    }

    logger.info('Starting analysis v2', { url, userId, workspaceId });

    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Scrape the page with screenshot
    logger.info('Scraping page', { url });
    const firecrawl = createFirecrawlService();
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ['markdown', 'html', 'screenshot'], // Enable screenshot capture
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

    // ✅ Save analysis to database
    logger.info('Saving analysis with screenshot', {
      hasScreenshot: !!scrapeResult.screenshot,
      screenshotLength: scrapeResult.screenshot ? scrapeResult.screenshot.length : 0
    });

    const { data: savedAnalysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        workspace_id: workspaceId, // ✅ Add workspace context
        url,
        research_type: 'page_analysis', // Research methodology
        metrics: {}, // Empty for page analysis (no data metrics)
        context: {
          llm_provider: options.llmProvider || 'gpt',
          temp_analysis_id: analysisId, // Temporary ID for this session
          has_screenshot: !!scrapeResult.screenshot,
        },
        summary: analysisResult.data.summary || {},
        screenshots: scrapeResult.screenshot ? {
          full_page: scrapeResult.screenshot,
          captured_at: new Date().toISOString(),
        } : null,
        usage: {
          scraped_at: new Date().toISOString(),
          scrape_metadata: scrapeResult.metadata,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (saveError) {
      logger.error('Failed to save analysis', saveError);
      // Don't fail the request, just log the error
    }

    const dbAnalysisId = savedAnalysis?.id || null;
    logger.info('Analysis saved to database', { dbAnalysisId, workspaceId });

    // ✅ Save insights to database
    if (dbAnalysisId && insights.length > 0) {
      // Helper function to validate enum values
      const validateEnum = (value: any, allowedValues: string[]): string | undefined => {
        if (!value) return undefined;
        const normalized = String(value).toLowerCase().trim();
        return allowedValues.includes(normalized) ? normalized : undefined;
      };

      const insightsToSave = insights.map((insight) => {
        // Type assertion to access comprehensive metadata
        const comprehensive = (insight.metadata as any)?.comprehensive || {};

        return {
          analysis_id: dbAnalysisId,
          workspace_id: workspaceId, // ✅ Add workspace context
          insight_id: `INS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
          research_type: 'page_analysis',
          source_type: 'automated',
          source_url: url,

          // Core fields
          title: insight.title,
          statement: insight.description,
          growth_pillar: validateEnum(
            comprehensive.growth_pillar,
            ['conversion', 'aov', 'frequency', 'retention', 'acquisition']
          ) || 'conversion',
          confidence_level: validateEnum(
            comprehensive.confidence_level,
            ['high', 'medium', 'low']
          ) || (insight.confidence > 75 ? 'high' : insight.confidence > 50 ? 'medium' : 'low'),
          priority: validateEnum(
            comprehensive.priority,
            ['critical', 'high', 'medium', 'low']
          ) || (
            insight.severity === 'critical' ? 'critical' :
            insight.severity === 'high' ? 'high' :
            insight.severity === 'medium' ? 'medium' : 'low'
          ),

          // Evidence
          evidence: comprehensive.evidence || {
            qualitative: {
              quotes: insight.evidence?.map(e => e.content) || [],
              sources: [insight.location.section],
            },
          },
          sources: {
            primary: {
              type: 'analytics',
              name: 'Page Analysis',
              date: new Date().toISOString(),
            },
          },

          // Context
          customer_segment: comprehensive.customer_segment,
          journey_stage: validateEnum(
            comprehensive.journey_stage,
            ['awareness', 'consideration', 'decision', 'post_purchase']
          ),
          page_location: comprehensive.page_location || [insight.location.section],
          device_type: validateEnum(
            comprehensive.device_type,
            ['mobile', 'desktop', 'tablet', 'all']
          ),

          // Categorization
          friction_type: validateEnum(
            comprehensive.friction_type,
            ['usability', 'trust', 'value_perception', 'information_gap', 'cognitive_load']
          ),
          psychology_principle: validateEnum(
            comprehensive.psychology_principle,
            ['loss_aversion', 'social_proof', 'scarcity', 'authority', 'anchoring']
          ),
          tags: comprehensive.tags,
          affected_kpis: comprehensive.affected_kpis,
          current_performance: comprehensive.current_performance,

          // Actions
          suggested_actions: comprehensive.suggested_actions,
          validation_status: validateEnum(
            comprehensive.validation_status,
            ['untested', 'testing', 'validated', 'invalidated']
          ) || 'untested',
          status: 'draft',
        };
      });

      logger.info('Attempting to save insights', {
        count: insightsToSave.length,
        sampleInsight: insightsToSave[0],
        workspaceId,
        dbAnalysisId
      });

      const { error: insightsError, data: savedInsights } = await supabase
        .from('insights')
        .insert(insightsToSave)
        .select();

      if (insightsError) {
        logger.error(
          'Failed to save insights',
          new Error(insightsError.message),
          {
            details: insightsError.details,
            hint: insightsError.hint,
            code: insightsError.code,
          }
        );
        // Don't fail the entire request, but log detailed error
      } else {
        logger.info('Insights saved to database', {
          count: savedInsights?.length || 0,
          savedIds: savedInsights?.map(i => i.id)
        });
      }
    }

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
      dbAnalysisId, // Database ID for linking to saved analysis
      workspaceId, // ✅ Include workspace context
      url,
      screenshot: scrapeResult.screenshot, // Include screenshot in response
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
        research_type: 'page_analysis',
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
