-- Migration: OAuth State Storage
-- Date: 2025-10-27
-- Description: Store OAuth state tokens for CSRF protection

-- ============================================================================
-- OAUTH STATES TABLE
-- ============================================================================
-- Temporary storage for OAuth state tokens during authorization flow

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- OAuth details
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL, -- 'shopify', 'google', etc.

  -- User and workspace
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Provider-specific data
  shop_domain TEXT, -- For Shopify
  redirect_uri TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_oauth_states_state ON public.oauth_states(state);
CREATE INDEX idx_oauth_states_user ON public.oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires ON public.oauth_states(expires_at);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own OAuth states"
  ON public.oauth_states FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================
-- Automatically delete expired OAuth states

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.oauth_states
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.oauth_states IS 'Temporary storage for OAuth state tokens (CSRF protection)';
COMMENT ON COLUMN public.oauth_states.state IS 'Random token for CSRF protection';
COMMENT ON COLUMN public.oauth_states.expires_at IS 'States expire after 10 minutes';
