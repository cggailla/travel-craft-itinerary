-- Update travel segments check constraint to include new segment types
ALTER TABLE public.travel_segments 
DROP CONSTRAINT IF EXISTS travel_segments_segment_type_check;

ALTER TABLE public.travel_segments 
ADD CONSTRAINT travel_segments_segment_type_check 
CHECK (segment_type IN ('flight', 'hotel', 'activity', 'car', 'train', 'boat', 'pass', 'transfer', 'other'));