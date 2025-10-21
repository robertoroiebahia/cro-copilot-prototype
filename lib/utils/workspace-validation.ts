/**
 * Workspace Validation Utilities
 *
 * Provides helper functions to validate workspace access in API routes.
 * Use this in every API route that accepts workspaceId to ensure security.
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface WorkspaceValidationResult {
  valid: boolean;
  workspace?: {
    id: string;
    user_id: string;
    name: string;
  };
  error?: NextResponse;
}

/**
 * Validates that a workspace exists and belongs to the specified user
 *
 * @param workspaceId - The workspace UUID to validate
 * @param userId - The user UUID who should own the workspace
 * @returns Validation result with workspace data or error response
 *
 * @example
 * ```typescript
 * const validation = await validateWorkspaceAccess(workspaceId, user.id);
 * if (!validation.valid) {
 *   return validation.error!;
 * }
 * // Proceed with workspace operation
 * ```
 */
export async function validateWorkspaceAccess(
  workspaceId: string | null | undefined,
  userId: string
): Promise<WorkspaceValidationResult> {
  // Check if workspaceId is provided
  if (!workspaceId) {
    logger.warn('Workspace validation failed: No workspace ID provided', { userId });
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Workspace ID is required',
          code: 'WORKSPACE_ID_REQUIRED',
          message: 'Please select a workspace to continue',
        },
        { status: 400 }
      ),
    };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    logger.warn('Workspace validation failed: Invalid UUID format', { workspaceId, userId });
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Invalid workspace ID format',
          code: 'INVALID_WORKSPACE_ID',
        },
        { status: 400 }
      ),
    };
  }

  const supabase = createClient();

  // Check if workspace exists and belongs to user
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, user_id, name, is_active')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error || !workspace) {
    logger.warn('Workspace validation failed: Access denied', {
      workspaceId,
      userId,
      error: error?.message,
    });
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Invalid workspace or access denied',
          code: 'WORKSPACE_ACCESS_DENIED',
          message: 'You do not have access to this workspace',
        },
        { status: 403 }
      ),
    };
  }

  // Check if workspace is active
  if (!workspace.is_active) {
    logger.warn('Workspace validation failed: Workspace is inactive', {
      workspaceId,
      userId,
    });
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Workspace is inactive',
          code: 'WORKSPACE_INACTIVE',
          message: 'This workspace has been deactivated',
        },
        { status: 403 }
      ),
    };
  }

  logger.info('Workspace validation successful', {
    workspaceId,
    userId,
    workspaceName: workspace.name,
  });

  return {
    valid: true,
    workspace: {
      id: workspace.id,
      user_id: workspace.user_id,
      name: workspace.name,
    },
  };
}

/**
 * Validates workspace access for bulk operations
 * Useful when you need to verify access to multiple workspaces at once
 *
 * @param workspaceIds - Array of workspace UUIDs to validate
 * @param userId - The user UUID who should own all workspaces
 * @returns Object with valid workspace IDs and invalid ones
 */
export async function validateMultipleWorkspaces(
  workspaceIds: string[],
  userId: string
): Promise<{
  valid: string[];
  invalid: string[];
  error?: NextResponse;
}> {
  if (!workspaceIds || workspaceIds.length === 0) {
    return {
      valid: [],
      invalid: [],
      error: NextResponse.json(
        { error: 'No workspace IDs provided', code: 'NO_WORKSPACES' },
        { status: 400 }
      ),
    };
  }

  const supabase = createClient();

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('id', workspaceIds);

  if (error) {
    logger.error('Multiple workspace validation failed', { error, userId });
    return {
      valid: [],
      invalid: workspaceIds,
      error: NextResponse.json(
        { error: 'Workspace validation failed', code: 'VALIDATION_ERROR' },
        { status: 500 }
      ),
    };
  }

  const validIds = (workspaces || []).map((w) => w.id);
  const invalidIds = workspaceIds.filter((id) => !validIds.includes(id));

  return {
    valid: validIds,
    invalid: invalidIds,
  };
}

/**
 * Middleware-like wrapper for API routes that require workspace access
 * Automatically validates workspace before executing handler
 *
 * @example
 * ```typescript
 * export const POST = withWorkspaceAccess(async (request, { workspace, user }) => {
 *   // workspace and user are guaranteed to be valid here
 *   const { url } = await request.json();
 *
 *   await supabase.from('analyses').insert({
 *     workspace_id: workspace.id,
 *     user_id: user.id,
 *     url,
 *   });
 * });
 * ```
 */
export function withWorkspaceAccess<T = any>(
  handler: (
    request: Request,
    context: {
      workspace: { id: string; user_id: string; name: string };
      user: { id: string; email?: string };
      params?: T;
    }
  ) => Promise<NextResponse>
) {
  return async (request: Request, routeContext?: { params: T }) => {
    try {
      // Authenticate user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get workspace ID from request
      let workspaceId: string | null = null;

      if (request.method === 'GET' || request.method === 'DELETE') {
        // Get from URL params
        const url = new URL(request.url);
        workspaceId = url.searchParams.get('workspaceId');
      } else {
        // Get from body
        const body = await request.json();
        workspaceId = body.workspaceId;
      }

      // Validate workspace access
      const validation = await validateWorkspaceAccess(workspaceId, user.id);
      if (!validation.valid) {
        return validation.error!;
      }

      // Call handler with validated context
      return await handler(request, {
        workspace: validation.workspace!,
        user: {
          id: user.id,
          email: user.email,
        },
        params: routeContext?.params,
      });
    } catch (error) {
      logger.error('Workspace access wrapper error', { error });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
