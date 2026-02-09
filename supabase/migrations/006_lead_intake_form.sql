-- =====================================================
-- LEAD INTAKE FORM SUPPORT
-- =====================================================

-- Add intake form slug and logo URL to orgs table
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS intake_form_slug TEXT UNIQUE;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add source field to deals for tracking where leads come from
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source TEXT;

-- Add index on intake_form_slug for fast public lookups
CREATE INDEX IF NOT EXISTS idx_orgs_intake_form_slug ON orgs(intake_form_slug);

-- Add index on deals source for filtering
CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source);
