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
        updated_at
      `,
    )
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch analysis status:', error);
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const response =
    data.status === 'completed'
      ? { status: data.status, analysis: data }
      : { status: data.status, error: data.error_message };

  return NextResponse.json(response);
}
