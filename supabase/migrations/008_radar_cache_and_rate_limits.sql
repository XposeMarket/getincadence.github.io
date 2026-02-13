-- ============================================================================
-- Revenue Radar: Cache + Rate Limiting
-- ============================================================================

-- ── Radar Search Cache ──────────────────────────────────────────────────────
-- Caches search results by lat/lng bucket + industry + radius
-- Buckets are rounded to 2 decimal places (~1.1km precision)
CREATE TABLE IF NOT EXISTS radar_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,        -- "lat_bucket:lng_bucket:industry:radius"
  industry text NOT NULL,
  lat_bucket numeric(7,2) NOT NULL,      -- rounded lat
  lng_bucket numeric(8,2) NOT NULL,      -- rounded lng
  radius_miles integer NOT NULL,
  leads jsonb NOT NULL DEFAULT '[]'::jsonb,
  storms jsonb NOT NULL DEFAULT '[]'::jsonb,
  permits jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_radar_cache_key ON radar_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_radar_cache_expires ON radar_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_radar_cache_bucket ON radar_cache(lat_bucket, lng_bucket, industry);

-- Auto-cleanup expired cache entries (run via pg_cron or app-side)
-- For now, we'll clean up in the API route before inserting

-- ── Radar Rate Limits ───────────────────────────────────────────────────────
-- Tracks daily search count per org
CREATE TABLE IF NOT EXISTS radar_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  search_date date NOT NULL DEFAULT CURRENT_DATE,
  search_count integer NOT NULL DEFAULT 0,
  last_search_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, search_date)
);

CREATE INDEX IF NOT EXISTS idx_radar_rate_org_date ON radar_rate_limits(org_id, search_date);

-- ── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE radar_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_rate_limits ENABLE ROW LEVEL SECURITY;

-- Cache is readable by anyone (public data), writable by service role only
CREATE POLICY "Cache readable by authenticated users"
  ON radar_cache FOR SELECT
  TO authenticated
  USING (true);

-- Rate limits visible to org members
CREATE POLICY "Rate limits visible to org members"
  ON radar_rate_limits FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );
