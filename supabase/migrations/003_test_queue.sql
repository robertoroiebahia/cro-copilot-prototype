-- Test Queue Table
-- Stores prioritized CRO tests that users want to run

CREATE TABLE IF NOT EXISTS public.test_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

  -- Test information
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  type TEXT NOT NULL, -- 'recommendation' or 'issue'

  -- Impact & Priority
  impact TEXT NOT NULL, -- 'High', 'Medium', 'Low'
  priority TEXT NOT NULL, -- 'P0', 'P1', 'P2' or 'critical', 'medium', 'low'
  expected_lift TEXT NOT NULL,
  confidence TEXT NOT NULL, -- 'High', 'Medium', 'Low'
  effort TEXT NOT NULL, -- 'High', 'Medium', 'Low'

  -- Test details (from recommendation or issue card)
  test_type TEXT, -- 'Iterative', 'Substantial', 'Disruptive' (for recommendations)
  business_impact JSONB, -- Array of impact areas
  kpi TEXT,
  rationale TEXT,
  current_state TEXT,
  proposed_change TEXT,

  -- Issue-specific fields
  section TEXT, -- Section of the page (for issues)
  principle TEXT, -- CRO principle (for issues)
  current_screenshot TEXT, -- Base64 screenshot
  mockup_screenshot TEXT, -- Base64 mockup

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'in_progress', 'completed', 'paused', 'cancelled'
  position INTEGER, -- Manual ordering position (lower = higher priority)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Notes and results
  notes TEXT,
  results JSONB -- Test results when completed
);

-- Enable RLS
ALTER TABLE public.test_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own test queue"
  ON public.test_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own test queue"
  ON public.test_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test queue"
  ON public.test_queue
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own test queue"
  ON public.test_queue
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_test_queue_user_id ON public.test_queue(user_id);
CREATE INDEX idx_test_queue_analysis_id ON public.test_queue(analysis_id);
CREATE INDEX idx_test_queue_status ON public.test_queue(status);
CREATE INDEX idx_test_queue_position ON public.test_queue(position);
CREATE INDEX idx_test_queue_created_at ON public.test_queue(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER set_test_queue_updated_at
  BEFORE UPDATE ON public.test_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically set position for new tests
CREATE OR REPLACE FUNCTION set_test_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1
    INTO NEW.position
    FROM public.test_queue
    WHERE user_id = NEW.user_id AND status = 'queued';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_test_queue_position
  BEFORE INSERT ON public.test_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_test_queue_position();
