/**
 * Custom Insights API
 * CRUD operations for user-created and AI-edited insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CreateCustomInsightRequest, UpdateCustomInsightRequest } from '@/lib/types/collaboration';
import { rateLimit } from '@/lib/utils/rate-limit';

/**
 * GET - List custom insights
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysis_id');
    const validated = searchParams.get('validated');

    let query = supabase
      .from('custom_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (analysisId) {
      query = query.eq('analysis_id', analysisId);
    }

    if (validated === 'true') {
      query = query.eq('is_validated', true);
    } else if (validated === 'false') {
      query = query.eq('is_validated', false);
    }

    const { data: insights, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('GET custom insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create custom insight
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    const body: CreateCustomInsightRequest = await request.json();

    // Validate required fields
    if (!body.type || !body.category || !body.title || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, category, title, description' },
        { status: 400 }
      );
    }

    // Insert insight
    const { data: insight, error } = await supabase
      .from('custom_insights')
      .insert({
        user_id: user.id,
        analysis_id: body.analysis_id,
        type: body.type,
        category: body.category,
        title: body.title,
        description: body.description,
        evidence: body.evidence || [],
        severity: body.severity || 'medium',
        confidence: body.confidence || 50,
        impact_score: body.impact_score || 50,
        effort_estimate: body.effort_estimate || 'medium',
        location: body.location || {},
        tags: body.tags || [],
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create custom insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insight }, { status: 201 });
  } catch (error) {
    console.error('POST custom insight error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update custom insight
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateCustomInsightRequest = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    // Build update object (only include provided fields)
    const updates: any = {};
    if (body.type) updates.type = body.type;
    if (body.category) updates.category = body.category;
    if (body.title) updates.title = body.title;
    if (body.description) updates.description = body.description;
    if (body.evidence) updates.evidence = body.evidence;
    if (body.severity) updates.severity = body.severity;
    if (body.confidence !== undefined) updates.confidence = body.confidence;
    if (body.impact_score !== undefined) updates.impact_score = body.impact_score;
    if (body.effort_estimate) updates.effort_estimate = body.effort_estimate;
    if (body.location) updates.location = body.location;
    if (body.tags) updates.tags = body.tags;

    // Update insight
    const { data: insight, error } = await supabase
      .from('custom_insights')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id) // Ensure user owns the insight
      .select()
      .single();

    if (error) {
      console.error('Failed to update custom insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('PUT custom insight error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete custom insight
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const insightId = searchParams.get('id');

    if (!insightId) {
      return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_insights')
      .delete()
      .eq('id', insightId)
      .eq('user_id', user.id); // Ensure user owns the insight

    if (error) {
      console.error('Failed to delete custom insight:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE custom insight error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
