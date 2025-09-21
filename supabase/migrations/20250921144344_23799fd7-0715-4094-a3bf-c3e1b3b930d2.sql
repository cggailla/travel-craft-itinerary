-- Add sequence_order column to preserve GPT ordering
ALTER TABLE travel_segments 
ADD COLUMN sequence_order INTEGER DEFAULT 0;

-- Add index for better performance on ordering
CREATE INDEX idx_travel_segments_sequence_order ON travel_segments(trip_id, start_date, sequence_order);