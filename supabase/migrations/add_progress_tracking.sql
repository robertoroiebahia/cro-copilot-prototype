-- Add progress tracking columns to analyses table
-- This migration adds real-time progress tracking for analysis jobs

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS progress_stage TEXT,
ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Add index for efficient progress queries
CREATE INDEX IF NOT EXISTS idx_analyses_progress ON analyses(user_id, status, progress);

-- Update existing rows to have default progress values
UPDATE analyses
SET
  progress = CASE
    WHEN status = 'completed' THEN 100
    WHEN status = 'failed' THEN 0
    ELSE 0
  END,
  progress_stage = CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'processing'
  END,
  progress_message = CASE
    WHEN status = 'completed' THEN 'Analysis complete!'
    WHEN status = 'failed' THEN error_message
    ELSE 'Processing...'
  END
WHERE progress IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN analyses.progress IS 'Analysis progress percentage (0-100)';
COMMENT ON COLUMN analyses.progress_stage IS 'Current stage: initializing, scraping, processing-html, capturing-screenshot, running-ai-analysis, saving-results, completed, failed';
COMMENT ON COLUMN analyses.progress_message IS 'User-friendly progress message';
