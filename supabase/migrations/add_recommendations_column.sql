-- Add recommendations column to analyses table
-- This stores the new CRO recommendation cards format

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN analyses.recommendations IS 'Array of CRO recommendation cards with impact, type, business impact, KPI, hypothesis, and rationale';

-- Create an index for faster JSON queries if needed
CREATE INDEX IF NOT EXISTS idx_analyses_recommendations ON analyses USING GIN (recommendations);
