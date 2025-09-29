-- Add cover_images column to trip_general_info table
ALTER TABLE trip_general_info 
ADD COLUMN cover_images text[];