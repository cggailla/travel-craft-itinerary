-- Add enriched column to travel_segments for storing enriched data
ALTER TABLE travel_segments 
ADD COLUMN enriched JSONB DEFAULT NULL;

-- Create travel_recommendations table
CREATE TABLE travel_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'restaurant', 'activity', 'site', etc.
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  rating REAL,
  price_level INTEGER, -- 1-4 scale
  opening_hours TEXT,
  website TEXT,
  phone TEXT,
  coordinates JSONB, -- {lat, lng}
  source_data JSONB, -- raw Perplexity response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on travel_recommendations
ALTER TABLE travel_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for travel_recommendations
CREATE POLICY "Users can access their own travel recommendations or anonymous recommendations"
ON travel_recommendations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = travel_recommendations.trip_id
    AND (trips.user_id = auth.uid() OR (auth.uid() IS NULL AND trips.user_id IS NOT NULL))
  )
);

-- Create indexes for better performance
CREATE INDEX idx_travel_recommendations_step_id ON travel_recommendations(step_id);
CREATE INDEX idx_travel_recommendations_trip_id ON travel_recommendations(trip_id);
CREATE INDEX idx_travel_recommendations_type ON travel_recommendations(recommendation_type);

-- Create trigger for updated_at
CREATE TRIGGER update_travel_recommendations_updated_at
  BEFORE UPDATE ON travel_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();