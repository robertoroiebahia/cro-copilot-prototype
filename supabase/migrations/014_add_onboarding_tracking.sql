-- ============================================================================
-- ONBOARDING TRACKING
-- Migration 014
-- Created: October 22, 2025
-- ============================================================================
-- Adds onboarding completion tracking to profiles table
-- ============================================================================

-- Add onboarding tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMPTZ;

-- Add comment to explain the fields
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when user completed the onboarding flow';
COMMENT ON COLUMN public.profiles.onboarding_skipped_at IS 'Timestamp when user skipped the onboarding flow';
