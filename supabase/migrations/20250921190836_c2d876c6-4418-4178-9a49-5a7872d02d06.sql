-- Fix the security vulnerability with proper type casting
-- Remove the vulnerable NULL user_id conditions and implement secure anonymous sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can only access their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can only access their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can only access their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can only access processing jobs for their own documents" ON public.document_processing_jobs;

-- DOCUMENTS TABLE - Secure policies with proper type casting
CREATE POLICY "Secure document access"
ON public.documents
FOR ALL
USING (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)))
WITH CHECK (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)));

-- TRIPS TABLE - Secure policies with proper type casting  
CREATE POLICY "Secure trip access"
ON public.trips
FOR ALL
USING (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)))
WITH CHECK (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)));

-- TRAVEL SEGMENTS TABLE - Secure policies with proper type casting
CREATE POLICY "Secure travel segment access"  
ON public.travel_segments
FOR ALL
USING (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)))
WITH CHECK (user_id = auth.uid()::text OR (auth.uid() IS NULL AND user_id = current_setting('app.session_id', true)));

-- DOCUMENT PROCESSING JOBS TABLE - Secure access through document ownership
CREATE POLICY "Secure processing job access"
ON public.document_processing_jobs  
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid()::text OR (auth.uid() IS NULL AND documents.user_id = current_setting('app.session_id', true)))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (documents.user_id = auth.uid()::text OR (auth.uid() IS NULL AND documents.user_id = current_setting('app.session_id', true)))
  )
);

-- Add helpful comments
COMMENT ON TABLE public.documents IS 'Secure table with user-specific RLS policies - authenticated users see their own data, anonymous users need session_id';
COMMENT ON TABLE public.trips IS 'Secure table with user-specific RLS policies - authenticated users see their own data, anonymous users need session_id';
COMMENT ON TABLE public.travel_segments IS 'Secure table with user-specific RLS policies - authenticated users see their own data, anonymous users need session_id';
COMMENT ON TABLE public.document_processing_jobs IS 'Secure table with RLS policies based on document ownership - users can only access processing jobs for their own documents';