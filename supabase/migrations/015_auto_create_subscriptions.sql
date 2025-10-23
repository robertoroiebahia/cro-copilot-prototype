-- ============================================================================
-- AUTO-CREATE SUBSCRIPTIONS FOR NEW USERS
-- Migration 015
-- Created: October 22, 2025
-- ============================================================================
-- Ensures every new user gets a free subscription automatically
-- ============================================================================

-- Function to create subscription for new user
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a free subscription for the new user
  INSERT INTO public.subscriptions (user_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, 'free', 'active', 'monthly')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;

-- Create trigger to auto-create subscription on user signup
CREATE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

COMMENT ON FUNCTION public.handle_new_user_subscription() IS 'Automatically creates a free subscription for new users';
