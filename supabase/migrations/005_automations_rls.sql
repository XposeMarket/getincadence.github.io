-- Fix: Ensure automations table has RLS policy so client-side queries work
-- The table was created via Supabase dashboard and has RLS enabled
-- but no permissive policy, causing empty results on client reads.

-- Enable RLS (no-op if already enabled, safe to run)
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matches the demo pattern used by other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automations' AND policyname = 'Allow all operations for demo'
  ) THEN
    CREATE POLICY "Allow all operations for demo" ON automations
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
