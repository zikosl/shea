-- Shea PostgreSQL initialization
-- This runs once when the database is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- For fuzzy text search

-- Set timezone
SET timezone = 'UTC';

-- Performance tuning (adjust based on your server RAM)
-- These are applied via postgresql.conf in production
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET work_mem = '16MB';

COMMENT ON DATABASE shea IS 'Shea - Gaming Center Management System';