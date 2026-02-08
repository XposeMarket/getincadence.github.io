-- =====================================================
-- ADD ADDITIONAL COLUMNS TO ORGS AND USERS TABLES
-- =====================================================

-- Add additional columns to orgs table for organization settings
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS address TEXT;

-- Add additional columns to users table for profile settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
