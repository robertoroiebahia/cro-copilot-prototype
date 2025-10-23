-- Fix RLS policies for usage_tracking table
-- The RPC function needs to INSERT/UPDATE, but RLS was blocking it

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view usage for their workspaces" ON public.usage_tracking;

-- Create policies for SELECT, INSERT, and UPDATE
CREATE POLICY "Users can view usage for their workspaces"
  ON public.usage_tracking
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- Allow the RPC function to INSERT (bypasses RLS when called via RPC)
-- The RPC function runs with SECURITY DEFINER, so we need to allow inserts
CREATE POLICY "Allow RPC function to insert usage"
  ON public.usage_tracking
  FOR INSERT
  WITH CHECK (true);  -- RPC function will handle authorization

CREATE POLICY "Allow RPC function to update usage"
  ON public.usage_tracking
  FOR UPDATE
  USING (true)
  WITH CHECK (true);  -- RPC function will handle authorization

-- Make sure the RPC function runs with proper permissions
ALTER FUNCTION increment_usage(UUID, UUID, TEXT, TEXT) SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT INSERT, UPDATE ON public.usage_tracking TO authenticated;

COMMENT ON POLICY "Allow RPC function to insert usage" ON public.usage_tracking IS
  'Allows the increment_usage RPC function to insert new usage records. Authorization is handled within the RPC function.';

COMMENT ON POLICY "Allow RPC function to update usage" ON public.usage_tracking IS
  'Allows the increment_usage RPC function to update existing usage records. Authorization is handled within the RPC function.';
