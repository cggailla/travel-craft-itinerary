-- Create public bucket for booklet exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booklet-exports',
  'booklet-exports',
  true,
  10485760, -- 10MB limit
  ARRAY['text/html']
);

-- Allow anyone to read exported booklets
CREATE POLICY "Public booklet exports are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'booklet-exports');

-- Allow authenticated users to upload their booklets
CREATE POLICY "Users can upload booklet exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'booklet-exports');