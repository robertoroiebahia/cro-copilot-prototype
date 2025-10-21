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
 * GET /api/ga4/settings?workspaceId=xxx
 *
 * Get GA4 settings for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify user owns this workspace
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
      .select('name, description, website_url, ga4_property_id, ga4_sync_enabled, ga4_last_sync_at, timezone, currency')
      .eq('id', workspaceId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      settings: {
        name: data?.name,
        description: data?.description,
        websiteUrl: data?.website_url,
        propertyId: data?.ga4_property_id,
        syncEnabled: data?.ga4_sync_enabled || false,
        lastSyncAt: data?.ga4_last_sync_at,
        timezone: data?.timezone,
        currency: data?.currency,
        isConfigured: !!(data?.ga4_property_id),
      },
    });
  } catch (error) {
    console.error('Get GA4 settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ga4/settings
 *
 * Update workspace GA4 settings
 *
 * Body:
 * {
 *   workspaceId: string (required),
 *   name?: string,
 *   description?: string,
 *   websiteUrl?: string,
 *   propertyId?: string,
 *   refreshToken?: string,
 *   syncEnabled?: boolean,
 *   timezone?: string,
 *   currency?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      workspaceId,
      name,
      description,
      websiteUrl,
      propertyId,
      refreshToken,
      syncEnabled,
      timezone,
      currency
    } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify user owns this workspace
    const ownsWorkspace = await verifyWorkspaceOwnership(workspaceId, user.id);
    if (!ownsWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    const supabase = createClient();

    const updateData: any = {};

    // Update workspace basic info
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (websiteUrl !== undefined) updateData.website_url = websiteUrl;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;

    // Update GA4 settings
    if (propertyId !== undefined) updateData.ga4_property_id = propertyId;
    if (syncEnabled !== undefined) updateData.ga4_sync_enabled = syncEnabled;

    // Only update refresh token if provided
    if (refreshToken) {
      // TODO: Encrypt the refresh token before storing
      updateData.ga4_refresh_token = refreshToken;
    }

    const { error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace settings updated successfully',
    });
  } catch (error) {
    console.error('Update workspace settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
