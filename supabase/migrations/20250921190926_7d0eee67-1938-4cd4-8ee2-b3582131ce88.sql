-- Secure fix: Handle existing data and create session-based anonymous access
-- This maintains functionality while fixing the security vulnerability

-- First, update existing NULL user_id records with temporary session IDs
UPDATE public.documents 
SET user_id = 'anonymous_' || id::text 
WHERE user_id IS NULL;

UPDATE public.trips 
SET user_id = 'anonymous_' || id::text 
WHERE user_id IS NULL;

UPDATE public.travel_segments 
SET user_id = 'anonymous_' || id::text 
WHERE user_id IS NULL;

-- Now create secure RLS policies that require user_id matching
-- DOCUMENTS TABLE
CREATE POLICY "Secure document access by user"
ON public.documents
FOR ALL
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
);

-- TRIPS TABLE
CREATE POLICY "Secure trip access by user"
ON public.trips
FOR ALL
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
);

-- TRAVEL SEGMENTS TABLE
CREATE POLICY "Secure travel segment access by user"
ON public.travel_segments
FOR ALL
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND user_id = current_setting('request.headers', true)::json->>'x-session-id')
);

-- DOCUMENT PROCESSING JOBS TABLE
CREATE POLICY "Secure processing job access by document owner"
ON public.document_processing_jobs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (
      (auth.uid() IS NOT NULL AND documents.user_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND documents.user_id = current_setting('request.headers', true)::json->>'x-session-id')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_processing_jobs.document_id 
    AND (
      (auth.uid() IS NOT NULL AND documents.user_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND documents.user_id = current_setting('request.headers', true)::json->>'x-session-id')
    )
  )
);

COMMENT ON TABLE public.documents IS 'Secure table with session-based access control for anonymous users';
COMMENT ON TABLE public.trips IS 'Secure table with session-based access control for anonymous users';
COMMENT ON TABLE public.travel_segments IS 'Secure table with session-based access control for anonymous users';
COMMENT ON TABLE public.document_processing_jobs IS 'Secure table with access control based on document ownership';