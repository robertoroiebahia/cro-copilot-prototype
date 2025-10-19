/**
 * Analysis API Route (REFACTORED)
 * Clean, thin controller that delegates to services
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { uploadScreenshot } from '@/lib/storage/screenshot-storage';
import { analyzePage } from '@/lib/services';
import { AnalysisRepository, ProfileRepository } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import type { InsertAnalysis, AnalysisScreenshots } from '@/lib/types/database.types';

// Force Node.js runtime for Playwright compatibility
export const runtime = 'nodejs';
export const maxDuration = 60;

const toImageBuffer = (source: string): Buffer => {
  const base64 = source.startsWith('data:image') ? source.split(',')[1] ?? '' : source;
  return Buffer.from(base64, 'base64');
};

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

    const analysisId = randomUUID();
    const admin = createAdminClient();

    const screenshotUrls: Required<AnalysisScreenshots> = {
      desktopAboveFold: await uploadScreenshot({
        client: admin,
        buffer: toImageBuffer(pageData.screenshots.desktop.aboveFold),
        userId: user.id,
        analysisId,
        variant: 'desktop-above-fold',
      }),
      desktopFullPage: await uploadScreenshot({
        client: admin,
        buffer: toImageBuffer(pageData.screenshots.desktop.fullPage),
        userId: user.id,
        analysisId,
        variant: 'desktop-full-page',
      }),
      mobileAboveFold: await uploadScreenshot({
        client: admin,
        buffer: toImageBuffer(pageData.screenshots.mobile.aboveFold),
        userId: user.id,
        analysisId,
        variant: 'mobile-above-fold',
      }),
      mobileFullPage: await uploadScreenshot({
        client: admin,
        buffer: toImageBuffer(pageData.screenshots.mobile.fullPage),
        userId: user.id,
        analysisId,
        variant: 'mobile-full-page',
      }),
    };

    const pageDataForLLM = {
      ...pageData,
      screenshots: {
        desktop: {
          aboveFold: screenshotUrls.desktopAboveFold,
          fullPage: screenshotUrls.desktopFullPage,
        },
        mobile: {
          aboveFold: screenshotUrls.mobileAboveFold,
          fullPage: screenshotUrls.mobileFullPage,
        },
      },
    };

    // 5. Generate AI recommendations (Claude or GPT based on user selection)
    const { insights, usage } = llm === 'claude'
      ? await generateClaudeRecommendations(pageDataForLLM, url, context)
      : await generateGPTRecommendations(pageDataForLLM, url, context);

    // 6. Prepare analysis data for database
    const analysisData: InsertAnalysis = {
      id: analysisId,
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
      screenshots: screenshotUrls,
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
          aboveFold: screenshotUrls.desktopAboveFold,
          fullPage: screenshotUrls.desktopFullPage,
        },
        mobile: {
          aboveFold: screenshotUrls.mobileAboveFold,
          fullPage: screenshotUrls.mobileFullPage,
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
