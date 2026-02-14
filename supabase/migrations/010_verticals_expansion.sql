-- =====================================================
-- 010: Verticals Expansion
-- =====================================================
-- Drops the restrictive industry_type CHECK constraint to support
-- new verticals. Validation is handled in the application layer
-- via lib/verticals.ts registry.
--
-- Adds prospector configuration columns so orgs can override
-- their vertical's default Prospector settings.
-- =====================================================

-- Drop the restrictive CHECK constraint (was limited to 3 values)
ALTER TABLE orgs DROP CONSTRAINT IF EXISTS industry_type_check;

-- Add prospector override columns
-- prospector_enabled: null = use vertical default, true/false = explicit override
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS prospector_enabled BOOLEAN DEFAULT NULL;

-- prospector_config: JSONB storing customized prospector settings
-- Shape: { radar_mode, trade, default_radius_miles, default_signals }
-- null = use vertical defaults
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS prospector_config JSONB DEFAULT NULL;

-- Index for quick lookups (most orgs will have null, so partial index is efficient)
CREATE INDEX IF NOT EXISTS idx_orgs_prospector_enabled
  ON orgs (prospector_enabled)
  WHERE prospector_enabled IS NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN orgs.prospector_enabled IS 'Override vertical default for Prospector visibility. NULL = use vertical default.';
COMMENT ON COLUMN orgs.prospector_config IS 'Custom Prospector config (radar_mode, trade, radius, signals). NULL = use vertical defaults.';
