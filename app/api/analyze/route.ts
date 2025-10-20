/**
 * Analysis API Route (REFACTORED)
 * Clean, thin controller that delegates to services
 * Now with real-time progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { analyzePage } from '@/lib/services';
import { AnalysisRepository, ProfileRepository } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import type { InsertAnalysis } from '@/lib/types/database.types';
import { startTimer } from '@/lib/utils/timing';
import { ProgressTracker } from '@/lib/utils/progress-tracker';
import { rateLimit } from '@/lib/utils/rate-limit';

// Force Node.js runtime for Firecrawl compatibility
export const runtime = 'nodejs';
export const maxDuration = 120; // Increased for AI analysis time

export async function POST(req: NextRequest) {
  const analysisId = randomUUID();
  const overallTimerStop = startTimer('analysis.sync.total');

  try {
    const { url, metrics, context, llm = 'gpt' } = await req.json();

    if (!url || !url.startsWith('http')) {
      overallTimerStop({ analysisId, status: 'invalid-url', url });
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      overallTimerStop({ analysisId, status: 'unauthorized' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Rate limit check
    const rateLimitResult = await rateLimit(user.id);
    if (!rateLimitResult.success) {
      overallTimerStop({ analysisId, status: 'rate-limited', userId: user.id });
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

    const profileRepo = new ProfileRepository(supabase);
    await profileRepo.ensureExists(user.id, user.email || '');

    // Initialize progress tracker and create initial DB record
    const progress = new ProgressTracker(analysisId, supabase);

    // Create initial analysis record with progress tracking (gracefully handle if columns don't exist)
    try {
      const { error: initError } = await supabase
        .from('analyses')
        .insert({
          id: analysisId,
          user_id: user.id,
          url,
          status: 'processing',
          progress: 0,
          progress_stage: 'initializing',
          progress_message: 'Starting analysis...',
        });

      if (initError) {
        console.error('Failed to initialize analysis with progress:', initError);
        // Try without progress columns (backward compatibility)
        await supabase
          .from('analyses')
          .insert({
            id: analysisId,
            user_id: user.id,
            url,
            status: 'processing',
          });
      }
    } catch (error) {
      console.error('Failed to initialize analysis:', error);
      // Continue anyway, progress tracking is not critical
    }

    // Stage 1: Scraping (0-35%)
    await progress.startStage('scraping', 'Fetching page content with Firecrawl...');

    const captureTimerStop = startTimer('analysis.sync.capture');
    const pageData = await analyzePage(url);
    captureTimerStop({ analysisId, url });

    await progress.completeStage('scraping', 'Page content fetched successfully');

    // Stage 2: AI Analysis (50-90%)
    await progress.startStage('running-ai-analysis', `Running ${llm.toUpperCase()} analysis...`);

    const llmTimerStop = startTimer(`analysis.sync.llm.${llm}`);
    let recommendationResult:
      | Awaited<ReturnType<typeof generateClaudeRecommendations>>
      | Awaited<ReturnType<typeof generateGPTRecommendations>>;

    try {
      // Update progress during AI analysis
      await progress.updateAIProgress(10, 'Analyzing page structure...');

      recommendationResult =
        llm === 'claude'
          ? await generateClaudeRecommendations(pageData, url, context)
          : await generateGPTRecommendations(pageData, url, context);

      await progress.updateAIProgress(100, 'AI analysis complete');
    } catch (error) {
      llmTimerStop({
        analysisId,
        llm,
        error: error instanceof Error ? error.message : String(error),
      });
      await progress.markFailed(error instanceof Error ? error.message : 'AI analysis failed');
      throw error;
    }

    const { insights, usage } = recommendationResult;
    llmTimerStop({
      analysisId,
      llm,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
    });

    const normalizedMetrics =
      metrics || { visitors: '', addToCarts: '', purchases: '', aov: '' };
    const normalizedContext =
      context || { trafficSource: 'mixed', productType: '', pricePoint: '' };

    // Stage 3: Saving results (90-100%)
    await progress.startStage('saving-results', 'Saving recommendations...');

    const analysisData: InsertAnalysis = {
      id: analysisId,
      user_id: user.id,
      url,
      metrics: normalizedMetrics,
      context: normalizedContext,
      llm,
      summary: {
        ...(insights.summary || {}),
      },
      recommendations: insights.recommendations || [],
      above_the_fold: null,
      below_the_fold: null,
      full_page: null,
      strategic_extensions: null,
      roadmap: null,
      vision_analysis: null,
      screenshots: null,
      usage: {
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
        analysisInputTokens: usage?.input_tokens,
        analysisOutputTokens: usage?.output_tokens,
      },
      status: 'completed',
      progress: 100,
      progress_stage: 'completed',
      progress_message: 'Analysis complete!',
    };

    const analysisRepo = new AnalysisRepository(supabase);
    const dbTimerStop = startTimer('analysis.sync.db.create');
    const savedAnalysis = await analysisRepo.create(analysisData);
    dbTimerStop({ analysisId: savedAnalysis?.id ?? analysisId });

    if (!savedAnalysis) {
      throw new Error('Failed to save analysis');
    }

    await progress.markCompleted();
    overallTimerStop({ analysisId: savedAnalysis.id, status: 'completed', llm });

    return NextResponse.json({
      ...insights,
      id: savedAnalysis.id,
      screenshots: null,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      },
    });
  } catch (err: any) {
    overallTimerStop({
      analysisId,
      status: 'failed',
      error: err?.message ?? String(err),
    });
    console.error('Analysis error:', err);

    // Update progress to failed state
    try {
      const supabase = createClient();
      const progress = new ProgressTracker(analysisId, supabase);
      await progress.markFailed(err?.message || 'Analysis failed');
    } catch (progressErr) {
      console.error('Failed to update progress:', progressErr);
    }

    return NextResponse.json(
      { error: err?.message || 'Analysis failed' },
      { status: 500 },
    );
  }
}
