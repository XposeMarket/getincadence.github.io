-- Add photographer booking fields to deals table
-- These fields are only used when org.industry_type = 'photographer'

-- Booking type: 'personal' or 'event'
ALTER TABLE deals ADD COLUMN IF NOT EXISTS booking_type TEXT;

-- Number of people (for event shoots)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS num_people INTEGER;

-- Event date/time
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_start_time TIME;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_end_time TIME;

-- Location
ALTER TABLE deals ADD COLUMN IF NOT EXISTS location_type TEXT; -- 'provided', 'flexible'
ALTER TABLE deals ADD COLUMN IF NOT EXISTS location TEXT;

-- Special requests / notes from client
ALTER TABLE deals ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Add constraint for booking_type
ALTER TABLE deals ADD CONSTRAINT booking_type_check 
  CHECK (booking_type IS NULL OR booking_type IN ('personal', 'event', 'commercial', 'wedding', 'portrait', 'other'));

-- Add constraint for location_type
ALTER TABLE deals ADD CONSTRAINT location_type_check 
  CHECK (location_type IS NULL OR location_type IN ('provided', 'flexible', 'client', 'studio', 'outdoor', 'venue', 'other'));

-- Add index for event_date (useful for calendar views)
CREATE INDEX IF NOT EXISTS idx_deals_event_date ON deals(event_date);
