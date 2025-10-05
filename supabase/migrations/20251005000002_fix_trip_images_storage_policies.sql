-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload trip images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update trip images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete trip images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to trip images" ON storage.objects;

-- Create or ensure bucket exists with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-images', 
  'trip-images', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Allow anyone to upload (for development - adjust for production)
CREATE POLICY "Anyone can upload trip images"
ON storage.objects 
FOR INSERT
WITH CHECK (bucket_id = 'trip-images');

-- Allow anyone to update
CREATE POLICY "Anyone can update trip images"
ON storage.objects 
FOR UPDATE
USING (bucket_id = 'trip-images')
WITH CHECK (bucket_id = 'trip-images');

-- Allow anyone to delete
CREATE POLICY "Anyone can delete trip images"
ON storage.objects 
FOR DELETE
USING (bucket_id = 'trip-images');

-- Public read access
CREATE POLICY "Public can view trip images"
ON storage.objects 
FOR SELECT
USING (bucket_id = 'trip-images');
