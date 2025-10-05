-- Add is_excluded column to travel_segments to persist user choices
ALTER TABLE public.travel_segments
ADD COLUMN is_excluded BOOLEAN DEFAULT FALSE NOT NULL;

-- Add an index to optimize queries that filter out excluded segments
CREATE INDEX IF NOT EXISTS idx_travel_segments_trip_id_not_excluded
ON public.travel_segments (trip_id)
WHERE is_excluded = FALSE;
