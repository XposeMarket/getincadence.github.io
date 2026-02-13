-- =====================================================
-- CADENCE CRM — COMMUNICATION LOGGING
-- Migration: 009_communications.sql
-- =====================================================
-- Enables manual logging of calls, emails, SMS, and notes
-- with full edit history, soft delete, and org-level RLS.

-- =====================================================
-- COMMUNICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS communications (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Communication Type & Direction
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'call', 'note')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound', 'internal')),

  -- Content
  recipient_contact TEXT,          -- Phone number or email address
  subject TEXT,                    -- For emails/calls (optional label)
  body TEXT,                       -- Message content or detailed notes

  -- Timestamps (all timezone-aware)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,  -- NULL = active, timestamp = soft-deleted

  -- User Attribution
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Call-Specific Fields
  duration_seconds INTEGER,        -- NULL for emails/notes

  -- Audit & History
  edit_history JSONB DEFAULT '[]'::jsonb,
    -- Array of {timestamp, edited_by, edited_by_name, changes: {field: {old, new}}}

  -- Auto-Logging Flag (future Twilio/email integration)
  is_auto_logged BOOLEAN DEFAULT false
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_communications_org_id ON communications(org_id);
CREATE INDEX idx_communications_lead_id ON communications(lead_id);
CREATE INDEX idx_communications_deal_id ON communications(deal_id);
CREATE INDEX idx_communications_created_at ON communications(created_at DESC);
CREATE INDEX idx_communications_type ON communications(communication_type);
CREATE INDEX idx_communications_created_by ON communications(created_by);

-- Partial index for active (non-deleted) communications
CREATE INDEX idx_communications_active ON communications(lead_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view communications in their org
CREATE POLICY "Users can view org communications"
  ON communications FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- INSERT: Users can create communications in their org
CREATE POLICY "Users can create org communications"
  ON communications FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- UPDATE: Creator or org admin can edit
CREATE POLICY "Users can update own or admin communications"
  ON communications FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND org_id = communications.org_id
        AND role = 'admin'
      )
    )
  );

-- DELETE: Hard delete restricted to admins only (soft delete uses UPDATE)
CREATE POLICY "Admins can hard delete communications"
  ON communications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND org_id = communications.org_id
      AND role = 'admin'
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
