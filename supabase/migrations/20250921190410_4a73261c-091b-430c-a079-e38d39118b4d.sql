-- Fix critical security vulnerability: Replace overly permissive RLS policies with user-specific access control

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all operations on trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations on travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Allow all operations on processing jobs" ON public.document_processing_jobs;

-- DOCUMENTS TABLE: Secure access to user's own documents
CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own documents"
ON public.documents
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- TRIPS TABLE: Secure access to user's own trips
CREATE POLICY "Users can view their own trips"
ON public.trips
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own trips"
ON public.trips
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own trips"
ON public.trips
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own trips"
ON public.trips
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- TRAVEL SEGMENTS TABLE: Secure access to user's own travel segments
CREATE POLICY "Users can view their own travel segments"
ON public.travel_segments
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own travel segments"
ON public.travel_segments
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own travel segments"
ON public.travel_segments
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own travel segments"
ON public.travel_segments
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- DOCUMENT PROCESSING JOBS TABLE: Secure access through document ownership
-- Since this table doesn't have user_id, we join through documents table
CREATE POLICY "Users can view processing jobs for their documents"
ON public.document_processing_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid() OR documents.user_id IS NULL)
  )
);

CREATE POLICY "Users can insert processing jobs for their documents"
ON public.document_processing_jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid() OR documents.user_id IS NULL)
  )
);

CREATE POLICY "Users can update processing jobs for their documents"
ON public.document_processing_jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid() OR documents.user_id IS NULL)
  )
);

CREATE POLICY "Users can delete processing jobs for their documents"
ON public.document_processing_jobs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid() OR documents.user_id IS NULL)
  )
);

-- Add comment for future reference
COMMENT ON TABLE public.documents IS 'Secure table with user-specific RLS policies - users can only access their own documents';
COMMENT ON TABLE public.trips IS 'Secure table with user-specific RLS policies - users can only access their own trips';
COMMENT ON TABLE public.travel_segments IS 'Secure table with user-specific RLS policies - users can only access their own travel segments';
COMMENT ON TABLE public.document_processing_jobs IS 'Secure table with RLS policies based on document ownership - users can only access processing jobs for their own documents';