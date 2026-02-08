-- =====================================================
-- CADENCE CRM - SUBSCRIPTIONS SCHEMA
-- =====================================================

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'solo', -- 'solo', 'starter', 'team', 'growth'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  extra_seats INTEGER DEFAULT 0, -- Additional seats beyond plan limit (for growth plan)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy (users can see their org's subscription)
CREATE POLICY "Users can view their org subscription" ON subscriptions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Only allow updates via service role (webhooks)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Get subscription plan limits
-- =====================================================
CREATE OR REPLACE FUNCTION get_plan_user_limit(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE plan_name
    WHEN 'solo' THEN RETURN 1;
    WHEN 'starter' THEN RETURN 3;
    WHEN 'team' THEN RETURN 8;
    WHEN 'growth' THEN RETURN 12;
    ELSE RETURN 1;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check if org can add more users
-- =====================================================
CREATE OR REPLACE FUNCTION can_add_user(org_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  plan_limit INTEGER;
  extra INTEGER;
  plan_name TEXT;
BEGIN
  -- Get current user count
  SELECT COUNT(*) INTO current_count FROM users WHERE org_id = org_uuid;
  
  -- Get subscription info
  SELECT plan, COALESCE(extra_seats, 0) INTO plan_name, extra 
  FROM subscriptions 
  WHERE org_id = org_uuid;
  
  -- Default to solo plan if no subscription
  IF plan_name IS NULL THEN
    plan_name := 'solo';
    extra := 0;
  END IF;
  
  -- Get plan limit
  plan_limit := get_plan_user_limit(plan_name);
  
  -- Check if under limit (plan limit + extra seats)
  RETURN current_count < (plan_limit + extra);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Create default subscription for existing orgs
-- =====================================================
INSERT INTO subscriptions (org_id, plan, status)
SELECT id, 'solo', 'active' FROM orgs
WHERE id NOT IN (SELECT org_id FROM subscriptions)
ON CONFLICT (org_id) DO NOTHING;
