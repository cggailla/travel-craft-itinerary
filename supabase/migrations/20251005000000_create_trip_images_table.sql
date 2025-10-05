-- Create trip_images table for manual image uploads
-- This table stores references to images uploaded for trips (cover images) and steps

CREATE TABLE IF NOT EXISTS public.trip_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  step_id uuid NULL,
  image_type text NOT NULL CHECK (image_type IN ('cover', 'step')),
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  position integer NULL CHECK (position IN (1, 2)), -- Only for cover images
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX idx_trip_images_trip_id ON public.trip_images(trip_id);
CREATE INDEX idx_trip_images_step_id ON public.trip_images(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX idx_trip_images_type ON public.trip_images(image_type);
CREATE INDEX idx_trip_images_position ON public.trip_images(position) WHERE position IS NOT NULL;

-- Add RLS policies
ALTER TABLE public.trip_images ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view and manage images (simplified for now)
CREATE POLICY "Allow authenticated users full access to trip images"
  ON public.trip_images
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_trip_images_updated_at
  BEFORE UPDATE ON public.trip_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure cover images have position 1 or 2
ALTER TABLE public.trip_images
  ADD CONSTRAINT check_cover_position
  CHECK (
    (image_type = 'cover' AND position IN (1, 2)) OR
    (image_type = 'step' AND position IS NULL)
  );

-- Add constraint to ensure only 2 cover images per trip
CREATE UNIQUE INDEX unique_cover_position_per_trip
  ON public.trip_images(trip_id, position)
  WHERE image_type = 'cover' AND position IS NOT NULL;

-- Comment
COMMENT ON TABLE public.trip_images IS 'Stores manually uploaded images for trips (covers) and steps';
COMMENT ON COLUMN public.trip_images.trip_id IS 'Reference to the trip';
COMMENT ON COLUMN public.trip_images.step_id IS 'Reference to the step (NULL for cover images)';
COMMENT ON COLUMN public.trip_images.image_type IS 'Type of image: cover or step';
COMMENT ON COLUMN public.trip_images.storage_path IS 'Path in Supabase Storage';
COMMENT ON COLUMN public.trip_images.public_url IS 'Public URL of the image';
COMMENT ON COLUMN public.trip_images.position IS 'Position for cover images (1 or 2), NULL for step images';
