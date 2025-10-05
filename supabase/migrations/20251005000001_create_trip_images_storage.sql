-- Create storage bucket for trip images
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-images', 'trip-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for trip-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload trip images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip-images');

-- Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update trip images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'trip-images')
WITH CHECK (bucket_id = 'trip-images');

-- Allow authenticated users to delete their images
CREATE POLICY "Authenticated users can delete trip images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trip-images');

-- Allow public read access (for viewing images in booklets)
CREATE POLICY "Public read access to trip images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trip-images');
