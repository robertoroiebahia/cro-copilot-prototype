-- Migration 012: Add unique constraint to ga4_raw_events
-- This allows upsert operations to work correctly when syncing GA4 data

-- Drop the constraint if it exists (for idempotency)
ALTER TABLE public.ga4_raw_events
DROP CONSTRAINT IF EXISTS ga4_raw_events_unique_event;

-- Add unique constraint on the combination of fields that uniquely identify an event
-- This prevents duplicate event records for the same date/event/segment combination
ALTER TABLE public.ga4_raw_events
ADD CONSTRAINT ga4_raw_events_unique_event UNIQUE (
  workspace_id,
  event_date,
  event_name,
  device_category,
  channel,
  user_type,
  country
);

-- Add index for better query performance on common filters
CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_workspace_date
ON public.ga4_raw_events(workspace_id, event_date);

CREATE INDEX IF NOT EXISTS idx_ga4_raw_events_event_name
ON public.ga4_raw_events(event_name);
