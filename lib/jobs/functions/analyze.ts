import { inngest } from '../inngest';
import { analyzePage } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import { createAdminClient } from '@/utils/supabase/admin';
import { uploadScreenshot } from '@/lib/storage/screenshot-storage';
import { Buffer } from 'node:buffer';
import type {
  AnalysisScreenshots,
  AnalysisUsage,
  AnalysisContext,
  AnalysisMetrics,
} from '@/lib/types/database.types';

type AnalysisRequestedEvent = {
  name: 'analysis.requested';
  data: {
    analysisId: string;
    userId: string;
    url: string;
    metrics: AnalysisMetrics;
    context: AnalysisContext;
    llm: 'claude' | 'gpt';
  };
};

export const processAnalysis = inngest.createFunction(
  { id: 'analysis-process', concurrency: 2, retries: 2 },
  { event: 'analysis.requested' },
  async ({ event, step }) => {
    const { analysisId, userId, url, metrics, context, llm } =
      (event as AnalysisRequestedEvent).data;
    const admin = createAdminClient();

    try {
      const pageData = await step.run('capture-page', async () => analyzePage(url));

      const screenshotUrls = await step.run('upload-screenshots', async () => {
        const desktopAboveFoldUrl = await uploadScreenshot({
          client: admin,
          buffer: toImageBuffer(pageData.screenshots.desktop.aboveFold),
          userId,
          analysisId,
          variant: 'desktop-above-fold',
        });
        const desktopFullPageUrl = await uploadScreenshot({
          client: admin,
          buffer: toImageBuffer(pageData.screenshots.desktop.fullPage),
          userId,
          analysisId,
          variant: 'desktop-full-page',
        });
        const mobileAboveFoldUrl = await uploadScreenshot({
          client: admin,
          buffer: toImageBuffer(pageData.screenshots.mobile.aboveFold),
          userId,
          analysisId,
          variant: 'mobile-above-fold',
        });
        const mobileFullPageUrl = await uploadScreenshot({
          client: admin,
          buffer: toImageBuffer(pageData.screenshots.mobile.fullPage),
          userId,
          analysisId,
          variant: 'mobile-full-page',
        });

        return {
          desktopAboveFold: desktopAboveFoldUrl,
          desktopFullPage: desktopFullPageUrl,
          mobileAboveFold: mobileAboveFoldUrl,
          mobileFullPage: mobileFullPageUrl,
        } as Required<AnalysisScreenshots>;
      });

      const { error: screenshotUpdateError } = await admin
        .from('analyses')
        .update({
          screenshots: screenshotUrls,
          status: 'processing',
          error_message: null,
        })
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (screenshotUpdateError) {
        throw screenshotUpdateError;
}

const toImageBuffer = (source: string): Buffer => {
  const base64 = source.startsWith('data:image') ? source.split(',')[1] ?? '' : source;
  return Buffer.from(base64, 'base64');
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

      const { insights, usage } = await step.run('generate-insights', async () => {
        if (llm === 'claude') {
          return generateClaudeRecommendations(pageDataForLLM, url, context);
        }
        return generateGPTRecommendations(pageDataForLLM, url, context);
      });

      await step.run('save-results', async () => {
        const normalizedUsage: AnalysisUsage = {
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
          analysisInputTokens: usage.input_tokens ?? undefined,
          analysisOutputTokens: usage.output_tokens ?? undefined,
        };

        const { error } = await admin
          .from('analyses')
          .update({
            url,
            metrics,
            context,
            llm,
            summary: insights.summary ?? {
              headline: 'Analysis generated successfully',
              diagnosticTone: 'direct',
              confidence: 'medium',
            },
            recommendations: insights.recommendations ?? [],
            usage: normalizedUsage,
            status: 'completed',
            error_message: null,
          })
          .eq('id', analysisId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }
      });

      return { analysisId, status: 'completed' as const };
    } catch (error) {
      await step.run('mark-failed', async () => {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred during analysis';
        const { error: updateError } = await admin
          .from('analyses')
          .update({
            status: 'failed',
            error_message: message,
          })
          .eq('id', analysisId)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Failed to mark analysis as failed:', updateError);
        }
      });

      throw error;
    }
  },
);
