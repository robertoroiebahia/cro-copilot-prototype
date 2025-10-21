import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 *
 * Get all workspaces for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      workspaces: data || [],
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 *
 * Create a new workspace
 *
 * Body:
 * {
 *   name: string (required),
 *   description?: string,
 *   websiteUrl?: string,
 *   timezone?: string,
 *   currency?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      name,
      description,
      websiteUrl,
      timezone = 'UTC',
      currency = 'USD'
    } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        website_url: websiteUrl || null,
        timezone,
        currency,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      workspace: data,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
