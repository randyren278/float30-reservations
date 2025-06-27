-- Table configurations schema addition to Float 30 Restaurant Database
-- RUN THIS IN YOUR SUPABASE SQL EDITOR - FIXED VERSION

-- Table configurations for managing table availability by party size
CREATE TABLE IF NOT EXISTS table_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_size INTEGER NOT NULL UNIQUE,
    table_count INTEGER NOT NULL DEFAULT 0 CHECK (table_count >= 0),
    max_reservations_per_slot INTEGER NOT NULL DEFAULT 1 CHECK (max_reservations_per_slot >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure max reservations doesn't exceed table count
    CONSTRAINT max_reservations_check CHECK (max_reservations_per_slot <= table_count)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_configurations_party_size ON table_configurations(party_size);
CREATE INDEX IF NOT EXISTS idx_table_configurations_active ON table_configurations(is_active);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_table_configurations_updated_at 
    BEFORE UPDATE ON table_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE table_configurations ENABLE ROW LEVEL SECURITY;

-- Policy for public access to read active table configurations
CREATE POLICY "Allow public to read active table configurations" 
    ON table_configurations FOR SELECT 
    USING (is_active = true);

-- Policy for admin access to all operations
CREATE POLICY "Allow admin full access to table configurations" 
    ON table_configurations FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Insert default table configurations
INSERT INTO table_configurations (party_size, table_count, max_reservations_per_slot, is_active) VALUES
(1, 2, 2, true),   -- 2 tables for 1 person, max 2 reservations per slot
(2, 6, 3, true),   -- 6 tables for 2 people, max 3 reservations per slot
(4, 4, 2, true),   -- 4 tables for 4 people, max 2 reservations per slot
(6, 2, 1, true),   -- 2 tables for 6 people, max 1 reservation per slot
(8, 1, 1, true),   -- 1 table for 8 people, max 1 reservation per slot
(10, 1, 1, true)   -- 1 table for 10 people, max 1 reservation per slot
ON CONFLICT (party_size) DO NOTHING; -- Don't overwrite if already exists

-- Function to get available tables for a specific party size and time slot
CREATE OR REPLACE FUNCTION get_available_tables(
    target_party_size INTEGER,
    target_date DATE,
    target_time TIME
) RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    current_reservations INTEGER;
    available_slots INTEGER;
BEGIN
    -- Get the table configuration for this party size
    SELECT * INTO config_record 
    FROM table_configurations 
    WHERE party_size = target_party_size AND is_active = true;
    
    -- If no configuration found, return 0
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Count current confirmed reservations for this slot and party size
    SELECT COUNT(*) INTO current_reservations
    FROM reservations
    WHERE reservation_date = target_date
      AND reservation_time = target_time
      AND party_size = target_party_size
      AND status = 'confirmed';
    
    -- Calculate available slots
    available_slots := config_record.max_reservations_per_slot - COALESCE(current_reservations, 0);
    
    -- Return the number of available slots (cannot be negative)
    RETURN GREATEST(0, available_slots);
END;
$$ LANGUAGE plpgsql;

-- Function to check if a reservation can be accommodated
CREATE OR REPLACE FUNCTION can_accommodate_reservation(
    target_party_size INTEGER,
    target_date DATE,
    target_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    available_slots INTEGER;
BEGIN
    -- Get available slots for exact party size
    SELECT get_available_tables(target_party_size, target_date, target_time) INTO available_slots;
    
    -- If exact match available, return true
    IF available_slots > 0 THEN
        RETURN true;
    END IF;
    
    -- Try to find a larger table that can accommodate this party size
    -- Check tables that can seat this party size or more
    SELECT COUNT(*) INTO available_slots
    FROM table_configurations tc
    WHERE tc.party_size >= target_party_size 
      AND tc.is_active = true
      AND get_available_tables(tc.party_size, target_date, target_time) > 0
    LIMIT 1;
    
    RETURN available_slots > 0;
END;
$$ LANGUAGE plpgsql;

-- Simplified view for available time slots with table-based availability
CREATE OR REPLACE VIEW available_slots_with_tables AS
SELECT
  d.date,
  t.time_slot,
  tc.party_size,
  tc.table_count,
  tc.max_reservations_per_slot,
  COALESCE(r.reservation_count, 0) AS current_reservations,
  GREATEST(0, tc.max_reservations_per_slot - COALESCE(r.reservation_count, 0)) AS available_reservations,
  (COALESCE(r.reservation_count, 0) < tc.max_reservations_per_slot) AS available,
  tc.is_active
FROM (
  -- Generate date series for next 30 days
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    INTERVAL '1 day'
  )::DATE AS date
) d
CROSS JOIN (
  -- Generate time slots (10 AM to 9 PM in 30-minute intervals)
  SELECT (TIME '10:00' + (INTERVAL '30 minutes' * generate_series(0, 21)))::TIME AS time_slot
) t
CROSS JOIN table_configurations tc
LEFT JOIN (
  SELECT
    reservation_date,
    reservation_time,
    party_size,
    COUNT(*) AS reservation_count
  FROM reservations
  WHERE status = 'confirmed'
  GROUP BY reservation_date, reservation_time, party_size
) r ON r.reservation_date = d.date
   AND r.reservation_time = t.time_slot
   AND r.party_size = tc.party_size
WHERE tc.is_active = true
  -- Filter by restaurant hours based on day of week
  AND (
    (EXTRACT(DOW FROM d.date) IN (1, 2) AND t.time_slot BETWEEN '10:00' AND '16:00') OR  -- Mon-Tue: 10am-4pm
    (EXTRACT(DOW FROM d.date) IN (3, 4, 0) AND t.time_slot BETWEEN '10:00' AND '20:00') OR -- Wed-Thu,Sun: 10am-8pm
    (EXTRACT(DOW FROM d.date) IN (5, 6) AND t.time_slot BETWEEN '10:00' AND '21:00')    -- Fri-Sat: 10am-9pm
  )
  -- Exclude closure dates/times
  AND NOT EXISTS (
    SELECT 1 FROM restaurant_closures rc
    WHERE rc.closure_date = d.date
      AND (
        rc.all_day = true
        OR (rc.start_time <= t.time_slot AND rc.end_time >= t.time_slot)
      )
  )
ORDER BY d.date, t.time_slot, tc.party_size;

-- Function to get availability summary for a specific date
CREATE OR REPLACE FUNCTION get_date_availability_summary(target_date DATE)
RETURNS TABLE(
  time_slot TIME,
  total_available_slots INTEGER,
  party_sizes_available INTEGER[],
  is_peak_time BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    avs.time_slot,
    SUM(avs.available_reservations)::INTEGER AS total_available_slots,
    ARRAY_AGG(avs.party_size ORDER BY avs.party_size) FILTER (WHERE avs.available_reservations > 0) AS party_sizes_available,
    -- Mark 6-8 PM as peak time
    (avs.time_slot BETWEEN '18:00'::time AND '20:00'::time) AS is_peak_time
  FROM available_slots_with_tables avs
  WHERE avs.date = target_date
    AND avs.available = true
  GROUP BY avs.time_slot
  ORDER BY avs.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Comments explaining the table configuration system
COMMENT ON TABLE table_configurations IS 'Manages table availability and reservation limits by party size';
COMMENT ON COLUMN table_configurations.party_size IS 'Number of people this table configuration supports';
COMMENT ON COLUMN table_configurations.table_count IS 'Total number of physical tables available for this party size';
COMMENT ON COLUMN table_configurations.max_reservations_per_slot IS 'Maximum number of reservations allowed per time slot for this table size';
COMMENT ON COLUMN table_configurations.is_active IS 'Whether this table configuration is currently accepting reservations';

COMMENT ON FUNCTION get_available_tables(INTEGER, DATE, TIME) IS 'Returns number of available reservation slots for a specific party size, date, and time';
COMMENT ON FUNCTION can_accommodate_reservation(INTEGER, DATE, TIME) IS 'Checks if a reservation can be accommodated either at exact table size or larger table';
COMMENT ON VIEW available_slots_with_tables IS 'Enhanced view showing availability by party size with table-based calculations';