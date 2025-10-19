import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const analysisId = req.nextUrl.searchParams.get('id');

  if (!analysisId) {
    return NextResponse.json({ error: 'Missing analysis id' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('analyses')
    .select(
      `
        id,
        status,
        error_message,
        summary,
        recommendations,
        screenshots,
        usage,
        llm,
        url,
        metrics,
        context,
        created_at,
        updated_at,
        progress,
        progress_stage,
        progress_message
      `,
    )
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch analysis status:', error);
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Return different response based on status
  if (data.status === 'completed') {
    return NextResponse.json({
      status: 'completed',
      progress: 100,
      message: 'Analysis complete!',
      analysis: data,
    });
  }

  if (data.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      progress: data.progress || 0,
      message: data.error_message || 'Analysis failed',
      error: data.error_message,
    });
  }

  // Processing status - return real-time progress
  return NextResponse.json({
    status: 'processing',
    progress: data.progress || 0,
    stage: data.progress_stage || 'initializing',
    message: data.progress_message || 'Processing...',
  });
}
