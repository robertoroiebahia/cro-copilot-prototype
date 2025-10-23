-- ============================================================================
-- INVESTIGATE AND FIX SUBSCRIPTION AUTO-CREATE TRIGGER
-- Migration 017
-- Created: October 23, 2025
-- ============================================================================
-- This migration systematically fixes the subscription auto-creation issue
-- Problem: supabase_auth_admin lacks permissions to INSERT into subscriptions
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    trig_record RECORD;
BEGIN
    -- ============================================================================
    -- STEP 1: INVESTIGATE CURRENT STATE
    -- ============================================================================

    RAISE NOTICE '=== EXISTING TRIGGER FUNCTIONS ===';
    FOR func_record IN
        SELECT proname
        FROM pg_proc
        WHERE proname LIKE '%subscription%'
    LOOP
        RAISE NOTICE 'Function: %', func_record.proname;
    END LOOP;

    RAISE NOTICE '=== EXISTING TRIGGERS ON auth.users ===';
    FOR trig_record IN
        SELECT tgname, tgenabled
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
    LOOP
        RAISE NOTICE 'Trigger: % (enabled: %)', trig_record.tgname, trig_record.tgenabled;
    END LOOP;

    RAISE NOTICE '=== INVESTIGATION COMPLETE ===';
END $$;

-- ============================================================================
-- STEP 2: CLEAN UP ALL EXISTING TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Drop ALL triggers on auth.users related to subscriptions
DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS create_subscription_for_new_user ON auth.users;

-- Drop ALL subscription-related trigger functions
DROP FUNCTION IF EXISTS public.handle_new_user_subscription() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_subscription() CASCADE;
DROP FUNCTION IF EXISTS public.create_subscription_for_user() CASCADE;

-- ============================================================================
-- STEP 3: GRANT PROPER PERMISSIONS
-- ============================================================================
-- This is the CRITICAL missing piece!
-- The supabase_auth_admin user needs permission to INSERT/UPDATE subscriptions

-- Grant INSERT and UPDATE permissions to supabase_auth_admin
GRANT INSERT, UPDATE ON public.subscriptions TO supabase_auth_admin;

-- Also grant usage on the sequence for the ID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- Grant SELECT on pricing_plans (needed for foreign key check)
GRANT SELECT ON public.pricing_plans TO supabase_auth_admin;

-- ============================================================================
-- STEP 4: CREATE PROPER TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log for debugging
  RAISE NOTICE 'Creating subscription for new user: %', NEW.id;

  -- Create a free subscription for the new user
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    billing_cycle,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'free',
    'active',
    'monthly',
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Subscription created successfully for user: %', NEW.id;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block user creation
  RAISE WARNING 'Failed to create subscription for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user_subscription() IS
  'Automatically creates a free subscription for new users.
   Uses SECURITY DEFINER to bypass RLS.
   Requires supabase_auth_admin to have INSERT permission on subscriptions table.';

-- ============================================================================
-- STEP 5: CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- STEP 6: ENSURE RLS POLICIES ARE CORRECT
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "System can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow inserts (for trigger and API)
CREATE POLICY "System can create subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow updates (for Stripe webhooks)
CREATE POLICY "System can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to verify)
-- ============================================================================

-- To verify the setup, run these queries:

-- Check trigger exists and is enabled
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- Check function exists
-- SELECT proname FROM pg_proc WHERE proname = 'handle_new_user_subscription';

-- Check permissions
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_name = 'subscriptions' AND grantee = 'supabase_auth_admin';
