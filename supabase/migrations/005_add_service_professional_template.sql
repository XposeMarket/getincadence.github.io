-- Add service_professional to industry_type constraint
-- First drop the existing constraint
ALTER TABLE orgs DROP CONSTRAINT IF EXISTS industry_type_check;

-- Re-add with service_professional included
ALTER TABLE orgs ADD CONSTRAINT industry_type_check CHECK (industry_type IN ('default', 'photographer', 'service_professional'));
