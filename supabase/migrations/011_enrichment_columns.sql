-- Migration 011: Enrichment columns for contacts and companies
-- Supports auto-enrichment from Google Places (Prospector) and domain meta scraping

-- Contacts enrichment
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_source TEXT; -- 'google_places' | 'domain_scrape'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;

-- Companies enrichment
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS enrichment_source TEXT; -- 'google_places' | 'domain_scrape'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;
