-- Phase 1: Add trip_id to travel_segments and populate existing data
ALTER TABLE travel_segments ADD COLUMN trip_id uuid;

-- Populate existing segments with trip_id from their documents  
UPDATE travel_segments 
SET trip_id = d.trip_id 
FROM documents d 
WHERE travel_segments.document_id = d.id 
AND d.trip_id IS NOT NULL;

-- Create index for performance
CREATE INDEX idx_travel_segments_trip_id ON travel_segments(trip_id);

-- Phase 2: Add foreign key constraint (after data is populated)
ALTER TABLE travel_segments 
ADD CONSTRAINT fk_travel_segments_trip_id 
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Phase 3: Data retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_abandoned_data()
RETURNS void AS $$
BEGIN
  -- Delete trips older than 24h in draft status with no segments
  DELETE FROM trips 
  WHERE status = 'draft' 
    AND created_at < (now() - interval '24 hours')
    AND id NOT IN (
      SELECT DISTINCT trip_id 
      FROM travel_segments 
      WHERE trip_id IS NOT NULL
    );
    
  -- Delete documents without trip_id (orphaned)
  DELETE FROM documents 
  WHERE trip_id IS NULL 
    AND created_at < (now() - interval '2 hours');
    
  -- Delete failed processing jobs older than 7 days
  DELETE FROM document_processing_jobs 
  WHERE status = 'failed' 
    AND created_at < (now() - interval '7 days');
    
  RAISE NOTICE 'Cleanup completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Phase 4: Trigger function for trip validation cleanup
CREATE OR REPLACE FUNCTION on_trip_validated()
RETURNS trigger AS $$
BEGIN
  -- When a trip is validated, cleanup other draft trips for same user (if user_id exists)
  IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
    -- Delete other draft trips for this user (excluding the validated one)
    DELETE FROM trips 
    WHERE id != NEW.id 
      AND status = 'draft'
      AND (NEW.user_id IS NULL OR user_id = NEW.user_id)
      AND created_at < NEW.updated_at;
      
    RAISE NOTICE 'Cleaned up draft trips after validation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trip validation
CREATE TRIGGER trigger_trip_validated
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION on_trip_validated();