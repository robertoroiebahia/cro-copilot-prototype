import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Verify user owns workspace
 */
async function verifyWorkspaceOwnership(workspaceId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

/**
 * GET /api/workspaces/[id]
 *
 * Get a single workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const workspaceId = params.id;

    // Verify ownership
    const ownsWorkspace = await verifyWorkspaceOwnership(workspaceId, user.id);
    if (!ownsWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      workspace: data,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[id]
 *
 * Update a workspace
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   websiteUrl?: string,
 *   timezone?: string,
 *   currency?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const workspaceId = params.id;
    const body = await request.json();

    // Verify ownership
    const ownsWorkspace = await verifyWorkspaceOwnership(workspaceId, user.id);
    if (!ownsWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      websiteUrl,
      timezone,
      currency
    } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json(
          { error: 'Workspace name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description || null;
    if (websiteUrl !== undefined) updateData.website_url = websiteUrl || null;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;

    const supabase = createClient();

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
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
    console.error('Update workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 *
 * Delete a workspace (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const workspaceId = params.id;

    // Verify ownership
    const ownsWorkspace = await verifyWorkspaceOwnership(workspaceId, user.id);
    if (!ownsWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    const supabase = createClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('workspaces')
      .update({ is_active: false })
      .eq('id', workspaceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
