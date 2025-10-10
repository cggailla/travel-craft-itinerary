-- ============================================
-- SECURITY FIX: Phase 1 - Fix RLS Policies
-- ============================================

-- Drop vulnerable RLS policies for trips table
DROP POLICY IF EXISTS "Users can access their own trips or anonymous trips" ON trips;

-- Create secure RLS policy for trips (authenticated users only)
CREATE POLICY "Users can access their own trips"
ON trips
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop vulnerable RLS policies for documents table
DROP POLICY IF EXISTS "Users can access their own documents or anonymous documents" ON documents;

-- Create secure RLS policy for documents (authenticated users only)
CREATE POLICY "Users can access their own documents"
ON documents
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop vulnerable RLS policies for travel_segments table
DROP POLICY IF EXISTS "Users can access their own travel segments or anonymous segments" ON travel_segments;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON travel_segments;

-- Create secure RLS policy for travel_segments (authenticated users only)
CREATE POLICY "Users can access their own travel segments"
ON travel_segments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop vulnerable RLS policies for document_processing_jobs table
DROP POLICY IF EXISTS "Users can access processing jobs for their documents or anonymo" ON document_processing_jobs;

-- Create secure RLS policy for document_processing_jobs (authenticated users only)
CREATE POLICY "Users can access their own processing jobs"
ON document_processing_jobs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_processing_jobs.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Drop vulnerable RLS policies for travel_recommendations table
DROP POLICY IF EXISTS "Users can access their own travel recommendations or anonymous" ON travel_recommendations;

-- Create secure RLS policy for travel_recommendations (authenticated users only)
CREATE POLICY "Users can access their own travel recommendations"
ON travel_recommendations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = travel_recommendations.trip_id
    AND trips.user_id = auth.uid()
  )
);

-- Drop vulnerable RLS policies for travel_step_segments table
DROP POLICY IF EXISTS "Users can access their own travel step segments or anonymous se" ON travel_step_segments;

-- Create secure RLS policy for travel_step_segments (authenticated users only)
CREATE POLICY "Users can access their own travel step segments"
ON travel_step_segments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM travel_steps
    JOIN trips ON trips.id = travel_steps.trip_id
    WHERE travel_steps.id = travel_step_segments.step_id
    AND trips.user_id = auth.uid()
  )
);

-- Drop vulnerable RLS policies for travel_steps table
DROP POLICY IF EXISTS "Users can access their own travel steps or anonymous steps" ON travel_steps;

-- Create secure RLS policy for travel_steps (authenticated users only)
CREATE POLICY "Users can access their own travel steps"
ON travel_steps
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = travel_steps.trip_id
    AND trips.user_id = auth.uid()
  )
);

-- Drop vulnerable RLS policies for trip_general_info table
DROP POLICY IF EXISTS "Users can access their own trip general info" ON trip_general_info;

-- Create secure RLS policy for trip_general_info (authenticated users only)
CREATE POLICY "Users can access their own trip general info"
ON trip_general_info
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_general_info.trip_id
    AND trips.user_id = auth.uid()
  )
);

-- ============================================
-- SECURITY FIX: Phase 3 - Fix Storage Policies
-- ============================================

-- Drop vulnerable public storage policies
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

-- Create secure policies for travel-documents bucket
CREATE POLICY "Users can upload their own travel documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own travel documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own travel documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'travel-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create secure policies for trip-images bucket
CREATE POLICY "Users can upload their own trip images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own trip images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own trip images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create secure policies for booklet-exports bucket (user-scoped)
CREATE POLICY "Users can upload their own booklet exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booklet-exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own booklet exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'booklet-exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own booklet exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'booklet-exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);