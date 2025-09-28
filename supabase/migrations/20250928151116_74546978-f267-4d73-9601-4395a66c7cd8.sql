-- Add enriched fields directly to travel_segments table for better data structure
ALTER TABLE public.travel_segments 
ADD COLUMN phone TEXT,
ADD COLUMN website TEXT,
ADD COLUMN star_rating INTEGER,
ADD COLUMN checkin_time TEXT,
ADD COLUMN checkout_time TEXT,
ADD COLUMN opening_hours TEXT,
ADD COLUMN ticket_price TEXT,
ADD COLUMN main_exhibitions TEXT[],
ADD COLUMN activity_price TEXT,
ADD COLUMN duration TEXT,
ADD COLUMN booking_required BOOLEAN,
ADD COLUMN terminals TEXT[],
ADD COLUMN facilities TEXT[],
ADD COLUMN iata_code TEXT,
ADD COLUMN icao_code TEXT,
ADD COLUMN departure_times TEXT[],
ADD COLUMN route TEXT;