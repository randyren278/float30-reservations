-- Float 30 Restaurant Reservation System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    special_requests TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate bookings for same email/phone on same day
    CONSTRAINT unique_email_date UNIQUE (email, reservation_date, reservation_time),
    
    -- Ensure reservation is in the future (at creation time)
    CONSTRAINT future_reservation CHECK (
        reservation_date >= CURRENT_DATE OR 
        (reservation_date = CURRENT_DATE AND reservation_time > CURRENT_TIME)
    )
);

-- Restaurant settings table for configuration
CREATE TABLE restaurant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default restaurant settings
INSERT INTO restaurant_settings (setting_key, setting_value, description) VALUES
('max_tables', '12', 'Maximum number of tables available'),
('slot_duration', '30', 'Reservation slot duration in minutes'),
('advance_booking_days', '30', 'How many days in advance customers can book'),
('opening_time_wed', '10:00', 'Wednesday opening time'),
('closing_time_wed', '20:00', 'Wednesday closing time'),
('opening_time_thu', '10:00', 'Thursday opening time'),
('closing_time_thu', '20:00', 'Thursday closing time'),
('opening_time_fri', '10:00', 'Friday opening time'),
('closing_time_fri', '21:00', 'Friday closing time'),
('opening_time_sat', '10:00', 'Saturday opening time'),
('closing_time_sat', '21:00', 'Saturday closing time'),
('opening_time_sun', '10:00', 'Sunday opening time'),
('closing_time_sun', '20:00', 'Sunday closing time'),
('opening_time_mon', '10:00', 'Monday opening time'),
('closing_time_mon', '16:00', 'Monday closing time'),
('opening_time_tue', '10:00', 'Tuesday opening time'),
('closing_time_tue', '16:00', 'Tuesday closing time'),
('max_party_size', '10', 'Maximum party size allowed'),
('reservations_per_slot', '3', 'Maximum reservations allowed per time slot'),
('closed_days', '', 'Days when restaurant is closed (empty = open all days)');

-- Restaurant closures table for holidays and special closures
CREATE TABLE restaurant_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closure_date DATE NOT NULL,
    closure_name VARCHAR(100) NOT NULL,
    closure_reason VARCHAR(255),
    all_day BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate closures for same date
    CONSTRAINT unique_closure_date UNIQUE (closure_date)
);

-- Insert some common holidays as examples
INSERT INTO restaurant_closures (closure_date, closure_name, closure_reason) VALUES
('2025-12-25', 'Christmas Day', 'Statutory Holiday'),
('2025-01-01', 'New Year''s Day', 'Statutory Holiday'),
('2025-07-01', 'Canada Day', 'Statutory Holiday'),
('2025-12-26', 'Boxing Day', 'Statutory Holiday');

-- Create indexes for better performance
CREATE INDEX idx_restaurant_closures_date ON restaurant_closures(closure_date);
CREATE INDEX idx_restaurant_closures_all_day ON restaurant_closures(all_day);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_restaurant_closures_updated_at 
    BEFORE UPDATE ON restaurant_closures 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE restaurant_closures ENABLE ROW LEVEL SECURITY;

-- Policy for public access to read closures
CREATE POLICY "Allow public to read restaurant closures" 
    ON restaurant_closures FOR SELECT 
    USING (true);

-- Policy for admin access to all operations
CREATE POLICY "Allow admin full access to restaurant closures" 
    ON restaurant_closures FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at 
    BEFORE UPDATE ON restaurant_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public access to create reservations
CREATE POLICY "Allow public to create reservations" 
    ON reservations FOR INSERT 
    WITH CHECK (true);

-- Policy for public to read their own reservations (by email)
CREATE POLICY "Allow users to read own reservations" 
    ON reservations FOR SELECT 
    USING (true); -- Admin will handle filtering in application logic

-- Policy for admin access to all operations
CREATE POLICY "Allow admin full access to reservations" 
    ON reservations FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Policy for reading restaurant settings
CREATE POLICY "Allow public to read restaurant settings" 
    ON restaurant_settings FOR SELECT 
    USING (true);

-- View for available time slots (useful for admin dashboard)
CREATE OR REPLACE VIEW available_slots AS
WITH
  cfg_advance AS (
    SELECT setting_value::integer AS days
      FROM restaurant_settings
     WHERE setting_key = 'advance_booking_days'
  )
SELECT
  d.date,
  t.slot::time AS time,
  COALESCE(r.reservation_count, 0)                AS current_reservations,
  (SELECT setting_value::integer
     FROM restaurant_settings
    WHERE setting_key = 'reservations_per_slot'
  )                                               AS max_reservations,
  (COALESCE(r.reservation_count, 0) < 
   (SELECT setting_value::integer
      FROM restaurant_settings
     WHERE setting_key = 'reservations_per_slot'
   )
  )                                               AS available
FROM
  -- 1) generate each date
  generate_series(
    CURRENT_DATE,
    CURRENT_DATE + (SELECT days FROM cfg_advance),
    '1 day'
  ) AS d(date)

  -- 2) for each day, generate a timestamp series from opening to closing
  CROSS JOIN LATERAL generate_series(
    d.date + (
      SELECT setting_value::time
        FROM restaurant_settings
       WHERE setting_key = 'opening_time'
    ),
    d.date + (
      SELECT setting_value::time
        FROM restaurant_settings
       WHERE setting_key = 'closing_time'
    ),
    '15 minutes'
  ) AS t(slot)

  -- 3) count existing confirmed reservations at that date/time
  LEFT JOIN (
    SELECT
      reservation_date,
      reservation_time,
      COUNT(*) AS reservation_count
    FROM reservations
    WHERE status = 'confirmed'
    GROUP BY reservation_date, reservation_time
  ) r
    ON r.reservation_date = d.date
   AND r.reservation_time = t.slot::time

WHERE
  -- 4) filter out your closed‐days
  EXTRACT(DOW FROM d.date) NOT IN (
    SELECT
      CASE lower(trim(w))
        WHEN 'sunday'    THEN 0
        WHEN 'monday'    THEN 1
        WHEN 'tuesday'   THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday'  THEN 4
        WHEN 'friday'    THEN 5
        WHEN 'saturday'  THEN 6
      END
    FROM restaurant_settings,
         unnest(string_to_array(setting_value, ',')) AS w
    WHERE setting_key = 'closed_days'
  )

ORDER BY
  d.date,
  time;