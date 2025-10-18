/**
 * Analysis API Route (REFACTORED)
 * Clean, thin controller that delegates to services
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScreenshotService } from '@/lib/screenshot-service';
import { analyzeAboveFold, VisionAnalysisError } from '@/lib/vision-analysis';
import { analyzeSection } from '@/lib/claude-vision';
import { createClient } from '@/utils/supabase/server';
import { analyzePage, calculateHeuristicScore } from '@/lib/services';
import { AnalysisRepository, ProfileRepository } from '@/lib/services';
import { generateRecommendations } from '@/lib/services/ai/recommendation-generator';
import type { InsertAnalysis } from '@/lib/types/database.types';

const screenshotService = new ScreenshotService();

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

    // 4. Capture page data and screenshots in parallel
    const [pageData, screenshots] = await Promise.all([
      analyzePage(url),
      screenshotService.capturePageScreenshots(url).catch(() => null),
    ]);

    // 5. Run vision analysis if screenshots available
    let visionAnalysis: any = null;
    let visionError: string | null = null;

    if (screenshots) {
      try {
        visionAnalysis = await analyzeAboveFold({
          desktopImageBase64: screenshots.desktop.aboveFold,
          mobileImageBase64: screenshots.mobile.aboveFold,
        });
      } catch (error) {
        visionError = error instanceof VisionAnalysisError
          ? error.message
          : 'Vision analysis failed';
        console.error('Vision analysis error:', error);
      }
    }

    // 6. Analyze specific page sections (if screenshots available)
    const visualAnalysis: Record<string, any> = {};

    if (screenshots) {
      const pageContext = {
        url,
        metrics,
        context,
      };

      const sections = [
        { type: 'hero' as const, image: screenshots.desktop.aboveFold },
        { type: 'social-proof' as const, image: screenshots.desktop.aboveFold },
        { type: 'cta' as const, image: screenshots.desktop.aboveFold },
      ];

      await Promise.all(
        sections.map(async ({ type, image }) => {
          try {
            const analysis = await analyzeSection(image, type, pageContext);
            visualAnalysis[type] = analysis;
          } catch (error) {
            console.error(`${type} analysis failed:`, error);
          }
        })
      );
    }

    // 7. Calculate heuristic score
    const heuristicScore = calculateHeuristicScore(pageData);

    // 8. Generate AI recommendations
    const { insights, usage } = await generateRecommendations({
      pageData,
      visionAnalysis,
      visualAnalysis,
      url,
      llm,
    });

    // 9. Prepare analysis data for database
    const analysisData: InsertAnalysis = {
      user_id: user.id,
      url,
      metrics: metrics || { visitors: '', addToCarts: '', purchases: '', aov: '' },
      context: context || { trafficSource: 'mixed', productType: '', pricePoint: '' },
      llm,
      summary: {
        ...(insights.summary || {}),
        heuristics: heuristicScore,
      },
      recommendations: insights.recommendations || [],
      above_the_fold: visionAnalysis?.desktop,
      below_the_fold: null,
      full_page: null,
      strategic_extensions: null,
      roadmap: null,
      vision_analysis: visionAnalysis,
      screenshots: screenshots
        ? {
            desktopAboveFold: screenshots.desktop.aboveFold,
            desktopFullPage: screenshots.desktop.fullPage,
            mobileAboveFold: screenshots.mobile.aboveFold,
            mobileFullPage: screenshots.mobile.fullPage,
          }
        : null,
      usage: {
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        analysisInputTokens: usage.input_tokens,
        analysisOutputTokens: usage.output_tokens,
      },
      status: 'completed',
    };

    // 10. Save to database
    const analysisRepo = new AnalysisRepository(supabase);
    const savedAnalysis = await analysisRepo.create(analysisData);

    if (!savedAnalysis) {
      throw new Error('Failed to save analysis');
    }

    // 11. Return results
    return NextResponse.json({
      ...insights,
      id: savedAnalysis.id,
      screenshots: screenshots
        ? {
            capturedAt: screenshots.capturedAt,
            desktop: {
              aboveFold: `data:image/png;base64,${screenshots.desktop.aboveFold}`,
              fullPage: `data:image/png;base64,${screenshots.desktop.fullPage}`,
            },
            mobile: {
              aboveFold: `data:image/png;base64,${screenshots.mobile.aboveFold}`,
              fullPage: `data:image/png;base64,${screenshots.mobile.fullPage}`,
            },
          }
        : null,
      visionAnalysis,
      visionAnalysisError: visionError,
      visualAnalysis: Object.keys(visualAnalysis).length > 0 ? visualAnalysis : undefined,
      raw: { pageData },
      usage: {
        vision: visionAnalysis?.cost || null,
        analysis: {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          totalTokens:
            (visionAnalysis?.cost?.inputTokens || 0) +
            (visionAnalysis?.cost?.outputTokens || 0) +
            (usage.input_tokens || 0) +
            (usage.output_tokens || 0),
        },
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
