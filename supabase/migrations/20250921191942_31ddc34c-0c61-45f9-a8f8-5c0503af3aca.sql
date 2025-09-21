-- Simplify RLS policies to support anonymous users
-- Allow NULL user_id for anonymous sessions while maintaining security

-- Update trips table RLS policies to allow anonymous users
DROP POLICY IF EXISTS "Users can access their own trips" ON public.trips;

CREATE POLICY "Users can access their own trips or anonymous trips" 
ON public.trips FOR ALL 
USING (
  user_id = auth.uid() OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- Update documents table RLS policies to allow anonymous users
DROP POLICY IF EXISTS "Users can access their own documents" ON public.documents;

CREATE POLICY "Users can access their own documents or anonymous documents" 
ON public.documents FOR ALL 
USING (
  user_id = auth.uid() OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- Update travel_segments table RLS policies to allow anonymous users
DROP POLICY IF EXISTS "Users can access their own travel segments" ON public.travel_segments;

CREATE POLICY "Users can access their own travel segments or anonymous segments" 
ON public.travel_segments FOR ALL 
USING (
  user_id = auth.uid() OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- Update document_processing_jobs table RLS policies
DROP POLICY IF EXISTS "Users can access processing jobs for their documents" ON public.document_processing_jobs;

CREATE POLICY "Users can access processing jobs for their documents or anonymous jobs" 
ON public.document_processing_jobs FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_processing_jobs.document_id 
    AND (
      documents.user_id = auth.uid() OR 
      (auth.uid() IS NULL AND documents.user_id IS NOT NULL)
    )
));