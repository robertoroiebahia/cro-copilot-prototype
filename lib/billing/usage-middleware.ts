/**
 * Usage Tracking Middleware
 * Centralized utility for tracking and enforcing usage limits
 * This is called BEFORE creating resources to check limits and AFTER to increment usage
 */

import { incrementUsage, checkUsageLimit, canPerformAction } from './usage-tracking-server';
import { NextResponse } from 'next/server';

export type ResourceType = 'analyses' | 'insights' | 'themes' | 'hypotheses' | 'experiments';

export interface UsageCheckResult {
  allowed: boolean;
  error?: NextResponse;
  limitInfo?: {
    limit: number;
    current: number;
    remaining: number;
  };
}

/**
 * Check if user can create a resource (BEFORE creation)
 * Returns { allowed: true } or { allowed: false, error: NextResponse }
 */
export async function checkCanCreate(
  userId: string,
  workspaceId: string,
  resourceType: ResourceType
): Promise<UsageCheckResult> {
  const result = await canPerformAction(userId, workspaceId, resourceType);

  if (!result.allowed) {
    const isPro = false; // We can enhance this later if needed

    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'Usage limit reached',
          code: 'USAGE_LIMIT_EXCEEDED',
          message: result.reason || `You've reached your limit for ${resourceType}`,
          limit: result.limitInfo?.limit,
          current: result.limitInfo?.current,
          upgradeUrl: '/settings/billing',
          action: 'upgrade',
        },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    limitInfo: result.limitInfo ? {
      limit: result.limitInfo.limit,
      current: result.limitInfo.current,
      remaining: result.limitInfo.limit === -1 ? -1 : result.limitInfo.remaining,
    } : undefined,
  };
}

/**
 * Track resource creation (AFTER creation)
 * This increments the usage counter
 * @param count - Number of resources created (default: 1). Useful for bulk operations.
 */
export async function trackResourceCreation(
  userId: string,
  workspaceId: string,
  resourceType: ResourceType,
  researchType?: string,
  count: number = 1
): Promise<void> {
  console.log('🔵 trackResourceCreation called:', {
    userId,
    workspaceId,
    resourceType,
    researchType,
    count,
    timestamp: new Date().toISOString(),
  });

  const result = await incrementUsage(
    workspaceId,
    userId,
    resourceType,
    researchType as any,
    count
  );

  if (!result.success) {
    // Log error but don't fail the request
    // Usage tracking is important but shouldn't break the user flow
    console.error(`❌ Failed to track ${resourceType} creation:`, result.error);
    console.error('Details:', { userId, workspaceId, resourceType, researchType, count });
  } else {
    console.log(`✅ Successfully tracked ${resourceType} creation:`, {
      userId,
      workspaceId,
      resourceType,
      researchType,
      count,
    });
  }
}

/**
 * Combined check + track operation
 * Use this when you want to check and track in one call
 * Returns the created resource ID or an error response
 */
export async function createWithUsageTracking<T>(
  userId: string,
  workspaceId: string,
  resourceType: ResourceType,
  createFn: () => Promise<T>,
  researchType?: string
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  // 1. Check if allowed
  const check = await checkCanCreate(userId, workspaceId, resourceType);
  if (!check.allowed) {
    return { success: false, error: check.error! };
  }

  // 2. Create the resource
  let data: T;
  try {
    data = await createFn();
  } catch (error) {
    console.error(`Failed to create ${resourceType}:`, error);
    return {
      success: false,
      error: NextResponse.json(
        { error: `Failed to create ${resourceType}` },
        { status: 500 }
      ),
    };
  }

  // 3. Track the creation
  await trackResourceCreation(userId, workspaceId, resourceType, researchType);

  return { success: true, data };
}

/**
 * Helper to get current usage statistics for a workspace
 */
export async function getUsageStats(workspaceId: string) {
  // This will be implemented later if needed
  // For now, the frontend fetches from /api/usage directly
  return null;
}
