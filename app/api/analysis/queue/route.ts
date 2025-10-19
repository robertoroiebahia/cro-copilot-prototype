import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/jobs/inngest';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ProfileRepository } from '@/lib/services';
import type { AnalysisContext, AnalysisMetrics } from '@/lib/types/database.types';

export const runtime = 'nodejs';

const DEFAULT_METRICS: AnalysisMetrics = {
  visitors: '',
  addToCarts: '',
  purchases: '',
  aov: '',
};

const DEFAULT_CONTEXT: AnalysisContext = {
  trafficSource: 'mixed',
  productType: '',
  pricePoint: '',
};

const toStringOrEmpty = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, metrics, context, llm = 'gpt' } = body ?? {};

    if (typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileRepo = new ProfileRepository(supabase);
    await profileRepo.ensureExists(user.id, user.email || '');

    const normalizedLLM: 'claude' | 'gpt' = llm === 'claude' ? 'claude' : 'gpt';

    const normalizedMetrics: AnalysisMetrics = {
      visitors: toStringOrEmpty(metrics?.visitors ?? DEFAULT_METRICS.visitors),
      addToCarts: toStringOrEmpty(metrics?.addToCarts ?? DEFAULT_METRICS.addToCarts),
      purchases: toStringOrEmpty(metrics?.purchases ?? DEFAULT_METRICS.purchases),
      aov: toStringOrEmpty(metrics?.aov ?? DEFAULT_METRICS.aov),
    };
    const normalizedContext: AnalysisContext = {
      trafficSource: toStringOrEmpty(context?.trafficSource ?? DEFAULT_CONTEXT.trafficSource),
      productType: toStringOrEmpty(context?.productType ?? DEFAULT_CONTEXT.productType),
      pricePoint: toStringOrEmpty(context?.pricePoint ?? DEFAULT_CONTEXT.pricePoint),
    };

    const admin = createAdminClient();
    const { data: inserted, error: insertError } = await admin
      .from('analyses')
      .insert({
        user_id: user.id,
        url,
        metrics: normalizedMetrics,
        context: normalizedContext,
        llm: normalizedLLM,
        summary: {
          headline: 'Analysis in progress',
          diagnosticTone: 'direct',
          confidence: 'low',
        },
        recommendations: [],
        screenshots: null,
        usage: null,
        status: 'processing',
        error_message: null,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to enqueue analysis:', insertError);
      return NextResponse.json({ error: 'Failed to enqueue analysis' }, { status: 500 });
    }

    try {
      await inngest.send({
        name: 'analysis.requested',
        data: {
          analysisId: inserted.id,
          userId: user.id,
          url,
          metrics: normalizedMetrics,
          context: normalizedContext,
          llm: normalizedLLM,
        },
      });
    } catch (error) {
      console.error('Failed to dispatch analysis job:', error);
      await admin
        .from('analyses')
        .update({
          status: 'failed',
          error_message: 'Failed to dispatch background job',
        })
        .eq('id', inserted.id);

      return NextResponse.json({ error: 'Failed to dispatch analysis job' }, { status: 500 });
    }

    return NextResponse.json(
      {
        jobId: inserted.id,
        analysisId: inserted.id,
        status: 'processing',
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('Queue analysis error:', error);
    return NextResponse.json({ error: 'Failed to queue analysis' }, { status: 500 });
  }
}
