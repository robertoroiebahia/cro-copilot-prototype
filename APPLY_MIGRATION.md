# Apply Progress Tracking Migration

The database needs to be updated with new columns for progress tracking.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/add_progress_tracking.sql`
4. Click **Run** to execute the migration

## Option 2: Using Supabase CLI

If your project is linked to Supabase CLI:

```bash
# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

## Option 3: Direct SQL Execution

Copy this SQL and run it directly in the Supabase SQL Editor:

```sql
-- Add progress tracking columns to analyses table
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

-- Add comments for documentation
COMMENT ON COLUMN analyses.progress IS 'Analysis progress percentage (0-100)';
COMMENT ON COLUMN analyses.progress_stage IS 'Current stage: initializing, scraping, processing-html, capturing-screenshot, running-ai-analysis, saving-results, completed, failed';
COMMENT ON COLUMN analyses.progress_message IS 'User-friendly progress message';
```

## Verification

After applying the migration, verify it worked:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'analyses'
AND column_name IN ('progress', 'progress_stage', 'progress_message');
```

You should see three new columns:
- `progress` (integer, default 0)
- `progress_stage` (text)
- `progress_message` (text)

## What This Migration Does

1. **Adds three new columns** to the `analyses` table for real-time progress tracking
2. **Adds a database index** for efficient queries by user_id, status, and progress
3. **Updates existing rows** with sensible default values based on their current status
4. **Adds documentation** via SQL comments

The progress tracking system will now work and provide accurate real-time updates during analysis.
