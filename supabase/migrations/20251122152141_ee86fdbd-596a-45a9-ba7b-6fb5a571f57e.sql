-- Add new fields to trips table for pricing and participants information
ALTER TABLE trips 
ADD COLUMN price DECIMAL(10,2),
ADD COLUMN participants TEXT,
ADD COLUMN number_of_people INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN trips.price IS 'Total price of the trip';
COMMENT ON COLUMN trips.participants IS 'Names of trip participants (comma-separated or formatted list)';
COMMENT ON COLUMN trips.number_of_people IS 'Total number of people on the trip';