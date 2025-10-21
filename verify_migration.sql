-- Verify the migration worked
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'analyses' 
AND column_name IN ('research_type', 'name')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'insights' 
AND column_name IN ('research_type', 'source_type', 'analysis_id')
ORDER BY column_name;
