// Usage Tracking Utilities
// Functions to track and check usage limits

import { createClient } from '@/utils/supabase/server';
import type { ResearchType } from '@/lib/types/insights.types';
import type { UsageType, UsageLimitCheck } from '@/lib/types/billing.types';

/**
 * Increment usage counter for a workspace
 * Call this after creating an analysis, insight, theme, hypothesis, or experiment
 */
export async function incrementUsage(
  workspaceId: string,
  userId: string,
  usageType: UsageType,
  researchType?: ResearchType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('increment_usage', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_usage_type: usageType,
      p_research_type: researchType || null,
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception incrementing usage:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Check if user has reached their usage limit
 * Call this BEFORE allowing user to create a new resource
 */
export async function checkUsageLimit(
  userId: string,
  workspaceId: string,
  usageType: UsageType
): Promise<UsageLimitCheck | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_usage_type: usageType,
    });

    if (error) {
      console.error('Error checking usage limit:', error);
      return null;
    }

    return data as UsageLimitCheck;
  } catch (err) {
    console.error('Exception checking usage limit:', err);
    return null;
  }
}

/**
 * Get current usage for a workspace
 */
export async function getCurrentUsage(workspaceId: string, period?: string) {
  const supabase = await createClient();

  const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('period', currentPeriod)
    .single();

  if (error) {
    // If no usage record exists yet, return zeros
    if (error.code === 'PGRST116') {
      return {
        analyses_count: 0,
        insights_count: 0,
        themes_count: 0,
        hypotheses_count: 0,
        experiments_count: 0,
        analyses_by_type: {
          page_analysis: 0,
          ga4_analysis: 0,
          survey_analysis: 0,
          review_mining: 0,
          onsite_poll: 0,
          heatmap_analysis: 0,
          user_testing: 0,
          other: 0,
        },
      };
    }
    console.error('Error fetching usage:', error);
    return null;
  }

  return data;
}

/**
 * Check if a research type is available for the user's plan
 */
export async function isFeatureAvailable(
  userId: string,
  featureName: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_subscription_details')
    .select('features')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error checking feature availability:', error);
    // Default to free plan features if error
    return false;
  }

  const features = data?.features || {};
  return features[featureName] === true;
}

/**
 * Get user's current subscription with plan details
 * Returns free plan if user has no subscription (new pattern: subscriptions created on upgrade)
 */
export async function getUserSubscription(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_subscription_details')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  // If no subscription found, user is on free plan
  // This is the new pattern: subscriptions are only created when user upgrades
  if (!data) {
    console.log('No subscription found, user is on free plan:', userId);
    return {
      user_id: userId,
      plan_id: 'free',
      plan_name: 'Free',
      status: 'active',
      features: {
        page_analysis: true,
        ga4_analysis: true,
        survey_analysis: false,
        review_mining: false,
        onsite_poll: false,
        heatmap_analysis: false,
        user_testing: false,
        manual_insights: false,
        edit_themes: false,
        edit_hypotheses: false,
        csv_export: false,
        api_access: false,
        white_label: false,
        priority_support: false,
      },
      limits: {
        analyses_per_month: 5,
        insights_max: 50,
        themes_max: 10,
        hypotheses_max: 5,
        experiments_per_month: 2,
        workspaces_max: 1,
        team_members_max: 1,
        data_retention_days: 7,
      },
    };
  }

  return data;
}

/**
 * Helper to check if user can perform an action
 * Returns { allowed: boolean, reason?: string }
 */
export async function canPerformAction(
  userId: string,
  workspaceId: string,
  actionType: UsageType,
  featureName?: string
): Promise<{ allowed: boolean; reason?: string; limitInfo?: UsageLimitCheck }> {
  // 1. Check feature access (if feature name provided)
  if (featureName) {
    const hasFeature = await isFeatureAvailable(userId, featureName);
    if (!hasFeature) {
      return {
        allowed: false,
        reason: `This feature is not available on your current plan. Upgrade to access ${featureName}.`,
      };
    }
  }

  // 2. Check usage limits
  const limitCheck = await checkUsageLimit(userId, workspaceId, actionType);
  if (!limitCheck) {
    // If we can't check limits, allow the action (fail open)
    console.warn('Could not check usage limits, allowing action');
    return { allowed: true };
  }

  if (!limitCheck.allowed) {
    const limitText = limitCheck.limit === -1 ? 'unlimited' : limitCheck.limit;
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limitText} ${actionType}. Upgrade your plan for higher limits.`,
      limitInfo: limitCheck,
    };
  }

  return { allowed: true, limitInfo: limitCheck };
}
