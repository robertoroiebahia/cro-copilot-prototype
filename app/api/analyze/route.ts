/**
 * Analysis API Route (REFACTORED)
 * Clean, thin controller that delegates to services
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

// Force Node.js runtime for Playwright compatibility
export const runtime = 'nodejs';
export const maxDuration = 60;

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

    const profileRepo = new ProfileRepository(supabase);
    await profileRepo.ensureExists(user.id, user.email || '');

    const captureTimerStop = startTimer('analysis.sync.capture');
    const pageData = await analyzePage(url);
    captureTimerStop({ analysisId, url });

    const llmTimerStop = startTimer(`analysis.sync.llm.${llm}`);
    let recommendationResult:
      | Awaited<ReturnType<typeof generateClaudeRecommendations>>
      | Awaited<ReturnType<typeof generateGPTRecommendations>>;

    try {
      recommendationResult =
        llm === 'claude'
          ? await generateClaudeRecommendations(pageData, url, context)
          : await generateGPTRecommendations(pageData, url, context);
    } catch (error) {
      llmTimerStop({
        analysisId,
        llm,
        error: error instanceof Error ? error.message : String(error),
      });
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
    };

    const analysisRepo = new AnalysisRepository(supabase);
    const dbTimerStop = startTimer('analysis.sync.db.create');
    const savedAnalysis = await analysisRepo.create(analysisData);
    dbTimerStop({ analysisId: savedAnalysis?.id ?? analysisId });

    if (!savedAnalysis) {
      throw new Error('Failed to save analysis');
    }

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
    return NextResponse.json(
      { error: err?.message || 'Analysis failed' },
      { status: 500 },
    );
  }
}
