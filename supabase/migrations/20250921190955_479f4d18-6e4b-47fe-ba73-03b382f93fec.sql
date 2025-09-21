-- Proper UUID-based security fix
-- Handle existing NULL user_id values and create secure access control

-- Generate secure session UUIDs for existing NULL user_id records
UPDATE public.documents 
SET user_id = gen_random_uuid()
WHERE user_id IS NULL;

UPDATE public.trips 
SET user_id = gen_random_uuid()
WHERE user_id IS NULL;

UPDATE public.travel_segments 
SET user_id = gen_random_uuid()
WHERE user_id IS NULL;

-- Create secure RLS policies that work with UUID types
-- DOCUMENTS TABLE - Only allow access to own documents
CREATE POLICY "Users can only access their own documents"
ON public.documents
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- TRIPS TABLE - Only allow access to own trips
CREATE POLICY "Users can only access their own trips"
ON public.trips
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- TRAVEL SEGMENTS TABLE - Only allow access to own segments
CREATE POLICY "Users can only access their own travel segments"
ON public.travel_segments
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DOCUMENT PROCESSING JOBS TABLE - Access through document ownership
CREATE POLICY "Users can only access processing jobs for their documents"
ON public.document_processing_jobs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id = auth.uid()
  )
);

-- Add helpful comments
COMMENT ON TABLE public.documents IS 'Secure table - users can only access their own documents via user_id matching';
COMMENT ON TABLE public.trips IS 'Secure table - users can only access their own trips via user_id matching';
COMMENT ON TABLE public.travel_segments IS 'Secure table - users can only access their own travel segments via user_id matching';
COMMENT ON TABLE public.document_processing_jobs IS 'Secure table - users can only access processing jobs for their own documents';