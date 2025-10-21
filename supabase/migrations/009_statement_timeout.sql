-- Set statement timeout to prevent runaway queries
-- Fail fast instead of hanging for minutes

-- Set default statement timeout to 10 seconds for all connections
ALTER DATABASE postgres SET statement_timeout = '10s';

-- For the current session
SET statement_timeout = '10s';

-- Create a function to temporarily increase timeout for specific operations if needed
CREATE OR REPLACE FUNCTION exec_with_timeout(
  query TEXT,
  timeout_seconds INTEGER DEFAULT 10
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('SET LOCAL statement_timeout = ''%ss''', timeout_seconds);
  EXECUTE query;
END;
$$;

COMMENT ON FUNCTION exec_with_timeout IS 'Execute a query with a custom statement timeout';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION exec_with_timeout TO authenticated, service_role;
