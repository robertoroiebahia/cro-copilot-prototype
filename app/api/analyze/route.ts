/**
 * Analysis API Route (REFACTORED)
 * Clean, thin controller that delegates to services
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzePage } from '@/lib/services';
import { AnalysisRepository, ProfileRepository } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import type { InsertAnalysis } from '@/lib/types/database.types';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request
    const { url, metrics, context, llm = 'gpt' } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // 2. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Ensure profile exists
    const profileRepo = new ProfileRepository(supabase);
    await profileRepo.ensureExists(user.id, user.email || '');

    // 4. Capture page data with screenshots from Playwright
    const pageData = await analyzePage(url);
    const screenshots = pageData.screenshots;

    // 5. Generate AI recommendations (Claude or GPT based on user selection)
    const { insights, usage } = llm === 'claude'
      ? await generateClaudeRecommendations(pageData, url, context)
      : await generateGPTRecommendations(pageData, url, context);

    // 6. Prepare analysis data for database
    const analysisData: InsertAnalysis = {
      user_id: user.id,
      url,
      metrics: metrics || { visitors: '', addToCarts: '', purchases: '', aov: '' },
      context: context || { trafficSource: 'mixed', productType: '', pricePoint: '' },
      llm, // Use selected LLM (claude or gpt)
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
      screenshots: {
        desktopAboveFold: screenshots.desktop.aboveFold,
        desktopFullPage: screenshots.desktop.fullPage,
        mobileAboveFold: screenshots.mobile.aboveFold,
        mobileFullPage: screenshots.mobile.fullPage,
      },
      usage: {
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        analysisInputTokens: usage.input_tokens,
        analysisOutputTokens: usage.output_tokens,
      },
      status: 'completed',
    };

    // 9. Save to database
    const analysisRepo = new AnalysisRepository(supabase);
    const savedAnalysis = await analysisRepo.create(analysisData);

    if (!savedAnalysis) {
      throw new Error('Failed to save analysis');
    }

    // 7. Return results
    return NextResponse.json({
      ...insights,
      id: savedAnalysis.id,
      screenshots: {
        capturedAt: pageData.scrapedAt,
        desktop: {
          aboveFold: `data:image/png;base64,${screenshots.desktop.aboveFold}`,
          fullPage: `data:image/png;base64,${screenshots.desktop.fullPage}`,
        },
        mobile: {
          aboveFold: `data:image/png;base64,${screenshots.mobile.aboveFold}`,
          fullPage: `data:image/png;base64,${screenshots.mobile.fullPage}`,
        },
      },
      usage: {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      },
    });
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
