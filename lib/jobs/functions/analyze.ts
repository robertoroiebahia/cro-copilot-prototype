import { inngest } from '../inngest';
import { analyzePage } from '@/lib/services';
import { generateClaudeRecommendations } from '@/lib/services/ai/claude-recommendations';
import { generateGPTRecommendations } from '@/lib/services/ai/gpt-recommendations';
import { createAdminClient } from '@/utils/supabase/admin';
import type {
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

      const { insights, usage } = await step.run('generate-insights', async () => {
        const stop = startTimer(`analysis.job.llm.${llm}`);
        try {
          const result =
            llm === 'claude'
              ? await generateClaudeRecommendations(pageData, url, context)
              : await generateGPTRecommendations(pageData, url, context);

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
              screenshots: null,
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
