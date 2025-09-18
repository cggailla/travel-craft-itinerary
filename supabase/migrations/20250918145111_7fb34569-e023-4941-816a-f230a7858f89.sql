-- Fix security warnings by setting search_path for database functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;