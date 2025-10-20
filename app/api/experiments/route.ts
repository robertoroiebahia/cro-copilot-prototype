/**
 * Experiments API
 * CRUD operations for A/B tests and hypothesis tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CreateExperimentRequest, CreateVariationRequest, UpdateExperimentResultsRequest } from '@/lib/types/collaboration';
import { rateLimit } from '@/lib/utils/rate-limit';

/**
 * GET - List experiments
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
    const status = searchParams.get('status');
    const experimentId = searchParams.get('id');

    // Get single experiment with variations
    if (experimentId) {
      const { data: experiment, error: expError } = await supabase
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .eq('user_id', user.id)
        .single();

      if (expError || !experiment) {
        return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
      }

      const { data: variations, error: varError } = await supabase
        .from('experiment_variations')
        .select('*')
        .eq('experiment_id', experimentId)
        .order('created_at', { ascending: true });

      if (varError) {
        console.error('Failed to fetch variations:', varError);
      }

      return NextResponse.json({ experiment, variations: variations || [] });
    }

    // List experiments
    let query = supabase
      .from('experiments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (analysisId) {
      query = query.eq('analysis_id', analysisId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: experiments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error('GET experiments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create experiment
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

    const body: CreateExperimentRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.hypothesis_statement || !body.primary_metric) {
      return NextResponse.json(
        { error: 'Missing required fields: name, hypothesis_statement, primary_metric' },
        { status: 400 }
      );
    }

    // Insert experiment
    const { data: experiment, error } = await supabase
      .from('experiments')
      .insert({
        user_id: user.id,
        analysis_id: body.analysis_id,
        hypothesis_id: body.hypothesis_id,
        name: body.name,
        description: body.description,
        hypothesis_statement: body.hypothesis_statement,
        status: 'draft',
        priority: body.priority || 'medium',
        primary_metric: body.primary_metric,
        secondary_metrics: body.secondary_metrics || [],
        expected_lift_min: body.expected_lift_min,
        expected_lift_max: body.expected_lift_max,
        results: {},
        tags: [],
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    console.error('POST experiment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update experiment
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

    const body: any = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 });
    }

    // Build update object
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.hypothesis_statement) updates.hypothesis_statement = body.hypothesis_statement;
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.primary_metric) updates.primary_metric = body.primary_metric;
    if (body.secondary_metrics) updates.secondary_metrics = body.secondary_metrics;
    if (body.expected_lift_min !== undefined) updates.expected_lift_min = body.expected_lift_min;
    if (body.expected_lift_max !== undefined) updates.expected_lift_max = body.expected_lift_max;
    if (body.start_date) updates.start_date = body.start_date;
    if (body.end_date) updates.end_date = body.end_date;
    if (body.duration_days !== undefined) updates.duration_days = body.duration_days;
    if (body.actual_lift !== undefined) updates.actual_lift = body.actual_lift;
    if (body.statistical_significance !== undefined) updates.statistical_significance = body.statistical_significance;
    if (body.winner) updates.winner = body.winner;
    if (body.results) updates.results = body.results;
    if (body.tags) updates.tags = body.tags;

    const { data: experiment, error } = await supabase
      .from('experiments')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error('PUT experiment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete experiment
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
    const experimentId = searchParams.get('id');

    if (!experimentId) {
      return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('experiments')
      .delete()
      .eq('id', experimentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete experiment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE experiment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
