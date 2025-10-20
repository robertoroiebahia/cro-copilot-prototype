-- Enhanced Analysis Features Migration
-- Adds tags, starred, notes, and archived functionality to analyses

-- Add new columns to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS idx_analyses_tags ON analyses USING GIN(tags);

-- Create index on is_starred for faster filtering
CREATE INDEX IF NOT EXISTS idx_analyses_starred ON analyses(is_starred) WHERE is_starred = true;

-- Create index on archived_at for faster filtering
CREATE INDEX IF NOT EXISTS idx_analyses_archived ON analyses(archived_at) WHERE archived_at IS NOT NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- Update RLS policies to include new columns (they're covered by existing user_id policies)

-- Comments
COMMENT ON COLUMN analyses.tags IS 'Array of tags for categorizing analyses (e.g., ["high-priority", "homepage", "mobile"])';
COMMENT ON COLUMN analyses.is_starred IS 'Whether this analysis is starred/favorited by the user';
COMMENT ON COLUMN analyses.notes IS 'User notes about this analysis';
COMMENT ON COLUMN analyses.archived_at IS 'When this analysis was archived (null if not archived)';
