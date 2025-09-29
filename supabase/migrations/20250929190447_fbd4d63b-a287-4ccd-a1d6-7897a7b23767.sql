-- Add emergency contact information to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS local_correspondent_phone TEXT;