-- Create automation_logs table for tracking automation runs
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL,
  trigger_entity_type TEXT,
  trigger_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'success',
  result JSONB,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_automation_logs_org_id ON automation_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_type ON automation_logs(automation_type);

-- Add metadata column to deals if not exists (for storing close_reason, etc.)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE deals ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add metadata column to tasks if not exists (for storing automation info)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add is_won and is_lost columns to pipeline_stages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pipeline_stages' AND column_name = 'is_won'
  ) THEN
    ALTER TABLE pipeline_stages ADD COLUMN is_won BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pipeline_stages' AND column_name = 'is_lost'
  ) THEN
    ALTER TABLE pipeline_stages ADD COLUMN is_lost BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update existing stages to mark won/lost
UPDATE pipeline_stages SET is_won = TRUE WHERE LOWER(name) LIKE '%won%';
UPDATE pipeline_stages SET is_lost = TRUE WHERE LOWER(name) LIKE '%lost%';

-- Enable RLS on automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for automation_logs (same pattern as other tables)
CREATE POLICY "Allow all operations for demo" ON automation_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
