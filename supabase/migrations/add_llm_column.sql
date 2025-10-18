-- Add llm column to analyses table
-- This stores which LLM was used for the analysis ('gpt' or 'claude')

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS llm TEXT DEFAULT 'gpt';

-- Add a comment to document the column
COMMENT ON COLUMN analyses.llm IS 'The LLM used for analysis (gpt or claude)';

-- Add a check constraint to ensure only valid values
ALTER TABLE analyses
ADD CONSTRAINT llm_valid_values CHECK (llm IN ('gpt', 'claude'));
