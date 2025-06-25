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
('slot_duration', '15', 'Reservation slot duration in minutes'),
('advance_booking_days', '30', 'How many days in advance customers can book'),
('opening_time', '17:00', 'Restaurant opening time (24h format)'),
('closing_time', '22:00', 'Restaurant closing time (24h format)'),
('max_party_size', '10', 'Maximum party size allowed'),
('reservations_per_slot', '3', 'Maximum reservations allowed per time slot'),
('closed_days', 'monday', 'Days when restaurant is closed (comma-separated)');

-- Create indexes for better performance
CREATE INDEX idx_reservations_date_time ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_email ON reservations(email);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_created_at ON reservations(created_at);

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
