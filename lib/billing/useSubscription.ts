// React Hook for Subscription Management
// Provides easy access to user's subscription, limits, and usage

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
// Note: This hook fetches data via API routes, not directly from these functions
// import { getUserSubscription, getCurrentUsage, canPerformAction } from './usage-tracking';
import type { UserSubscriptionDetails, UsageTracking, UsageType } from '@/lib/types/billing.types';

export function useSubscription() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) {
      // Only reset if we were previously initialized
      if (isInitialized) {
        setSubscription(null);
        setLoading(false);
      }
      return;
    }

    // Prevent refetching if we already have data for this user
    if (isInitialized && subscription?.user_id === session.user.id) {
      return;
    }

    fetchSubscription();
  }, [session?.user?.id]);

  const fetchSubscription = async () => {
    if (!session?.user?.id) return;

    try {
      // Don't show loading state if we already have data (prevents flickering)
      if (!isInitialized) {
        setLoading(true);
      }
      setError(null);

      // Fetch subscription via API route
      const response = await fetch('/api/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      const data = await response.json();

      // Only update if data actually changed
      if (JSON.stringify(data) !== JSON.stringify(subscription)) {
        setSubscription(data);
      }
      setIsInitialized(true);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      setIsInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  const isPro = isInitialized ? subscription?.plan_id === 'pro' : false;
  const isFree = isInitialized ? (subscription?.plan_id === 'free' || !subscription) : true;

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    // Only return status if we're initialized to prevent flickering
    isPro,
    isEnterprise: isInitialized ? subscription?.plan_id === 'enterprise' : false,
    isFree,
    hasFeature: (featureName: string) => {
      return isInitialized ? subscription?.features?.[featureName as keyof typeof subscription.features] === true : false;
    },
  };
}

export function useWorkspaceUsage(workspaceId: string | null) {
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setUsage(null);
      setLoading(false);
      return;
    }

    fetchUsage();
  }, [workspaceId]);

  const fetchUsage = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch usage via API route
      const response = await fetch(`/api/usage?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage');
      }
      const data = await response.json();
      setUsage(data);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  return {
    usage,
    loading,
    error,
    refetch: fetchUsage,
  };
}

/**
 * Hook to check if user can perform an action
 * Usage: const { canCreate, checkLimit, limitInfo } = useActionLimit(workspaceId, 'analyses');
 */
export function useActionLimit(workspaceId: string | null, actionType: UsageType) {
  const { session } = useAuth();
  const [checking, setChecking] = useState(false);
  const [limitInfo, setLimitInfo] = useState<any>(null);

  const checkLimit = async (featureName?: string): Promise<boolean> => {
    if (!session?.user?.id || !workspaceId) return false;

    setChecking(true);
    try {
      // Check limit via API route (can be implemented later if needed)
      // For now, return true (fail open)
      console.warn('checkLimit: API endpoint not yet implemented, allowing action');
      return true;
    } catch (err) {
      console.error('Error checking action limit:', err);
      return false;
    } finally {
      setChecking(false);
    }
  };

  return {
    checkLimit,
    checking,
    limitInfo,
  };
}
