import { inngest } from '../inngest';
import { analyzePage } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import { createAdminClient } from '@/utils/supabase/admin';
import { uploadScreenshot, type UploadScreenshotParams } from '@/lib/storage/screenshot-storage';
import { Buffer } from 'node:buffer';
import type {
  AnalysisScreenshots,
  AnalysisUsage,
  AnalysisContext,
  AnalysisMetrics,
} from '@/lib/types/database.types';
import { startTimer } from '@/lib/utils/timing';

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
    const overallTimerStop = startTimer('analysis.job.total');

    try {
      const pageData = await step.run('capture-page', async () => {
        const stop = startTimer('analysis.job.capture');
        try {
          const result = await analyzePage(url);
          stop({ analysisId, url });
          return result;
        } catch (error) {
          stop({
            analysisId,
            url,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      });

      const screenshotUrls = await step.run('upload-screenshots', async () => {
        const stop = startTimer('analysis.job.uploadScreenshots');
        try {
          const uploadVariant = async (
            variant: UploadScreenshotParams['variant'],
            source: string,
          ) => {
            const variantStop = startTimer(`analysis.job.upload.${variant}`);
            try {
              const result = await uploadScreenshot({
                client: admin,
                buffer: toImageBuffer(source),
                userId,
                analysisId,
                variant,
              });
              variantStop({ analysisId, variant });
              return result;
            } catch (error) {
              variantStop({
                analysisId,
                variant,
                error: error instanceof Error ? error.message : String(error),
              });
              throw error;
            }
          };

          const urls: Required<AnalysisScreenshots> = {
            desktopAboveFold: await uploadVariant(
              'desktop-above-fold',
              pageData.screenshots.desktop.aboveFold,
            ),
            desktopFullPage: await uploadVariant(
              'desktop-full-page',
              pageData.screenshots.desktop.fullPage,
            ),
            mobileAboveFold: await uploadVariant(
              'mobile-above-fold',
              pageData.screenshots.mobile.aboveFold,
            ),
            mobileFullPage: await uploadVariant(
              'mobile-full-page',
              pageData.screenshots.mobile.fullPage,
            ),
          };

          const { error } = await admin
            .from('analyses')
            .update({
              screenshots: urls,
              status: 'processing',
              error_message: null,
            })
            .eq('id', analysisId)
            .eq('user_id', userId);

          if (error) {
            throw error;
          }

          stop({ analysisId });
          return urls;
        } catch (error) {
          stop({
            analysisId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      });

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
        const stop = startTimer(`analysis.job.llm.${llm}`);
        try {
          const result =
            llm === 'claude'
              ? await generateClaudeRecommendations(pageDataForLLM, url, context)
              : await generateGPTRecommendations(pageDataForLLM, url, context);

          stop({
            analysisId,
            llm,
            inputTokens: result.usage?.input_tokens ?? 0,
            outputTokens: result.usage?.output_tokens ?? 0,
          });

          return result;
        } catch (error) {
          stop({
            analysisId,
            llm,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      });

      await step.run('save-results', async () => {
        const stop = startTimer('analysis.job.db.update');
        try {
          const normalizedUsage: AnalysisUsage = {
            totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
            analysisInputTokens: usage?.input_tokens ?? undefined,
            analysisOutputTokens: usage?.output_tokens ?? undefined,
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
              screenshots: screenshotUrls,
              usage: normalizedUsage,
              status: 'completed',
              error_message: null,
            })
            .eq('id', analysisId)
            .eq('user_id', userId);

          if (error) {
            throw error;
          }

          stop({ analysisId, status: 'completed' });
        } catch (error) {
          stop({
            analysisId,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      });

      overallTimerStop({ analysisId, status: 'completed' });
      return { analysisId, status: 'completed' as const };
    } catch (error) {
      overallTimerStop({
        analysisId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

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

const toImageBuffer = (source: string): Buffer => {
  const base64 = source.startsWith('data:image') ? source.split(',')[1] ?? '' : source;
  return Buffer.from(base64, 'base64');
};
