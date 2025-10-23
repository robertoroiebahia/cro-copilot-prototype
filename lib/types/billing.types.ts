// TypeScript types for the Billing & Usage Tracking System
// Based on migration 013_billing_and_usage_system.sql

// ============================================================================
// PRICING PLANS
// ============================================================================

export type PlanId = 'free' | 'pro' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
  analyses_per_month: number; // -1 = unlimited
  insights_max: number; // -1 = unlimited
  themes_max: number; // -1 = unlimited
  hypotheses_max: number; // -1 = unlimited
  experiments_per_month: number; // -1 = unlimited
  workspaces_max: number; // -1 = unlimited
  team_members_max: number; // -1 = unlimited
  data_retention_days: number; // -1 = unlimited
}

export interface PlanFeatures {
  page_analysis: boolean;
  ga4_analysis: boolean;
  survey_analysis: boolean;
  review_mining: boolean;
  onsite_poll: boolean;
  heatmap_analysis: boolean;
  user_testing: boolean;
  manual_insights: boolean;
  edit_themes: boolean;
  edit_hypotheses: boolean;
  csv_export: boolean;
  api_access: boolean;
  white_label: boolean;
  priority_support: boolean;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  description: string | null;
  price_monthly: number | null; // In cents (e.g., 7900 = $79.00)
  price_annual: number | null; // In cents
  limits: PlanLimits;
  features: PlanFeatures;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionDetails extends Subscription {
  plan_name: string;
  plan_description: string | null;
  price_monthly: number | null;
  price_annual: number | null;
  limits: PlanLimits;
  features: PlanFeatures;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface AnalysesByType {
  page_analysis: number;
  ga4_analysis: number;
  survey_analysis: number;
  review_mining: number;
  onsite_poll: number;
  heatmap_analysis: number;
  user_testing: number;
  other: number;
}

export interface UsageTracking {
  id: string;
  workspace_id: string;
  user_id: string;
  period: string; // Format: YYYY-MM
  analyses_count: number;
  insights_count: number;
  themes_count: number;
  hypotheses_count: number;
  experiments_count: number;
  analyses_by_type: AnalysesByType;
  created_at: string;
  updated_at: string;
}

export type UsageType = 'analyses' | 'insights' | 'themes' | 'hypotheses' | 'experiments';

export interface UsageLimitCheck {
  allowed: boolean;
  limit: number; // -1 = unlimited
  current: number;
  remaining: number; // -1 = unlimited
  period: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface PricingCardData {
  plan: PricingPlan;
  highlighted?: boolean;
  ctaText: string;
  ctaVariant: 'primary' | 'secondary' | 'outline';
}

export interface UpgradePrompt {
  title: string;
  message: string;
  ctaText: string;
  targetPlan: PlanId;
  feature?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const PLAN_COLORS: Record<PlanId, string> = {
  free: 'gray',
  pro: 'gold',
  enterprise: 'purple',
};

// Default limits for easy reference
export const DEFAULT_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    analyses_per_month: 5,
    insights_max: 50,
    themes_max: 10,
    hypotheses_max: 5,
    experiments_per_month: 2,
    workspaces_max: 1,
    team_members_max: 1,
    data_retention_days: 7,
  },
  pro: {
    analyses_per_month: 50,
    insights_max: -1,
    themes_max: -1,
    hypotheses_max: -1,
    experiments_per_month: 25,
    workspaces_max: 3,
    team_members_max: 3,
    data_retention_days: 90,
  },
  enterprise: {
    analyses_per_month: -1,
    insights_max: -1,
    themes_max: -1,
    hypotheses_max: -1,
    experiments_per_month: -1,
    workspaces_max: -1,
    team_members_max: -1,
    data_retention_days: -1,
  },
};

// Helper to format price
export function formatPrice(cents: number | null): string {
  if (cents === null) return 'Custom';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

// Helper to check if limit is unlimited
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

// Helper to get usage percentage
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100; // No limit (shouldn't happen)
  return Math.min(100, (current / limit) * 100);
}
