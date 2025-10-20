/**
 * Experiment Variations API
 * Manage A/B test variations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CreateVariationRequest } from '@/lib/types/collaboration';
import { rateLimit } from '@/lib/utils/rate-limit';

/**
 * POST - Create variation
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

    const body: CreateVariationRequest = await request.json();

    // Validate required fields
    if (!body.experiment_id || !body.name || !body.changes) {
      return NextResponse.json(
        { error: 'Missing required fields: experiment_id, name, changes' },
        { status: 400 }
      );
    }

    // Verify user owns the experiment
    const { data: experiment, error: expError } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', body.experiment_id)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Insert variation
    const { data: variation, error } = await supabase
      .from('experiment_variations')
      .insert({
        experiment_id: body.experiment_id,
        name: body.name,
        description: body.description,
        is_control: body.is_control || false,
        changes: body.changes,
        implementation_code: body.implementation_code,
        screenshots: [],
        traffic_percentage: body.traffic_percentage || 50,
        conversions: 0,
        visitors: 0,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create variation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ variation }, { status: 201 });
  } catch (error) {
    console.error('POST variation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update variation results
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
      return NextResponse.json({ error: 'Variation ID is required' }, { status: 400 });
    }

    // Verify user owns the experiment
    const { data: variation, error: varError } = await supabase
      .from('experiment_variations')
      .select('experiment_id')
      .eq('id', body.id)
      .single();

    if (varError || !variation) {
      return NextResponse.json({ error: 'Variation not found' }, { status: 404 });
    }

    const { data: experiment, error: expError } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', variation.experiment_id)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update object
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.changes) updates.changes = body.changes;
    if (body.implementation_code !== undefined) updates.implementation_code = body.implementation_code;
    if (body.screenshots) updates.screenshots = body.screenshots;
    if (body.traffic_percentage !== undefined) updates.traffic_percentage = body.traffic_percentage;
    if (body.conversions !== undefined) {
      updates.conversions = body.conversions;
      updates.visitors = body.visitors || 0;
      // Calculate conversion rate
      if (body.visitors > 0) {
        updates.conversion_rate = (body.conversions / body.visitors) * 100;
      }
    }

    const { data: updatedVariation, error } = await supabase
      .from('experiment_variations')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update variation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ variation: updatedVariation });
  } catch (error) {
    console.error('PUT variation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete variation
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
    const variationId = searchParams.get('id');

    if (!variationId) {
      return NextResponse.json({ error: 'Variation ID is required' }, { status: 400 });
    }

    // Verify user owns the experiment
    const { data: variation, error: varError } = await supabase
      .from('experiment_variations')
      .select('experiment_id')
      .eq('id', variationId)
      .single();

    if (varError || !variation) {
      return NextResponse.json({ error: 'Variation not found' }, { status: 404 });
    }

    const { data: experiment, error: expError } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', variation.experiment_id)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('experiment_variations')
      .delete()
      .eq('id', variationId);

    if (error) {
      console.error('Failed to delete variation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE variation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
