-- Simple fix: Create secure RLS policies that only allow authenticated users
-- This removes the anonymous data vulnerability entirely

-- Drop any existing policies
DROP POLICY IF EXISTS "Secure document access" ON public.documents;
DROP POLICY IF EXISTS "Secure trip access" ON public.trips;
DROP POLICY IF EXISTS "Secure travel segment access" ON public.travel_segments;
DROP POLICY IF EXISTS "Secure processing job access" ON public.document_processing_jobs;

-- Make user_id columns non-nullable to prevent anonymous data creation
ALTER TABLE public.documents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.trips ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.travel_segments ALTER COLUMN user_id SET NOT NULL;

-- DOCUMENTS TABLE - Only authenticated users can access their own documents
CREATE POLICY "Authenticated users can access their own documents"
ON public.documents
FOR ALL
TO authenticated
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- TRIPS TABLE - Only authenticated users can access their own trips
CREATE POLICY "Authenticated users can access their own trips"
ON public.trips
FOR ALL
TO authenticated
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- TRAVEL SEGMENTS TABLE - Only authenticated users can access their own segments
CREATE POLICY "Authenticated users can access their own travel segments"
ON public.travel_segments
FOR ALL
TO authenticated
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- DOCUMENT PROCESSING JOBS TABLE - Access through document ownership
CREATE POLICY "Authenticated users can access processing jobs for their documents"
ON public.document_processing_jobs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id::text = auth.uid()::text
  )
);

COMMENT ON TABLE public.documents IS 'Secure table - only authenticated users can access their own documents';
COMMENT ON TABLE public.trips IS 'Secure table - only authenticated users can access their own trips';
COMMENT ON TABLE public.travel_segments IS 'Secure table - only authenticated users can access their own travel segments';
COMMENT ON TABLE public.document_processing_jobs IS 'Secure table - users can only access processing jobs for their own documents';