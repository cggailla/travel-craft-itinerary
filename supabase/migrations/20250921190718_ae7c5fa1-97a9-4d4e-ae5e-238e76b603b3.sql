-- Remove the vulnerable NULL user_id conditions from RLS policies
-- This ensures only the actual owner can access their data

-- Drop existing policies with NULL conditions
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips; 
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

DROP POLICY IF EXISTS "Users can view their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can insert their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can update their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can delete their own travel segments" ON public.travel_segments;

DROP POLICY IF EXISTS "Users can view processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can insert processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can update processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can delete processing jobs for their documents" ON public.document_processing_jobs;

-- Create secure policies that require user_id matching (no NULL allowed)
-- DOCUMENTS TABLE
CREATE POLICY "Users can only access their own documents"
ON public.documents
FOR ALL
USING (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'))
WITH CHECK (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'));

-- TRIPS TABLE  
CREATE POLICY "Users can only access their own trips"
ON public.trips
FOR ALL
USING (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'))
WITH CHECK (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'));

-- TRAVEL SEGMENTS TABLE
CREATE POLICY "Users can only access their own travel segments"  
ON public.travel_segments
FOR ALL
USING (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'))
WITH CHECK (user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id'));

-- DOCUMENT PROCESSING JOBS TABLE
CREATE POLICY "Users can only access processing jobs for their own documents"
ON public.document_processing_jobs  
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'session_id')
  )
);