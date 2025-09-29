-- Add destination_zone column to trips table
ALTER TABLE trips 
ADD COLUMN destination_zone TEXT;