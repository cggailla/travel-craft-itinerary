-- Create table for general trip information
CREATE TABLE trip_general_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_country TEXT NOT NULL,
  
  -- Stored as JSONB for flexible structured data
  capital TEXT,
  population TEXT,
  surface_area TEXT,
  timezone_info JSONB,
  entry_requirements JSONB,
  health_requirements JSONB,
  currency TEXT,
  exchange_rate TEXT,
  budget_info JSONB,
  tipping_culture JSONB,
  electricity_info JSONB,
  phone_info JSONB,
  languages JSONB,
  religion_info TEXT,
  clothing_advice JSONB,
  food_specialties JSONB,
  shopping_info TEXT,
  cultural_sites JSONB,
  natural_attractions TEXT,
  safety_info TEXT,
  climate_info JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id)
);

-- Enable RLS
ALTER TABLE trip_general_info ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access their own trip info or anonymous trip info
CREATE POLICY "Users can access their own trip general info"
  ON trip_general_info
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_general_info.trip_id 
      AND (trips.user_id = auth.uid() OR (auth.uid() IS NULL AND trips.user_id IS NOT NULL))
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_trip_general_info_updated_at
  BEFORE UPDATE ON trip_general_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();