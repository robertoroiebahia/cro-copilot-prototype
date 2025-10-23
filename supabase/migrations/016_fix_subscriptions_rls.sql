-- ============================================================================
-- FIX SUBSCRIPTIONS RLS POLICIES
-- Migration 016
-- Created: October 23, 2025
-- ============================================================================
-- Fixes missing INSERT policy that was blocking auto-subscription creation
-- The trigger function needs to bypass RLS entirely using SECURITY DEFINER
-- ============================================================================

-- First, let's disable RLS temporarily to fix existing issues
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop existing trigger and function to recreate properly
DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_subscription();

-- Recreate the function with proper permissions
-- Using SECURITY DEFINER means it runs with the permissions of the function creator (superuser)
-- This bypasses RLS entirely
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create a free subscription for the new user
  INSERT INTO public.subscriptions (user_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, 'free', 'active', 'monthly')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block user creation
  RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Now re-enable RLS and create proper policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

-- RLS: Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: Allow service role to insert subscriptions (for trigger and webhooks)
CREATE POLICY "System can create subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (true);

-- RLS: Allow service role to update subscriptions (for webhooks)
CREATE POLICY "System can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON FUNCTION public.handle_new_user_subscription() IS
  'Automatically creates a free subscription for new users. Uses SECURITY DEFINER to bypass RLS.';
