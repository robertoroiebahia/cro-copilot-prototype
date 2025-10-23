-- ============================================================================
-- REMOVE AUTO-CREATE SUBSCRIPTION TRIGGER
-- Migration 018
-- Created: October 23, 2025
-- ============================================================================
-- Removes the auto-create subscription trigger and adopts the SaaS Starter pattern
-- Subscriptions will now be created during checkout, not signup
-- ============================================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user_subscription();

-- Revoke permissions that were granted for the trigger
REVOKE INSERT, UPDATE ON public.subscriptions FROM supabase_auth_admin;
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM supabase_auth_admin;
REVOKE SELECT ON public.pricing_plans FROM supabase_auth_admin;

-- Add comment explaining the new approach
COMMENT ON TABLE public.subscriptions IS
  'User subscriptions. Created when user upgrades to paid plan via Stripe checkout.
   Free users may not have a subscription record - handle NULL gracefully in queries.
   Subscriptions are created/updated via /api/stripe/checkout callback, not via trigger.';
